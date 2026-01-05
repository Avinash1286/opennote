import { v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all capsules, optionally filtered by status
 */
export const listCapsules = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;

    let capsules;
    if (args.status) {
      capsules = await ctx.db
        .query("capsules")
        .withIndex("by_status", (q) => q.eq("status", args.status as "pending" | "generating_outline" | "generating_content" | "completed" | "failed"))
        .order("desc")
        .take(limit);
    } else {
      capsules = await ctx.db
        .query("capsules")
        .order("desc")
        .take(limit);
    }

    return await Promise.all(
      capsules.map(async (c) => {
        const jobs = await ctx.db
          .query("capsuleGenerationJobs")
          .withIndex("by_capsuleId", (q) => q.eq("capsuleId", c._id))
          .order("desc")
          .take(1);

        const job = jobs[0] ?? null;

        return {
          ...c,
          generation: job
            ? {
              currentStage: job.currentStage,
              modulesGenerated: job.modulesGenerated,
              totalModules: job.totalModules,
              updatedAt: job.updatedAt,
            }
            : null,
        };
      })
    );
  },
});

/**
 * Get a single capsule by ID
 */
export const getCapsule = query({
  args: { capsuleId: v.id("capsules") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.capsuleId);
  },
});

/**
 * Get capsule with all modules and lessons (full structure)
 */
export const getCapsuleWithContent = query({
  args: { capsuleId: v.id("capsules") },
  handler: async (ctx, args) => {
    const capsule = await ctx.db.get(args.capsuleId);
    if (!capsule) return null;

    // Get all modules for this capsule
    const modules = await ctx.db
      .query("capsuleModules")
      .withIndex("by_capsuleId", (q) => q.eq("capsuleId", args.capsuleId))
      .collect();

    // Sort modules by order
    modules.sort((a, b) => a.order - b.order);

    // Get all lessons for this capsule
    const lessons = await ctx.db
      .query("capsuleLessons")
      .withIndex("by_capsuleId", (q) => q.eq("capsuleId", args.capsuleId))
      .collect();

    // Group lessons by module
    const modulesWithLessons = modules.map((module) => {
      const moduleLessons = lessons
        .filter((l) => l.moduleId === module._id)
        .sort((a, b) => a.order - b.order);
      return {
        ...module,
        lessons: moduleLessons,
      };
    });

    return {
      ...capsule,
      modules: modulesWithLessons,
    };
  },
});

/**
 * Get generation job for a capsule
 */
export const getGenerationJob = query({
  args: { capsuleId: v.id("capsules") },
  handler: async (ctx, args) => {
    const jobs = await ctx.db
      .query("capsuleGenerationJobs")
      .withIndex("by_capsuleId", (q) => q.eq("capsuleId", args.capsuleId))
      .order("desc")
      .take(1);
    return jobs[0] ?? null;
  },
});

/**
 * Get recent capsules for dashboard
 */
export const getRecentCapsules = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 3;
    const capsules = await ctx.db
      .query("capsules")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);

    return await Promise.all(
      capsules.map(async (c) => {
        const jobs = await ctx.db
          .query("capsuleGenerationJobs")
          .withIndex("by_capsuleId", (q) => q.eq("capsuleId", c._id))
          .order("desc")
          .take(1);

        const job = jobs[0] ?? null;

        return {
          _id: c._id,
          title: c.title,
          description: c.description,
          status: c.status,
          moduleCount: c.moduleCount ?? 0,
          lessonCount: c.lessonCount ?? 0,
          estimatedDuration: c.estimatedDuration,
          createdAt: c.createdAt,
          generation: job
            ? {
              currentStage: job.currentStage,
              modulesGenerated: job.modulesGenerated,
              totalModules: job.totalModules,
              updatedAt: job.updatedAt,
            }
            : null,
        };
      })
    );
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Create a new capsule from a topic
 */
export const createCapsule = mutation({
  args: {
    title: v.string(),
    sourceType: v.union(v.literal("pdf"), v.literal("topic")),
    sourceTopic: v.optional(v.string()),
    userPrompt: v.optional(v.string()),
    // PDF fields (for future use)
    sourcePdfStorageId: v.optional(v.id("_storage")),
    sourcePdfName: v.optional(v.string()),
    sourcePdfMime: v.optional(v.string()),
    sourcePdfSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Input validation
    if (args.title.length < 2 || args.title.length > 200) {
      throw new Error("Title must be between 2 and 200 characters");
    }

    if (args.sourceType === "topic" && !args.sourceTopic) {
      throw new Error("Topic is required for topic-based capsules");
    }

    if (args.sourceTopic && args.sourceTopic.length > 500) {
      throw new Error("Topic must be under 500 characters");
    }

    const now = Date.now();

    const capsuleId = await ctx.db.insert("capsules", {
      title: args.title,
      description: undefined,
      userPrompt: args.userPrompt,
      sourceType: args.sourceType,
      sourceTopic: args.sourceTopic,
      sourcePdfStorageId: args.sourcePdfStorageId,
      sourcePdfName: args.sourcePdfName,
      sourcePdfMime: args.sourcePdfMime,
      sourcePdfSize: args.sourcePdfSize,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return capsuleId;
  },
});

/**
 * Update capsule status
 */
export const updateCapsuleStatus = mutation({
  args: {
    capsuleId: v.id("capsules"),
    status: v.union(
      v.literal("pending"),
      v.literal("generating_outline"),
      v.literal("generating_content"),
      v.literal("completed"),
      v.literal("failed")
    ),
    errorMessage: v.optional(v.string()),
    moduleCount: v.optional(v.number()),
    lessonCount: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: {
      status: typeof args.status;
      updatedAt: number;
      errorMessage?: string;
      moduleCount?: number;
      lessonCount?: number;
      estimatedDuration?: number;
      description?: string;
      completedAt?: number;
    } = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.errorMessage !== undefined) {
      updates.errorMessage = args.errorMessage;
    }
    if (args.moduleCount !== undefined) {
      updates.moduleCount = args.moduleCount;
    }
    if (args.lessonCount !== undefined) {
      updates.lessonCount = args.lessonCount;
    }
    if (args.estimatedDuration !== undefined) {
      updates.estimatedDuration = args.estimatedDuration;
    }
    if (args.description !== undefined) {
      updates.description = args.description;
    }
    if (args.status === "completed") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.capsuleId, updates);
  },
});

