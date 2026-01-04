"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

function buildSystemPrompt(params: { videoTitle?: string; transcript?: string }) {
  const { videoTitle, transcript } = params;
  const truncatedTranscript = transcript
    ? transcript.length > 15000
      ? `${transcript.substring(0, 15000)}...[truncated]`
      : transcript
    : "";

  return `You are an AI tutor helping a student learn from a YouTube video.

${videoTitle ? `Video Title: ${videoTitle}` : ""}

${truncatedTranscript ? `Video Transcript:\n${truncatedTranscript}` : ""}

Your role is to:
1. Answer questions about the video content clearly and concisely
2. Explain concepts in simpler terms when asked
3. Walk through formulas or processes step-by-step
4. Help the student understand difficult parts
5. Quiz the student when they want to test their knowledge

Be friendly, encouraging, and educational. Use examples when helpful.
Format your responses with markdown for better readability.
Use LaTeX for mathematical expressions (wrap in $ for inline, $$ for block).`;
}

export const sendChatMessage = action({
  args: {
    videoId: v.string(),
    userContent: v.string(),
    transcript: v.optional(v.string()),
    videoTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userText = args.userContent.trim();
    if (!userText) return;

    // Persist the user's message
    await ctx.runMutation(api.chat.createChatMessage, {
      videoId: args.videoId,
      role: "user",
      content: userText,
      status: "completed",
    });

    // Create placeholder assistant message that we'll update as we stream
    const assistantId = await ctx.runMutation(api.chat.createChatMessage, {
      videoId: args.videoId,
      role: "assistant",
      content: "",
      status: "streaming",
    });

    const system = buildSystemPrompt({
      videoTitle: args.videoTitle,
      transcript: args.transcript,
    });

    // Build context from the most recent messages (excluding the placeholder)
    const recent = await ctx.runQuery(api.chat.getRecentChatMessages, {
      videoId: args.videoId,
      limit: 40,
    });

    const contextMessages = recent
      .filter((m) => m._id !== assistantId)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    let full = "";

    try {
      const result = streamText({
        model: google("gemini-3-flash-preview"),
        system,
        messages: contextMessages,
      });

      const reader = result.textStream.getReader();

      let lastSavedLength = 0;
      let lastFlushAt = Date.now();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        full += value ?? "";

        const shouldFlushBySize = full.length - lastSavedLength >= 200;
        const shouldFlushByTime = Date.now() - lastFlushAt >= 500;

        if (shouldFlushBySize || shouldFlushByTime) {
          lastSavedLength = full.length;
          lastFlushAt = Date.now();
          await ctx.runMutation(api.chat.updateChatMessage, {
            id: assistantId,
            content: full,
          });
        }
      }

      await ctx.runMutation(api.chat.updateChatMessage, {
        id: assistantId,
        content: full,
        status: "completed",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await ctx.runMutation(api.chat.updateChatMessage, {
        id: assistantId,
        status: "failed",
        error: message,
        content: full || "Sorry, I encountered an error. Please try again.",
      });
    }
  },
});
