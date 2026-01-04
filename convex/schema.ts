import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Callout validator - types: tip, example, note, common-mistake
const calloutValidator = v.object({
  type: v.string(), // "tip", "example", "note", "common-mistake"
  title: v.optional(v.string()),
  content: v.string(),
  bullets: v.optional(v.array(v.string())), // Optional supporting points
});

// Definition validator with optional example
const definitionValidator = v.object({
  term: v.string(),
  definition: v.string(),
  example: v.optional(v.string()), // Optional usage example
});

// Highlight validator - types: insight, important, warning
const highlightValidator = v.object({
  type: v.string(), // "insight", "important", "warning"
  title: v.optional(v.string()),
  content: v.string(),
});

// Code block validator for technical content
const codeBlockValidator = v.object({
  code: v.string(),
  language: v.string(), // javascript, python, html, css, etc.
  title: v.optional(v.string()),
});

// Interactive prompt validator
const interactivePromptValidator = v.object({
  type: v.string(), // "thought-experiment", "hands-on", "self-check"
  title: v.string(),
  prompt: v.string(),
  steps: v.optional(v.array(v.string())),
});

// Section quiz question validator (per-section quizzes in notes)
const sectionQuizValidator = v.object({
  type: v.string(), // "mcq", "true-false", "fill-blank"
  question: v.string(),
  options: v.optional(v.array(v.string())), // ONLY for MCQ
  correctAnswer: v.string(), // String answer for flexibility
  explanation: v.string(),
});

// Notes section validator
const notesSectionValidator = v.object({
  title: v.string(),
  introHook: v.string(),
  content: v.string(),
  microSummary: v.string(),
  keyPoints: v.array(v.string()),
  examples: v.optional(v.array(v.string())), // Concrete examples
  callouts: v.optional(v.array(calloutValidator)),
  codeBlocks: v.optional(v.array(codeBlockValidator)), // For technical content
  highlights: v.optional(v.array(highlightValidator)),
  definitions: v.optional(v.array(definitionValidator)),
  interactivePrompts: v.optional(v.array(interactivePromptValidator)),
  reflectionQuestions: v.optional(v.array(v.string())),
  quiz: v.optional(v.array(sectionQuizValidator)),
});

// Notes summary validator
const notesSummaryValidator = v.object({
  recap: v.string(),
  keyTakeaway: v.string(),
  nextSteps: v.array(v.string()),
});

// Full quiz question validator (for final quiz)
const quizQuestionValidator = v.object({
  question: v.string(),
  options: v.array(v.string()),
  correct: v.number(), // Index of correct answer (0-3)
  explanation: v.string(),
});

// Flashcard validator
const flashcardValidator = v.object({
  front: v.string(),
  back: v.string(),
  hint: v.optional(v.string()),
});

// Simulation idea validator (generated first from transcript analysis)
const simulationIdeaValidator = v.object({
  id: v.string(), // Unique ID for this simulation idea
  title: v.string(),
  description: v.string(), // Detailed description of what to simulate
  concepts: v.array(v.string()), // Key concepts this simulation will demonstrate
  complexity: v.string(), // "simple" | "moderate" | "complex"
});

// Generated simulation validator (HTML/CSS/JS code)
const simulationCodeValidator = v.object({
  html: v.string(),
  css: v.string(),
  js: v.string(),
});

