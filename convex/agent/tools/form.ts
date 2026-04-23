"use node";
import { v } from "convex/values";
import { internalAction } from "../../_generated/server";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (_ctx, { args, toolCallId }) => {
    // The form tool doesn't "execute" — it opens a UI widget and waits for user submission.
    // Return the widget payload; the run will pause via submitForm mutation.
    return {
      success: true,
      pauseForInput: true,
      widget: {
        kind: "form",
        props: { ...args, toolCallId },
      },
    };
  },
});
