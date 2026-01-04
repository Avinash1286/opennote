"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const FLASHCARD_SYSTEM_PROMPT = `You are an expert educator creating flashcards for effective learning. Generate comprehensive flashcards from the given video transcript.

RULES:
1. Create 10-20 flashcards covering the key concepts
2. Front of card should be a clear question or prompt
3. Back of card should be a concise but complete answer
4. Include optional hints for difficult concepts
5. Cover definitions, concepts, processes, and key facts
6. Make cards progressively more challenging
7. Avoid yes/no questions - require explanation

OUTPUT FORMAT:
Return ONLY valid JSON with this exact structure:
{
  "topic": "Main topic of the flashcards",
  "cards": [
    {
      "front": "Question or prompt",
      "back": "Answer or explanation",
      "hint": "Optional hint (can be null)"
    }
  ]
}`;

/**
 * Generate flashcards as a background job
 */
export const generateFlashcards = action({
  args: {
    videoId: v.string(),
    transcript: v.string(),
    videoTitle: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const { videoId, transcript, videoTitle } = args;

    // Update status to generating
    await ctx.runMutation(api.videos.updateFlashcardStatus, {
      videoId,
      status: "generating",
    });

    try {
      // Truncate transcript if too long
      const truncatedTranscript =
        transcript.length > 30000
          ? transcript.substring(0, 30000) + "\n...[transcript truncated]"
          : transcript;

      const prompt = `Video Title: ${videoTitle}\n\nTranscript:\n${truncatedTranscript}\n\nGenerate comprehensive flashcards for studying this content.`;

      // Call Gemini API directly
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) {
        throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not configured");
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: FLASHCARD_SYSTEM_PROMPT },
                  { text: prompt },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error("No response from Gemini API");
      }

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from response");
      }

      const flashcards = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!flashcards.topic || !Array.isArray(flashcards.cards)) {
        throw new Error("Invalid flashcard structure");
      }

      // Save flashcards to database
      await ctx.runMutation(api.videos.saveFlashcards, {
        videoId,
        flashcards,
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("[Flashcards] Generation failed:", errorMessage);

      // Update status to failed
      await ctx.runMutation(api.videos.updateFlashcardStatus, {
        videoId,
        status: "failed",
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  },
});
