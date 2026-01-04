import { google } from "@ai-sdk/google"
import { generateObject } from "ai"
import { z } from "zod"
import { NextRequest, NextResponse } from "next/server"

export const runtime = "edge"

// Quiz question schema (for final comprehensive quiz)
const quizQuestionSchema = z.object({
  question: z.string().describe("Clear question text"),
  options: z.array(z.string()).length(4).describe("Exactly 4 answer options"),
  correct: z.number().min(0).max(3).describe("Index of the correct answer (0-3)"),
  explanation: z.string().describe("Brief explanation of why this is correct"),
})

// Full quiz schema
const quizSchema = z.object({
  topic: z.string().describe("Topic name"),
  questions: z.array(quizQuestionSchema).describe("Multiple choice questions"),
})

const QUIZ_PROMPT = `Generate a quiz about the provided content with an appropriate number of multiple-choice questions based on content depth.

Make sure:
- Each question has exactly 4 options
- The "correct" field is the index (0-3) of the correct answer
- Questions are engaging, educational, and relevant to the provided content
- Include brief but helpful explanations
- Cover the key concepts from all sections
- Progress from foundational to more challenging questions
- Make wrong options plausible but clearly distinguishable`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { notes, videoTitle } = body

    if (!notes) {
      return NextResponse.json(
        { error: "Notes are required for generating quiz" },
        { status: 400 }
      )
    }

    const prompt = `${QUIZ_PROMPT}

VIDEO TITLE: ${videoTitle || "Unknown"}

NOTES CONTENT:
${JSON.stringify(notes, null, 2)}`

    const result = await generateObject({
      model: google("gemini-3-flash-preview"),
      schema: quizSchema,
      prompt,
    })

    return NextResponse.json({ quiz: result.object })
  } catch (error) {
    console.error("[Quiz API] Error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate quiz" },
      { status: 500 }
    )
  }
}
