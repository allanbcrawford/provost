"use node";

// Stub for LLM-driven waterfall-state extraction. Future work: read the
// document's text, propose a structured WaterfallState patch (see
// convex/lib/waterfallState.ts), validate via safeParseWaterfallState,
// surface for human approval, then write to documents.state.
//
// Today the handler returns a "not yet implemented" approval envelope so
// the tool is wired through the registry without committing the agent to
// a half-built extractor. Approval-gated so a future enable doesn't
// silently start mutating documents.

import { v } from "convex/values";
import { internalAction } from "../../_generated/server";

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (
    _ctx,
    { args },
  ): Promise<{
    success: false;
    pending: true;
    reason: string;
    proposedDocumentId: string | null;
  }> => {
    const documentId = args?.documentId ? String(args.documentId) : null;
    return {
      success: false,
      pending: true,
      reason:
        "extract_waterfall_state is registered but not yet implemented. Authoring is currently human-driven via the waterfall state editor.",
      proposedDocumentId: documentId,
    };
  },
});
