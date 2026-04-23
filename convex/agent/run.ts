import { type ToolSurface, toolsForSurface } from "@provost/agent";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireFamilyMember } from "../lib/authz";

const toolSurfaceValidator = v.union(
  v.literal("family"),
  v.literal("documents"),
  v.literal("library"),
  v.literal("lessons"),
  v.literal("signals"),
  v.literal("simulations"),
  v.literal("professionals"),
  v.literal("governance"),
  v.literal("any"),
);

const selectionValidator = v.union(v.null(), v.object({ kind: v.string(), id: v.string() }));

export const start = mutation({
  args: {
    threadId: v.id("threads"),
    userMessage: v.string(),
    route: toolSurfaceValidator,
    selection: v.optional(selectionValidator),
    visibleState: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const thread = await ctx.db.get(args.threadId);
    if (!thread) throw new Error("thread not found");

    const { user, membership } = await requireFamilyMember(ctx, thread.family_id);

    const tools = toolsForSurface(args.route as ToolSurface, membership.role);
    const toolNames = tools.map((t) => t.name);

    const userMessage = { role: "user" as const, content: args.userMessage };
    const messages = [...(thread.messages ?? []), userMessage];
    await ctx.db.patch(args.threadId, { messages });

    const runId = await ctx.db.insert("thread_runs", {
      thread_id: args.threadId,
      user_id: user._id,
      family_id: thread.family_id,
      history: messages,
      state: { pending_tool_calls: [] },
      tools: toolNames,
      status: "running",
      started_at: Date.now(),
    });

    await ctx.db.patch(args.threadId, { current_run_id: runId });

    await ctx.scheduler.runAfter(0, internal.agent.runActions.execute, {
      runId,
      route: args.route,
      selection: args.selection ?? null,
      visibleState: args.visibleState,
    });

    return { runId };
  },
});
