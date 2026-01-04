import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// =============================================================================
// VALIDATORS (matching schema)
// =============================================================================

const calloutValidator = v.object({
  type: v.string(), // "tip", "example", "note", "common-mistake"
  title: v.optional(v.string()),
  content: v.string(),
  bullets: v.optional(v.array(v.string())),
});

const definitionValidator = v.object({
  term: v.string(),
  definition: v.string(),
  example: v.optional(v.string()),
});

const highlightValidator = v.object({
  type: v.string(), // "insight", "important", "warning"
  title: v.optional(v.string()),
  content: v.string(),
});

const codeBlockValidator = v.object({
  code: v.string(),
  language: v.string(),
  title: v.optional(v.string()),
});

const interactivePromptValidator = v.object({
  type: v.string(), // "thought-experiment", "hands-on", "self-check"
  title: v.string(),
  prompt: v.string(),
  steps: v.optional(v.array(v.string())),
});

const sectionQuizValidator = v.object({
  type: v.string(), // "mcq", "true-false", "fill-blank"
  question: v.string(),
  options: v.optional(v.array(v.string())), // ONLY for MCQ
  correctAnswer: v.string(),
  explanation: v.string(),
});

const notesSectionValidator = v.object({
  title: v.string(),
  introHook: v.string(),
  content: v.string(),
  microSummary: v.string(),
  keyPoints: v.array(v.string()),
  examples: v.optional(v.array(v.string())),
  callouts: v.optional(v.array(calloutValidator)),
  codeBlocks: v.optional(v.array(codeBlockValidator)),
  highlights: v.optional(v.array(highlightValidator)),
  definitions: v.optional(v.array(definitionValidator)),
  interactivePrompts: v.optional(v.array(interactivePromptValidator)),
  reflectionQuestions: v.optional(v.array(v.string())),
  quiz: v.optional(v.array(sectionQuizValidator)),
});

const notesSummaryValidator = v.object({
  recap: v.string(),
  keyTakeaway: v.string(),
  nextSteps: v.array(v.string()),
});

const notesValidator = v.object({
  topic: v.string(),
  learningObjectives: v.array(v.string()),
  sections: v.array(notesSectionValidator),
  summary: notesSummaryValidator,
});

const quizQuestionValidator = v.object({
  question: v.string(),
  options: v.array(v.string()),
  correct: v.number(),
  explanation: v.string(),
});

const quizValidator = v.object({
  topic: v.string(),
  questions: v.array(quizQuestionValidator),
});

const flashcardValidator = v.object({
  front: v.string(),
  back: v.string(),
  hint: v.optional(v.string()),
});

const flashcardsValidator = v.object({
  topic: v.string(),
  cards: v.array(flashcardValidator),
});

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get a video by its YouTube video ID
 */
export const getByVideoId = query({
  args: { videoId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
  },
});

/**
 * Get transcript for a video
 */
export const getTranscript = query({
  args: { videoId: v.string() },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    
    if (!video) return null;
    
    return {
      transcript: video.transcript,
      language: video.transcriptLanguage,
    };
  },
});

/**
 * Get notes for a video
 */
export const getNotes = query({
  args: { videoId: v.string() },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    
    return video?.notes ?? null;
  },
});

/**
 * Get quiz for a video
 */
export const getQuiz = query({
  args: { videoId: v.string() },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    
    return video?.quiz ?? null;
  },
});

/**
 * Get flashcards for a video
 */
