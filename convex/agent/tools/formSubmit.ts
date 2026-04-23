import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { requireFamilyMember } from "../../lib/authz";

export const submit = mutation({
  args: {
    runId: v.id("thread_runs"),
    toolCallId: v.string(),
    values: v.any(),
  },
  handler: async (ctx, { runId, toolCallId, values }) => {
    const run = await ctx.db.get(runId);
    if (!run) throw new Error("run not found");
    await requireFamilyMember(ctx, run.family_id);

    const thread = await ctx.db.get(run.thread_id);
    if (!thread) throw new Error("thread not found");

    const toolMessage = {
      role: "tool",
      tool_call_id: toolCallId,
      content: JSON.stringify(values),
    };

    const newMessages = [...(thread.messages ?? []), toolMessage];
    await ctx.db.patch(run.thread_id, { messages: newMessages });
    await ctx.db.patch(runId, { history: newMessages });

    await ctx.scheduler.runAfter(0, internal.agent.tools.formResume.resume, {
      runId,
      toolCallId,
    });

    return { ok: true };
  },
});
