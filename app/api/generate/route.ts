import { google } from "@ai-sdk/google"
import { generateText } from "ai"
import { NextRequest, NextResponse } from "next/server"
import {
  NOTES_PROMPT,
  interactiveNotesSchema,
  interactiveNotesSchemaDescription,
  validateAndCorrectJson,
} from "@/lib/notes"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { transcript, videoTitle } = body

    if (!transcript) {
      return NextResponse.json(
        { error: "Transcript is required for generating notes" },
        { status: 400 }
      )
    }

    // Truncate transcript if too long
    const truncatedTranscript =
      transcript.length > 30000
        ? transcript.substring(0, 30000) + "\n...[transcript truncated]"
        : transcript

    const prompt = `Video Title: ${videoTitle ?? "Untitled Lesson"}\n\nTranscript:\n${truncatedTranscript}`

    // Generate notes using AI
    const { text } = await generateText({
      model: google("gemini-3-flash-preview"),
      system: NOTES_PROMPT,
      prompt,
    })

    // Validate and auto-repair the JSON
    const validatedJson = await validateAndCorrectJson(text, {
      schema: interactiveNotesSchema,
      schemaName: "InteractiveNotes",
      schemaDescription: interactiveNotesSchemaDescription,
      originalInput: truncatedTranscript,
      format: "interactive-notes",
    })

    const notes = JSON.parse(validatedJson)

    return NextResponse.json({ notes })
  } catch (error) {
    console.error("[Generate API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate notes" },
      { status: 500 }
    )
  }
}
