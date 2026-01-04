import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getChatMessages = query({
  args: {
    videoId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 200;
    const results = await ctx.db
      .query("chatMessages")
      .withIndex("by_videoId_createdAt", (q) => q.eq("videoId", args.videoId))
      .order("asc")
      .take(limit);

    return results;
  },
});

export const getRecentChatMessages = query({
  args: {
    videoId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 40;
    const newestFirst = await ctx.db
      .query("chatMessages")
      .withIndex("by_videoId_createdAt", (q) => q.eq("videoId", args.videoId))
      .order("desc")
      .take(limit);

    return newestFirst.reverse();
  },
});

export const createChatMessage = mutation({
  args: {
    videoId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    status: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("chatMessages", {
      videoId: args.videoId,
      role: args.role,
      content: args.content,
      status: args.status,
      error: args.error,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateChatMessage = mutation({
  args: {
    id: v.id("chatMessages"),
    content: v.optional(v.string()),
    status: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
    };

    if (args.content !== undefined) patch.content = args.content;
    if (args.status !== undefined) patch.status = args.status;
    if (args.error !== undefined) patch.error = args.error;

    await ctx.db.patch(args.id, patch);
  },
});
