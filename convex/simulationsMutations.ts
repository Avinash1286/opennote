import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// =============================================================================
// VALIDATORS
// =============================================================================

const simulationCodeValidator = v.object({
  html: v.string(),
  css: v.string(),
  js: v.string(),
});

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get the simulation ideas generation status for a video
 */
export const getIdeasStatus = query({
  args: { videoId: v.string() },
  handler: async (ctx, args) => {
    const status = await ctx.db
      .query("simulationIdeasStatus")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();

    return status ?? null;
  },
});

/**
 * Get all simulations for a video
 */
export const getSimulations = query({
  args: { videoId: v.string() },
  handler: async (ctx, args) => {
    const simulations = await ctx.db
      .query("simulations")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .collect();

    return simulations;
  },
});

/**
 * Get a specific simulation by videoId and ideaId
 */
export const getSimulation = query({
  args: {
    videoId: v.string(),
    ideaId: v.string(),
  },
  handler: async (ctx, args) => {
    const simulation = await ctx.db
      .query("simulations")
      .withIndex("by_videoId_ideaId", (q) =>
        q.eq("videoId", args.videoId).eq("ideaId", args.ideaId)
      )
      .first();

    return simulation ?? null;
  },
});

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Update the simulation ideas generation status
 */
export const updateIdeasStatus = mutation({
  args: {
    videoId: v.string(),
    status: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("simulationIdeasStatus")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        error: args.error,
        updatedAt: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("simulationIdeasStatus", {
        videoId: args.videoId,
        status: args.status,
        error: args.error,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Create a new simulation idea
 */
export const createSimulationIdea = mutation({
  args: {
    videoId: v.string(),
    ideaId: v.string(),
    title: v.string(),
    description: v.string(),
    concepts: v.array(v.string()),
    complexity: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if this simulation idea already exists
    const existing = await ctx.db
      .query("simulations")
      .withIndex("by_videoId_ideaId", (q) =>
        q.eq("videoId", args.videoId).eq("ideaId", args.ideaId)
      )
      .first();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        title: args.title,
        description: args.description,
        concepts: args.concepts,
        complexity: args.complexity,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new simulation idea
    return await ctx.db.insert("simulations", {
      videoId: args.videoId,
      ideaId: args.ideaId,
      title: args.title,
      description: args.description,
      concepts: args.concepts,
      complexity: args.complexity,
      status: "idea",
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Update simulation status
 */
export const updateSimulationStatus = mutation({
  args: {
    videoId: v.string(),
    ideaId: v.string(),
    status: v.string(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const simulation = await ctx.db
      .query("simulations")
      .withIndex("by_videoId_ideaId", (q) =>
        q.eq("videoId", args.videoId).eq("ideaId", args.ideaId)
      )
      .first();

    if (!simulation) {
      throw new Error(`Simulation ${args.ideaId} not found for video ${args.videoId}`);
    }

    await ctx.db.patch(simulation._id, {
      status: args.status,
      error: args.error,
      updatedAt: Date.now(),
    });

    return simulation._id;
  },
});

/**
 * Save generated simulation code
 */
export const saveSimulationCode = mutation({
  args: {
    videoId: v.string(),
    ideaId: v.string(),
    code: simulationCodeValidator,
  },
  handler: async (ctx, args) => {
    const simulation = await ctx.db
      .query("simulations")
      .withIndex("by_videoId_ideaId", (q) =>
        q.eq("videoId", args.videoId).eq("ideaId", args.ideaId)
      )
      .first();

    if (!simulation) {
      throw new Error(`Simulation ${args.ideaId} not found for video ${args.videoId}`);
    }

    await ctx.db.patch(simulation._id, {
      code: args.code,
      status: "completed",
      error: undefined,
      updatedAt: Date.now(),
    });

    return simulation._id;
  },
});

/**
 * Delete all simulations for a video (for regeneration)
 */
export const deleteSimulationsForVideo = mutation({
  args: { videoId: v.string() },
  handler: async (ctx, args) => {
    const simulations = await ctx.db
      .query("simulations")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .collect();

    for (const sim of simulations) {
      await ctx.db.delete(sim._id);
    }

    // Also delete the status
    const status = await ctx.db
      .query("simulationIdeasStatus")
      .withIndex("by_videoId", (q) => q.eq("videoId", args.videoId))
      .first();

    if (status) {
      await ctx.db.delete(status._id);
    }

    return { deleted: simulations.length };
  },
});
