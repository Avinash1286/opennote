import { google } from "@ai-sdk/google"
import { streamText } from "ai"

export const runtime = "edge"

export async function POST(req: Request) {
  const { messages, videoTitle, transcript } = await req.json()

  const systemPrompt = `You are an AI tutor helping a student learn from a YouTube video.

${videoTitle ? `Video Title: ${videoTitle}` : ""}

${transcript ? `Video Transcript:
${transcript.substring(0, 15000)}${transcript.length > 15000 ? "...[truncated]" : ""}` : ""}

Your role is to:
1. Answer questions about the video content clearly and concisely
2. Explain concepts in simpler terms when asked
3. Walk through formulas or processes step-by-step
4. Help the student understand difficult parts
5. Quiz the student when they want to test their knowledge

Be friendly, encouraging, and educational. Use examples when helpful.
Format your responses with markdown for better readability.
Use LaTeX for mathematical expressions (wrap in $ for inline, $$ for block).`

  const result = streamText({
    model: google("gemini-3-flash-preview"),
    system: systemPrompt,
    messages,
  })

  return result.toTextStreamResponse()
}
