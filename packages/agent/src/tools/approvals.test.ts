import { describe, expect, it } from "vitest";
import { APPROVAL_REQUIRED_TOOLS, requiresApproval } from "./approvals";
import { registerAllTools } from "./register-all";
import { listTools } from "./registry";

// The registry is populated by a single registerAllTools() call; guard
// against re-registration if another test file calls it.
try {
  registerAllTools();
} catch {
  // already registered
}

describe("requiresApproval", () => {
  it("returns true when the registry flag is true", () => {
    expect(requiresApproval("draft_revision", true)).toBe(true);
  });

  it("returns false when both sources agree the tool is safe", () => {
    expect(requiresApproval("navigate", false)).toBe(false);
  });

  it("fails closed for a completely unknown tool", () => {
    expect(requiresApproval("mystery_tool", undefined)).toBe(true);
  });

  it("gates when the map says true even if registry disagrees", () => {
    expect(requiresApproval("invite_member", false)).toBe(true);
  });
});

describe("APPROVAL_REQUIRED_TOOLS parity with registry", () => {
  it("every registered tool has a matching entry in the map", () => {
    for (const def of listTools()) {
      expect(APPROVAL_REQUIRED_TOOLS).toHaveProperty(def.name);
      expect(APPROVAL_REQUIRED_TOOLS[def.name]).toBe(def.approvalRequired);
    }
  });
});

// --- Pause/resume decision logic for the Convex run loop ---
// The real flow lives in convex/agent/runActions.ts but the decision
// branching is trivial enough to reproduce here so we can regression-test
// it in isolation.
type PendingToolCall = { id: string; name: string; argsJson: string };
type Decision = { status: "approved" | "rejected"; reason?: string };

function planResumedMessages(
  pending: PendingToolCall[],
  decisions: Map<string, Decision>,
  execute: (call: PendingToolCall) => unknown,
): Array<{ tool_call_id: string; content: string }> {
  const out: Array<{ tool_call_id: string; content: string }> = [];
  for (const call of pending) {
    const decision = decisions.get(call.id);
    if (decision?.status === "approved") {
      const result = execute(call);
      out.push({ tool_call_id: call.id, content: JSON.stringify(result) });
    } else {
      const reason = decision?.reason?.trim() || "no reason provided";
      out.push({
        tool_call_id: call.id,
        content: `Approval denied. Reason: ${reason}`,
      });
    }
  }
  return out;
}

describe("run loop resumeAfterApproval", () => {
  it("executes approved tools and appends a rejection message for denied ones", () => {
    const pending: PendingToolCall[] = [
      { id: "call_1", name: "invite_member", argsJson: '{"email":"a@b.com"}' },
      { id: "call_2", name: "draft_revision", argsJson: "{}" },
    ];
    const decisions = new Map<string, Decision>([
      ["call_1", { status: "approved" }],
      ["call_2", { status: "rejected", reason: "owner wants to review first" }],
    ]);
    const executed: string[] = [];
    const msgs = planResumedMessages(pending, decisions, (call) => {
      executed.push(call.id);
      return { ok: true, name: call.name };
    });

    expect(executed).toEqual(["call_1"]);
    expect(msgs).toHaveLength(2);
    const [approvedMsg, rejectedMsg] = msgs;
    expect(approvedMsg).toMatchObject({ tool_call_id: "call_1" });
    expect(JSON.parse(approvedMsg?.content)).toEqual({ ok: true, name: "invite_member" });
    expect(rejectedMsg).toEqual({
      tool_call_id: "call_2",
      content: "Approval denied. Reason: owner wants to review first",
    });
  });

  it("supplies a default reason when none is recorded", () => {
    const pending: PendingToolCall[] = [{ id: "call_x", name: "create_task", argsJson: "{}" }];
    const decisions = new Map<string, Decision>([["call_x", { status: "rejected" }]]);
    const msgs = planResumedMessages(pending, decisions, () => ({ ok: true }));
    expect(msgs[0]?.content).toBe("Approval denied. Reason: no reason provided");
  });

  it("treats a missing decision as a rejection (defense-in-depth)", () => {
    const pending: PendingToolCall[] = [
      { id: "call_orphan", name: "invite_member", argsJson: "{}" },
    ];
    const msgs = planResumedMessages(pending, new Map(), () => ({ ok: true }));
    expect(msgs[0]?.content).toBe("Approval denied. Reason: no reason provided");
  });
});
