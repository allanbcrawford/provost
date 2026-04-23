import { v } from "convex/values";
import { internalAction } from "../../_generated/server";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (_ctx, { args }) => {
    const scenario = (args?.scenario ?? {}) as {
      revisions?: Record<string, unknown>;
      customEdits?: Record<string, unknown>;
    };
    return {
      success: true,
      widget: {
        kind: "waterfall",
        props: {
          revisions: scenario.revisions ?? {},
          customEdits: scenario.customEdits ?? {},
        },
      },
    };
  },
});