export const getFlashcards = query({
  args: { videoId: v.string() },
  handler: async (ctx, args) => {
    const video = await ctx.db
      .query("videos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    
    return {
      flashcards: video?.flashcards ?? null,
      status: video?.flashcardStatus ?? null,
      error: video?.flashcardError ?? null,
    };
  },
});

/**
 * List saved videos (for dashboard)
 */
export const listVideos = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const videos = await ctx.db.query("videos").collect();

    videos.sort((a, b) => {
      const aTime = (a.updatedAt ?? a.createdAt) as number;
      const bTime = (b.updatedAt ?? b.createdAt) as number;
      return bTime - aTime;
    });

    return videos.slice(0, limit).map((video) => ({
      _id: video._id,
      videoId: video.videoId ?? video.youtubeVideoId ?? "",
      title: video.title,
      channelTitle: video.channelTitle,
      thumbnail: video.thumbnail ?? video.thumbnailUrl,
      duration: video.duration,
      createdAt: video.createdAt,
      updatedAt: video.updatedAt,
      chapterCount: video.chapters?.length ?? 0,
      hasTranscript: Boolean(video.transcript),
      hasNotes: Boolean(video.notes),
      hasQuiz: Boolean(video.quiz),
    }));
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create or update a video record with metadata and transcript
 */
export const saveVideo = mutation({
  args: {
    videoId: v.string(),
    title: v.string(),
    channelTitle: v.optional(v.string()),
    description: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.string()),
    durationInSeconds: v.optional(v.number()),
    publishedAt: v.optional(v.union(v.string(), v.number())),
    transcript: v.optional(v.string()),
    transcriptLanguage: v.optional(v.string()),
    url: v.optional(v.string()),
    chapters: v.optional(v.array(v.object({
      time: v.string(),
      timeInSeconds: v.number(),
      title: v.string(),
      content: v.string(),
    }))),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("videos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    
    const now = Date.now();
    
    if (existing) {
      // Update existing record
      await ctx.db.patch(existing._id, {
        ...args,
        youtubeVideoId: args.videoId, // Also set legacy field
        status: args.transcript ? "completed" : existing.status,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new record
      return await ctx.db.insert("videos", {
        ...args,
        youtubeVideoId: args.videoId, // Also set legacy field
        status: args.transcript ? "completed" : "processing",
        processingStartedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Save transcript for a video
 */
export const saveTranscript = mutation({
  args: {
    videoId: v.string(),
    transcript: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("videos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    
    const now = Date.now();
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        transcript: args.transcript,
        transcriptLanguage: args.language,
        status: "completed",
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create minimal record with just transcript
      return await ctx.db.insert("videos", {
        videoId: args.videoId,
        youtubeVideoId: args.videoId,
        title: "Video",
        transcript: args.transcript,
        transcriptLanguage: args.language,
        status: "completed",
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Save generated notes for a video (new comprehensive format)
 */
export const saveNotes = mutation({
  args: {
    videoId: v.string(),
    notes: notesValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("videos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    
    if (!existing) {
      throw new Error(`Video ${args.videoId} not found`);
    }
    
    await ctx.db.patch(existing._id, {
      notes: args.notes,
      updatedAt: Date.now(),
    });
    
    return existing._id;
  },
});

/**
 * Save generated quiz for a video (new format)
 */
export const saveQuiz = mutation({
  args: {
    videoId: v.string(),
    quiz: quizValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("videos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    
    if (!existing) {
      throw new Error(`Video ${args.videoId} not found`);
    }
    
    await ctx.db.patch(existing._id, {
      quiz: args.quiz,
      updatedAt: Date.now(),
    });
    
    return existing._id;
  },
});

/**
 * Save generated flashcards for a video
 */
export const saveFlashcards = mutation({
  args: {
    videoId: v.string(),
    flashcards: flashcardsValidator,
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("videos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    
    if (!existing) {
      throw new Error(`Video ${args.videoId} not found`);
    }
    
    await ctx.db.patch(existing._id, {
      flashcards: args.flashcards,
      flashcardStatus: "completed",
      flashcardError: undefined,
      updatedAt: Date.now(),
    });
    
    return existing._id;
  },
});

/**
 * Update flashcard generation status
 */
export const updateFlashcardStatus = mutation({
  args: {
    videoId: v.string(),
    status: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("videos")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();
    
    if (!existing) {
      throw new Error(`Video ${args.videoId} not found`);
    }
    
    await ctx.db.patch(existing._id, {
      flashcardStatus: args.status,
      flashcardError: args.error,
      updatedAt: Date.now(),
    });
    
    return existing._id;
  },
});
