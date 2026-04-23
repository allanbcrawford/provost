"use node";
import { v } from "convex/values";
import { internalAction } from "../../_generated/server";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (_ctx, { args }) => {
    const focus = typeof args?.focus === "string" ? args.focus : undefined;
    const layers = args?.layers && typeof args.layers === "object" ? args.layers : undefined;
    const flaggedOnly = typeof args?.flaggedOnly === "boolean" ? args.flaggedOnly : undefined;
    return {
      success: true,
      widget: {
        kind: "graph-focus",
        props: { focus, layers, flaggedOnly },
      },
    };
  },
});
