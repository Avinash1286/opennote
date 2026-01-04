import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import type { ZodType } from "zod"
import { STRUCTURED_REPAIR_PROMPT } from "./prompts"

// =============================================================================
// JSON VALIDATION & AUTO-REPAIR PIPELINE
// =============================================================================

const DEFAULT_ATTEMPTS = 5
const PROMPT_TRUNCATION_LIMIT = 12000

/**
 * Fix common LaTeX escape issues in JSON strings
 */
function fixLatexEscapes(jsonString: string): string {
  const latexCommands = [
    "pi",
    "sigma",
    "omega",
    "alpha",
    "beta",
    "gamma",
    "delta",
    "epsilon",
    "theta",
    "lambda",
    "mu",
    "nu",
    "rho",
    "tau",
    "phi",
    "psi",
    "chi",
    "frac",
    "sqrt",
    "sum",
    "prod",
    "int",
    "oint",
    "partial",
    "nabla",
    "infty",
    "cdot",
    "times",
    "div",
    "pm",
    "mp",
    "leq",
    "geq",
    "neq",
    "approx",
    "sin",
    "cos",
    "tan",
    "cot",
    "sec",
    "csc",
    "log",
    "ln",
    "exp",
    "lim",
    "left",
    "right",
    "begin",
    "end",
    "text",
    "mathrm",
    "mathbf",
  ]

  let result = jsonString

  for (const cmd of latexCommands) {
    // Match single backslash NOT preceded by another backslash
    const singleBackslashPattern = new RegExp(
      `(?<!\\\\)\\\\${cmd}(?![a-zA-Z])`,
      "g"
    )
    result = result.replace(singleBackslashPattern, `\\\\${cmd}`)
  }

  return result
}

/**
 * Remove empty arrays from parsed JSON (AI often outputs [] instead of omitting)
 */
function removeEmptyArrays(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map(removeEmptyArrays)
  }
  if (obj !== null && typeof obj === "object") {
    const cleaned: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value) && value.length === 0) {
        continue // Skip empty arrays
      }
      cleaned[key] = removeEmptyArrays(value)
    }
    return cleaned
  }
  return obj
}

/**
 * Strip markdown code fences from AI responses
 */
function stripMarkdownFences(raw: string): string {
  const trimmed = raw.trim()

  const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/m)
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim()
  }

  const jsonMatch = trimmed.match(/([\[{][\s\S]*[\]}])/m)
  if (jsonMatch && jsonMatch[1]) {
    return jsonMatch[1].trim()
  }

  return trimmed
}

/**
 * Build error message from error object
 */
function buildErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/**
 * Repair JSON using AI
 */
async function repairStructuredJson(
  payload: {
    format: string
    schemaName: string
    schemaDescription: string
    previousOutput: string
    errorMessage: string
    originalInput?: string
    attempt: number
  }
): Promise<string> {
  const { text } = await generateText({
    model: google("gemini-2.0-flash"),
    system: STRUCTURED_REPAIR_PROMPT,
    prompt: JSON.stringify(payload),
  })

  return stripMarkdownFences(text)
}

/**
 * Validate and auto-repair JSON with retry loop
 */
export const validateAndCorrectJson = async <T>(
  jsonString: string,
  options: {
    schema?: ZodType<T>
    schemaName?: string
    schemaDescription?: string
    originalInput?: string
    format?: string
    maxAttempts?: number
  }
): Promise<string> => {
  const {
    schema,
    schemaName = "JSON payload",
    schemaDescription = "Generic JSON structure",
    originalInput,
    format = "generic-json",
    maxAttempts = DEFAULT_ATTEMPTS,
  } = options

  let currentJson = stripMarkdownFences(jsonString)
  let lastError: unknown

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      let cleanJson = stripMarkdownFences(currentJson)
      cleanJson = fixLatexEscapes(cleanJson)
      let parsed = JSON.parse(cleanJson)
      parsed = removeEmptyArrays(parsed)

      if (schema) {
        const validated = schema.parse(parsed)
        return JSON.stringify(validated, null, 2)
      }
      return JSON.stringify(parsed, null, 2)
    } catch (error) {
      lastError = error
      console.log(`[Validation] Attempt ${attempt + 1} failed:`, buildErrorMessage(error))

      // Build repair request and call AI to fix
      const repairPayload = {
        format,
        schemaName,
        schemaDescription,
        previousOutput: currentJson.slice(0, PROMPT_TRUNCATION_LIMIT),
        errorMessage: buildErrorMessage(error),
        originalInput: originalInput?.slice(0, PROMPT_TRUNCATION_LIMIT),
        attempt: attempt + 1,
      }

      currentJson = await repairStructuredJson(repairPayload)
    }
  }

  throw new Error(
    `Failed to validate JSON after ${maxAttempts} attempts: ${buildErrorMessage(lastError)}`
  )
}