/**
 * Delete a capsule and all related content
 */
export const deleteCapsule = mutation({
  args: { capsuleId: v.id("capsules") },
  handler: async (ctx, args) => {
    // Delete all lessons
    const lessons = await ctx.db
      .query("capsuleLessons")
      .withIndex("by_capsuleId", (q) => q.eq("capsuleId", args.capsuleId))
      .collect();
    for (const lesson of lessons) {
      await ctx.db.delete(lesson._id);
    }

    // Delete all modules
    const modules = await ctx.db
      .query("capsuleModules")
      .withIndex("by_capsuleId", (q) => q.eq("capsuleId", args.capsuleId))
      .collect();
    for (const mod of modules) {
      await ctx.db.delete(mod._id);
    }

    // Delete generation jobs
    const jobs = await ctx.db
      .query("capsuleGenerationJobs")
      .withIndex("by_capsuleId", (q) => q.eq("capsuleId", args.capsuleId))
      .collect();
    for (const job of jobs) {
      await ctx.db.delete(job._id);
    }

    // Delete the capsule
    await ctx.db.delete(args.capsuleId);
  },
});

// =============================================================================
// INTERNAL MUTATIONS (for generation pipeline)
// =============================================================================

/**
 * Create a generation job
 */
export const createGenerationJob = internalMutation({
  args: {
    capsuleId: v.id("capsules"),
    generationId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("capsuleGenerationJobs", {
      capsuleId: args.capsuleId,
      generationId: args.generationId,
      currentStage: "outline",
      outlineGenerated: false,
      modulesGenerated: 0,
      totalModules: 0,
      currentModuleIndex: 0,
      retryCount: 0,
      startedAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update generation job progress
 */
export const updateGenerationJob = internalMutation({
  args: {
    jobId: v.id("capsuleGenerationJobs"),
    updates: v.object({
      currentStage: v.optional(v.string()),
      outlineGenerated: v.optional(v.boolean()),
      outlineJson: v.optional(v.string()),
      modulesGenerated: v.optional(v.number()),
      totalModules: v.optional(v.number()),
      currentModuleIndex: v.optional(v.number()),
      lastError: v.optional(v.string()),
      retryCount: v.optional(v.number()),
      completedAt: v.optional(v.number()),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.jobId, {
      ...args.updates,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Save a generated module with its lessons
 */
export const saveGeneratedModule = internalMutation({
  args: {
    capsuleId: v.id("capsules"),
    moduleData: v.object({
      title: v.string(),
      description: v.optional(v.string()),
      introduction: v.optional(v.string()),
      learningObjectives: v.optional(v.array(v.string())),
      moduleSummary: v.optional(v.string()),
      order: v.number(),
    }),
    lessons: v.array(v.object({
      title: v.string(),
      description: v.optional(v.string()),
      order: v.number(),
      type: v.string(),
      content: v.any(),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Create the module
    const moduleId = await ctx.db.insert("capsuleModules", {
      capsuleId: args.capsuleId,
      title: args.moduleData.title,
      description: args.moduleData.description,
      introduction: args.moduleData.introduction,
      learningObjectives: args.moduleData.learningObjectives,
      moduleSummary: args.moduleData.moduleSummary,
      order: args.moduleData.order,
      createdAt: now,
    });

    // Create all lessons for this module
    for (const lesson of args.lessons) {
      await ctx.db.insert("capsuleLessons", {
        moduleId,
        capsuleId: args.capsuleId,
        title: lesson.title,
        description: lesson.description,
        order: lesson.order,
        type: lesson.type as "concept" | "mixed" | "quiz",
        content: lesson.content,
        createdAt: now,
      });
    }

    return moduleId;
  },
});

/**
 * Get capsule data for generation (internal)
 */
export const getCapsuleForGeneration = internalQuery({
  args: { capsuleId: v.id("capsules") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.capsuleId);
  },
});

/**
 * Get generation job by ID (internal)
 */
export const getGenerationJobById = internalQuery({
  args: { jobId: v.id("capsuleGenerationJobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});