export default defineSchema({
  videos: defineTable({
    // Video identifier (YouTube video ID) - support both old and new field names
    videoId: v.optional(v.string()),
    youtubeVideoId: v.optional(v.string()), // Legacy field name
    
    // Legacy fields for backwards compatibility
    url: v.optional(v.string()),
    status: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    processingStartedAt: v.optional(v.number()),
    
    // Video metadata
    title: v.string(),
    channelTitle: v.optional(v.string()),
    description: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.string()),
    durationInSeconds: v.optional(v.number()),
    publishedAt: v.optional(v.union(v.string(), v.number())),
    
    // Transcript
    transcript: v.optional(v.string()),
    transcriptLanguage: v.optional(v.string()),
    
    // Chapters parsed from description
    chapters: v.optional(v.array(v.object({
      time: v.string(),
      timeInSeconds: v.number(),
      title: v.string(),
      content: v.string(),
    }))),
    
    // Generated notes (new comprehensive format)
    notes: v.optional(v.object({
      topic: v.string(),
      learningObjectives: v.array(v.string()),
      sections: v.array(notesSectionValidator),
      summary: notesSummaryValidator,
    })),
    
    // Generated quiz (new format with correct index)
    quiz: v.optional(v.object({
      topic: v.string(),
      questions: v.array(quizQuestionValidator),
    })),
    
    // Generated flashcards
    flashcards: v.optional(v.object({
      topic: v.string(),
      cards: v.array(flashcardValidator),
    })),
    
    // Flashcard generation status
    flashcardStatus: v.optional(v.string()), // "pending" | "generating" | "completed" | "failed"
    flashcardError: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_videoId", ["videoId"])
    .index("by_youtubeVideoId", ["youtubeVideoId"]),

  chatMessages: defineTable({
    videoId: v.string(),
    role: v.string(), // "user" | "assistant"
    content: v.string(),
    status: v.optional(v.string()), // "streaming" | "completed" | "failed"
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_videoId", ["videoId"])
    .index("by_videoId_createdAt", ["videoId", "createdAt"]),

  // Simulations table - stores simulation ideas and generated code
  simulations: defineTable({
    videoId: v.string(),
    
    // Simulation idea (generated from transcript)
    ideaId: v.string(), // Unique ID for this simulation
    title: v.string(),
    description: v.string(),
    concepts: v.array(v.string()),
    complexity: v.string(), // "simple" | "moderate" | "complex"
    
    // Generated code (populated when user clicks to generate)
    code: v.optional(simulationCodeValidator),
    
    // Status tracking
    status: v.string(), // "idea" | "generating" | "completed" | "failed"
    error: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_videoId", ["videoId"])
    .index("by_videoId_ideaId", ["videoId", "ideaId"]),

  // Track simulation ideas generation status per video
  simulationIdeasStatus: defineTable({
    videoId: v.string(),
    status: v.string(), // "pending" | "generating" | "completed" | "failed" | "not-applicable"
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_videoId", ["videoId"]),

  // =========================================================================
  // CAPSULE TABLES - Micro-learning course generation
  // =========================================================================

  // Main capsule (course) table
  capsules: defineTable({
    // Basic metadata
    title: v.string(),
    description: v.optional(v.string()),
    userPrompt: v.optional(v.string()), // User's custom guidance

    // Source information
    sourceType: v.union(v.literal("pdf"), v.literal("topic")),
    sourcePdfStorageId: v.optional(v.id("_storage")),
    sourcePdfName: v.optional(v.string()),
    sourcePdfMime: v.optional(v.string()),
    sourcePdfSize: v.optional(v.number()),
    sourceTopic: v.optional(v.string()),

    // Status tracking
    status: v.union(
      v.literal("pending"),
      v.literal("generating_outline"),
      v.literal("generating_content"),
      v.literal("completed"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),

    // Course stats
    moduleCount: v.optional(v.number()),
    lessonCount: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()), // in minutes

    // Visibility
    isPublic: v.optional(v.boolean()),
    publishedAt: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_createdAt", ["createdAt"]),

  // Capsule modules table
  capsuleModules: defineTable({
    capsuleId: v.id("capsules"),

    // Content
    title: v.string(),
    description: v.optional(v.string()),
    introduction: v.optional(v.string()),
    learningObjectives: v.optional(v.array(v.string())),
    moduleSummary: v.optional(v.string()),

    // Ordering
    order: v.number(), // 0-indexed position

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_capsuleId", ["capsuleId"])
    .index("by_capsuleId_order", ["capsuleId", "order"]),

  // Capsule lessons table
  capsuleLessons: defineTable({
    moduleId: v.id("capsuleModules"),
    capsuleId: v.id("capsules"), // Denormalized for efficient queries

    // Content
    title: v.string(),
    description: v.optional(v.string()),
    order: v.number(),

    // Lesson type (determines renderer)
    type: v.union(
      v.literal("concept"),
      v.literal("mixed"),
      v.literal("quiz")
    ),

    // The actual content (flexible JSON structure)
    content: v.any(),

    // Regeneration tracking
    regenerationStatus: v.optional(v.union(
      v.literal("idle"),
      v.literal("pending"),
      v.literal("regenerating"),
      v.literal("completed"),
      v.literal("failed")
    )),
    regenerationError: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_moduleId", ["moduleId"])
    .index("by_moduleId_order", ["moduleId", "order"])
    .index("by_capsuleId", ["capsuleId"]),

  // Generation jobs table for background processing
  capsuleGenerationJobs: defineTable({
    capsuleId: v.id("capsules"),
    generationId: v.string(), // Unique job identifier

    // State tracking
    currentStage: v.string(), // "outline" | "module_0" | "module_1" | ... | "finalizing" | "completed"
    
    // Progress tracking
    outlineGenerated: v.boolean(),
    modulesGenerated: v.number(),
    totalModules: v.number(),
    currentModuleIndex: v.number(),

    // Stored data for resumption
    outlineJson: v.optional(v.string()),

    // Error handling
    lastError: v.optional(v.string()),
    retryCount: v.number(),

    // Timestamps
    startedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_capsuleId", ["capsuleId"])
    .index("by_generationId", ["generationId"]),
});
