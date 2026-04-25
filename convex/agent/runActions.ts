"use node";

import { type ToolSurface, toOpenAITools, toolsForSurface } from "@provost/agent";
import { v } from "convex/values";
import type OpenAI from "openai";
import { internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { getOpenAI } from "./openai";
import { buildSystemPrompt } from "./prompts";

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

type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

type PendingToolCall = {
  id: string;
  name: string;
  argsJson: string;
};

const MAX_TURNS = 8;

// Source of truth for tool approvalRequired lives in
// packages/agent/src/tools/register-all.ts. This Convex-side map is a
// defense-in-depth duplicate so an unknown / newly-added tool still gets
// gated if someone forgets to mirror the flag. Keep in sync with the
// registry until Phase 7+ introduces a shared constant.
const APPROVAL_REQUIRED_TOOLS: Record<string, boolean> = {
  navigate: false,
  form: false,
  render_waterfall_simulation: false,
  render_family_graph: false,
  explain_document: false,
  generate_signals: false,
  draft_revision: true,
  create_task: true,
  search_library: false,
  summarize_lesson: false,
  assign_lesson: true,
  invite_member: true,
  attach_file: true,
  list_observations: false,
  search_knowledge: false,
  remember: true,
};

function requiresApproval(toolName: string, registryFlag: boolean | undefined): boolean {
  const mapFlag = APPROVAL_REQUIRED_TOOLS[toolName];
  // If either source marks it as requiring approval, gate it. If the tool is
  // unknown to both, fail closed and require approval.
  if (mapFlag === undefined && registryFlag === undefined) return true;
  return Boolean(mapFlag) || Boolean(registryFlag);
}

// TODO(phase-3.7/3.8): replace this switch with dynamic dispatch via
// ctx.runAction(<handlerRef>) once navigate + form tool handlers exist.
async function dispatchTool(
  ctx: { runAction: (ref: unknown, args: unknown) => Promise<unknown> } | unknown,
  toolName: string,
  toolArgs: unknown,
  toolCallId?: string,
  runId?: unknown,
): Promise<unknown> {
  switch (toolName) {
    case "navigate":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.navigate.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "form":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.form.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "render_waterfall_simulation":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.renderWaterfallSimulation.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "render_family_graph":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.renderFamilyGraph.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "generate_signals":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.generateSignals.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "draft_revision":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.draftRevision.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "explain_document":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.explainDocument.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "search_library":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.searchLibrary.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "invite_member":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.inviteMember.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "attach_file":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.attachFile.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "list_observations":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.listObservations.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "search_knowledge":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.searchKnowledge.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "remember":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.remember.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "summarize_lesson":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.summarizeLesson.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "recommend_lesson":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.recommendLesson.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "assign_lesson":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.assignLesson.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "create_task":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.createTask.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    case "extract_waterfall_state":
      return (ctx as { runAction: (ref: unknown, args: unknown) => Promise<unknown> }).runAction(
        internal.agent.tools.extractWaterfallState.handle,
        { args: toolArgs, toolCallId: toolCallId ?? "", runId },
      );
    default:
      return { ok: false, error: `tool handler not implemented: ${toolName}` };
  }
}

function safeParseJson(raw: string): unknown {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { _raw: raw };
  }
}

export const execute = internalAction({
  args: {
    runId: v.id("thread_runs"),
    route: toolSurfaceValidator,
    selection: v.optional(selectionValidator),
    visibleState: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const context = await ctx.runQuery(internal.agent.runInternal.loadRunContext, {
      runId: args.runId,
    });
    const { run, thread, familyName, members, memories } = context;

    let sequence = 0;
    const nextSeq = () => ++sequence;

    try {
      await ctx.runMutation(internal.agent.runInternal.writeEvent, {
        runId: args.runId,
        threadId: thread._id,
        sequence: nextSeq(),
        type: "run_started",
        data: { route: args.route },
      });

      const history = (run.history ?? []) as ChatMessage[];

      const preferences: Record<string, unknown> = await ctx.runQuery(
        internal.compliance.getPreferencesInternal,
        { familyId: run.family_id },
      );
      const piiRedactionEnabled = preferences["guardrails.pii_redaction"] !== false;
      const nonAdviceDisclaimerEnabled = preferences["guardrails.non_advice_disclaimer"] !== false;

      // --- Guardrails: classify the last user message before the main LLM call ---
      let guardDisclaimer: string | null = null;
      let lastUserIdx = -1;
      let lastUserMsg: ChatMessage | undefined;
      for (let i = history.length - 1; i >= 0; i--) {
        const m = history[i];
        if (m && m.role === "user") {
          lastUserIdx = i;
          lastUserMsg = m;
          break;
        }
      }
      if (lastUserMsg && (piiRedactionEnabled || nonAdviceDisclaimerEnabled)) {
        const raw = lastUserMsg.content;
        const userText = typeof raw === "string" ? raw : "";
        if (userText.trim().length > 0) {
          const guard: {
            category: "safe" | "non_advice" | "pii_detected";
            reason?: string;
            disclaimer?: string | null;
            redactedText?: string | null;
          } = await ctx.runAction(internal.guardrails.classifyMessage, { text: userText });

          if (guard.category === "pii_detected" && piiRedactionEnabled) {
            const redacted =
              guard.redactedText && guard.redactedText.trim().length > 0
                ? guard.redactedText
                : userText.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, "[REDACTED]");
            history[lastUserIdx] = {
              ...(lastUserMsg as ChatMessage),
              content: redacted,
            } as ChatMessage;
            await ctx.runMutation(internal.agent.runInternal.replaceLastUserMessage, {
              threadId: thread._id,
              runId: args.runId,
              newContent: redacted,
            });
            await ctx.runMutation(internal.agent.runInternal.writeGuardrailAudit, {
              runId: args.runId,
              action: "guardrail.pii_redacted",
              metadata: { reason: guard.reason ?? "pii_detected" },
            });
            await ctx.runMutation(internal.agent.runInternal.writeEvent, {
              runId: args.runId,
              threadId: thread._id,
              sequence: nextSeq(),
              type: "content_finished",
              data: {
                widget: {
                  kind: "secure-field",
                  props: {
                    message:
                      "I detected personal information (SSN, account, or card number). I've redacted it. For secure entry, use the field below.",
                    reason: guard.reason ?? null,
                  },
                },
              },
            });
            guardDisclaimer =
              "The user's previous message contained sensitive PII which has been redacted as [REDACTED]. Do not ask the user to re-type those identifiers in chat; direct them to use the secure-field widget instead.";
          } else if (guard.category === "non_advice" && nonAdviceDisclaimerEnabled) {
            const disclaimer =
              guard.disclaimer && guard.disclaimer.trim().length > 0
                ? guard.disclaimer
                : "Provost provides educational information only and does not give licensed legal, tax, or investment advice. For specific guidance, consult a qualified professional.";
            guardDisclaimer = `Guardrail notice: this message may be asking for licensed professional advice. You MUST prepend the following disclaimer verbatim before answering:\n\n"${disclaimer}"`;
            await ctx.runMutation(internal.agent.runInternal.writeGuardrailAudit, {
              runId: args.runId,
              action: "guardrail.non_advice",
              metadata: { reason: guard.reason ?? "non_advice", disclaimer },
            });
          }
        }

        // Tool-message guardrail: form submissions (and other user-supplied
        // tool results) arrive after the last `user` message and bypass the
        // pass above. Scan the latest tool message too so SSNs pasted into a
        // form field still get redacted.
        if (piiRedactionEnabled) {
          for (let i = history.length - 1; i >= 0; i--) {
            const m = history[i];
            if (!m || m.role !== "tool") continue;
            const toolCallId = (m as { tool_call_id?: string }).tool_call_id ?? "";
            const toolText =
              typeof m.content === "string" ? m.content : JSON.stringify(m.content ?? "");
            if (toolText.trim().length === 0) break;
            const toolGuard: {
              category: "safe" | "non_advice" | "pii_detected";
              reason?: string;
              redactedText?: string | null;
            } = await ctx.runAction(internal.guardrails.classifyMessage, {
              text: toolText,
            });
            if (toolGuard.category === "pii_detected" && toolCallId) {
              const redacted =
                toolGuard.redactedText && toolGuard.redactedText.trim().length > 0
                  ? toolGuard.redactedText
                  : toolText.replace(/\b\d{3}-?\d{2}-?\d{4}\b/g, "[REDACTED]");
              history[i] = { ...(m as ChatMessage), content: redacted } as ChatMessage;
              await ctx.runMutation(internal.agent.runInternal.redactToolMessage, {
                threadId: thread._id,
                runId: args.runId,
                toolCallId,
                newContent: redacted,
              });
              await ctx.runMutation(internal.agent.runInternal.writeGuardrailAudit, {
                runId: args.runId,
                action: "guardrail.pii_redacted",
                metadata: {
                  reason: toolGuard.reason ?? "pii_detected",
                  source: "tool_message",
                  toolCallId,
                },
              });
            }
            break;
          }
        }
      }
      // --- end guardrails ---

      const systemPrompt = buildSystemPrompt({
        route: args.route,
        familyName: familyName ?? undefined,
        selection: args.selection ?? null,
        visibleState: args.visibleState,
        members,
        memories,
      });

      const systemContent = guardDisclaimer
        ? `${systemPrompt}\n\n${guardDisclaimer}`
        : systemPrompt;

      // Rolling-summary trim (Phase H): if the thread has a stored summary
      // covering an older prefix, replace that prefix with a single recap
      // note in the prompt-side history. The persisted history is untouched.
      const summaryUpTo = thread.summarized_up_to_index ?? 0;
      const promptHistory: ChatMessage[] =
        thread.summary && summaryUpTo > 0 && summaryUpTo < history.length
          ? [
              {
                role: "system",
                content: `Summary of earlier conversation: ${thread.summary}`,
              } as ChatMessage,
              ...history.slice(summaryUpTo),
            ]
          : history;

      let messages: ChatMessage[] = [{ role: "system", content: systemContent }, ...promptHistory];

      const toolDefs = toolsForSurface(args.route as ToolSurface);
      const toolsByName = new Map(toolDefs.map((t) => [t.name, t]));
      const openaiTools = toOpenAITools(toolDefs);
      const openai = getOpenAI();

      for (let turn = 0; turn < MAX_TURNS; turn++) {
        // Cooperative cancellation: if runs.cancel was called while we were
        // idle, bail before hitting OpenAI again.
        const currentStatus: string | null = await ctx.runQuery(
          internal.agent.runInternal.getRunStatus,
          { runId: args.runId },
        );
        if (currentStatus === "cancelled") {
          await ctx.runMutation(internal.agent.runInternal.appendMessages, {
            threadId: thread._id,
            runId: args.runId,
            messages: messages.slice(1),
          });
          await ctx.runMutation(internal.agent.runInternal.writeEvent, {
            runId: args.runId,
            threadId: thread._id,
            sequence: nextSeq(),
            type: "run_finished",
            data: { reason: "cancelled" },
          });
          return;
        }

        await ctx.runMutation(internal.agent.runInternal.writeEvent, {
          runId: args.runId,
          threadId: thread._id,
          sequence: nextSeq(),
          type: "step_started",
          data: { turn },
        });

        const stream = await openai.chat.completions.create({
          model: "gpt-4.1",
          messages,
          tools: openaiTools.length > 0 ? openaiTools : undefined,
          stream: true,
          temperature: 0.2,
        });

        await ctx.runMutation(internal.agent.runInternal.writeEvent, {
          runId: args.runId,
          threadId: thread._id,
          sequence: nextSeq(),
          type: "message_started",
          data: { turn },
        });

        let assistantContent = "";
        let contentOpened = false;
        const toolCallAccum: Record<number, PendingToolCall> = {};
        let finishReason: string | null = null;

        for await (const chunk of stream) {
          const choice = chunk.choices[0];
          if (!choice) continue;
          const delta = choice.delta;

          if (delta.content) {
            if (!contentOpened) {
              contentOpened = true;
              await ctx.runMutation(internal.agent.runInternal.writeEvent, {
                runId: args.runId,
                threadId: thread._id,
                sequence: nextSeq(),
                type: "content_started",
                data: { turn },
              });
            }
            assistantContent += delta.content;
            await ctx.runMutation(internal.agent.runInternal.writeEvent, {
              runId: args.runId,
              threadId: thread._id,
              sequence: nextSeq(),
              type: "content_delta",
              data: { text: delta.content },
            });
          }

          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallAccum[idx]) {
                toolCallAccum[idx] = { id: "", name: "", argsJson: "" };
                await ctx.runMutation(internal.agent.runInternal.writeEvent, {
                  runId: args.runId,
                  threadId: thread._id,
                  sequence: nextSeq(),
                  type: "tool_call_started",
                  data: { index: idx, id: tc.id, name: tc.function?.name },
                });
              }
              const slot = toolCallAccum[idx];
              if (tc.id) slot.id = tc.id;
              if (tc.function?.name) slot.name = tc.function.name;
              if (tc.function?.arguments) {
                slot.argsJson += tc.function.arguments;
                await ctx.runMutation(internal.agent.runInternal.writeEvent, {
                  runId: args.runId,
                  threadId: thread._id,
                  sequence: nextSeq(),
                  type: "tool_call_delta",
                  data: { index: idx, argsDelta: tc.function.arguments },
                });
              }
            }
          }

          if (choice.finish_reason) finishReason = choice.finish_reason;
        }

        if (contentOpened) {
          await ctx.runMutation(internal.agent.runInternal.writeEvent, {
            runId: args.runId,
            threadId: thread._id,
            sequence: nextSeq(),
            type: "content_finished",
            data: { turn, text: assistantContent },
          });
        }

        await ctx.runMutation(internal.agent.runInternal.writeEvent, {
          runId: args.runId,
          threadId: thread._id,
          sequence: nextSeq(),
          type: "message_finished",
          data: { turn, finishReason },
        });

        const pendingCalls = Object.values(toolCallAccum).filter((c) => c.id && c.name);

        const assistantMsg: ChatMessage =
          pendingCalls.length > 0
            ? {
                role: "assistant",
                content: assistantContent || null,
                tool_calls: pendingCalls.map((c) => ({
                  id: c.id,
                  type: "function" as const,
                  function: { name: c.name, arguments: c.argsJson || "{}" },
                })),
              }
            : { role: "assistant", content: assistantContent };

        messages = [...messages, assistantMsg];

        if (pendingCalls.length === 0) {
          await ctx.runMutation(internal.agent.runInternal.writeEvent, {
            runId: args.runId,
            threadId: thread._id,
            sequence: nextSeq(),
            type: "step_finished",
            data: { turn, finishReason },
          });
          await ctx.runMutation(internal.agent.runInternal.appendMessages, {
            threadId: thread._id,
            runId: args.runId,
            messages: messages.slice(1),
          });
          await ctx.runMutation(internal.agent.runInternal.patchRunStatus, {
            runId: args.runId,
            status: "completed",
            finishedAt: Date.now(),
          });
          await ctx.runMutation(internal.agent.runInternal.writeEvent, {
            runId: args.runId,
            threadId: thread._id,
            sequence: nextSeq(),
            type: "run_finished",
            data: { finishReason },
          });
          return;
        }

        for (const call of pendingCalls) {
          const def = toolsByName.get(call.name);
          await ctx.runMutation(internal.agent.runInternal.writeEvent, {
            runId: args.runId,
            threadId: thread._id,
            sequence: nextSeq(),
            type: "tool_call_finished",
            data: {
              id: call.id,
              name: call.name,
              arguments: safeParseJson(call.argsJson),
              approvalRequired: requiresApproval(call.name, def?.approvalRequired),
            },
          });
        }

        const approvalNeeded = pendingCalls.filter((c) =>
          requiresApproval(c.name, toolsByName.get(c.name)?.approvalRequired),
        );
        if (approvalNeeded.length > 0) {
          for (const call of approvalNeeded) {
            await ctx.runMutation(internal.agent.runInternal.insertApprovalRequest, {
              runId: args.runId,
              toolCallId: call.id,
              toolName: call.name,
              arguments: safeParseJson(call.argsJson),
              requestedBy: run.user_id,
            });
          }
          await ctx.runMutation(internal.agent.runInternal.appendMessages, {
            threadId: thread._id,
            runId: args.runId,
            messages: messages.slice(1),
          });
          await ctx.runMutation(internal.agent.runInternal.patchRunStatus, {
            runId: args.runId,
            status: "waiting_for_approval",
            pendingToolCalls: pendingCalls,
          });
          await ctx.runMutation(internal.agent.runInternal.writeEvent, {
            runId: args.runId,
            threadId: thread._id,
            sequence: nextSeq(),
            type: "step_finished",
            data: { turn, finishReason: "awaiting_tool_approval" },
          });
          await ctx.runMutation(internal.agent.runInternal.writeEvent, {
            runId: args.runId,
            threadId: thread._id,
            sequence: nextSeq(),
            type: "run_paused",
            data: { reason: "awaiting_tool_approval" },
          });
          return;
        }

        for (const call of pendingCalls) {
          const result = await dispatchTool(
            ctx,
            call.name,
            safeParseJson(call.argsJson),
            call.id,
            args.runId,
          );
          messages = [
            ...messages,
            {
              role: "tool",
              tool_call_id: call.id,
              content: JSON.stringify(result),
            },
          ];
        }

        await ctx.runMutation(internal.agent.runInternal.writeEvent, {
          runId: args.runId,
          threadId: thread._id,
          sequence: nextSeq(),
          type: "step_finished",
          data: { turn, finishReason },
        });
      }

      await ctx.runMutation(internal.agent.runInternal.appendMessages, {
        threadId: thread._id,
        runId: args.runId,
        messages: messages.slice(1),
      });
      await ctx.runMutation(internal.agent.runInternal.patchRunStatus, {
        runId: args.runId,
        status: "failed",
        finishedAt: Date.now(),
      });
      await ctx.runMutation(internal.agent.runInternal.writeEvent, {
        runId: args.runId,
        threadId: thread._id,
        sequence: nextSeq(),
        type: "run_error",
        data: { error: "max_turns_exceeded" },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.runMutation(internal.agent.runInternal.patchRunStatus, {
        runId: args.runId,
        status: "failed",
        finishedAt: Date.now(),
      });
      await ctx.runMutation(internal.agent.runInternal.writeEvent, {
        runId: args.runId,
        threadId: thread._id,
        sequence: nextSeq(),
        type: "run_error",
        data: { error: message },
      });
    }
  },
});

export const resumeAfterApproval = internalAction({
  args: {
    runId: v.id("thread_runs"),
    route: toolSurfaceValidator,
    selection: v.optional(selectionValidator),
    visibleState: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { run, thread } = await ctx.runQuery(internal.agent.runInternal.loadRunContext, {
      runId: args.runId,
    });

    if (run.status !== "waiting_for_approval") {
      throw new Error(`cannot resume run in status ${run.status}`);
    }

    let sequence: number = await ctx.runQuery(internal.agent.runInternal.countEvents, {
      runId: args.runId,
    });
    const nextSeq = () => ++sequence;

    const pending = (run.state?.pending_tool_calls ?? []) as PendingToolCall[];
    const approvals = await ctx.runQuery(internal.agent.runInternal.loadApprovals, {
      runId: args.runId,
    });
    const decisionByToolCallId = new Map(
      approvals.map(
        (a: {
          tool_call_id: string;
          status: string;
          decision_reason?: string;
          submitted_result?: unknown;
        }) =>
          [
            a.tool_call_id,
            {
              status: a.status,
              reason: a.decision_reason,
              submittedResult: a.submitted_result,
            },
          ] as const,
      ),
    );

    let messages = (run.history ?? []) as ChatMessage[];

    for (const call of pending) {
      const decision = decisionByToolCallId.get(call.id);
      let toolContent: string;
      if (decision?.status === "approved") {
        const result =
          decision.submittedResult !== undefined
            ? decision.submittedResult
            : await dispatchTool(ctx, call.name, safeParseJson(call.argsJson), call.id, args.runId);
        toolContent = JSON.stringify(result);
        await ctx.runMutation(internal.agent.runInternal.writeEvent, {
          runId: args.runId,
          threadId: thread._id,
          sequence: nextSeq(),
          type: "tool_call_approved",
          data: { id: call.id, name: call.name },
        });
      } else {
        const reason = decision?.reason?.trim() || "no reason provided";
        toolContent = `Approval denied. Reason: ${reason}`;
        await ctx.runMutation(internal.agent.runInternal.writeEvent, {
          runId: args.runId,
          threadId: thread._id,
          sequence: nextSeq(),
          type: "tool_call_rejected",
          data: { id: call.id, name: call.name, reason },
        });
      }
      messages = [
        ...messages,
        {
          role: "tool",
          tool_call_id: call.id,
          content: toolContent,
        },
      ];
    }

    await ctx.runMutation(internal.agent.runInternal.appendMessages, {
      threadId: thread._id,
      runId: args.runId,
      messages,
    });
    await ctx.runMutation(internal.agent.runInternal.patchRunStatus, {
      runId: args.runId,
      status: "running",
      pendingToolCalls: [],
    });
    await ctx.runMutation(internal.agent.runInternal.writeEvent, {
      runId: args.runId,
      threadId: thread._id,
      sequence: nextSeq(),
      type: "run_resumed",
      data: {},
    });

    await ctx.runAction(internal.agent.runActions.execute, {
      runId: args.runId,
      route: args.route,
      selection: args.selection ?? null,
      visibleState: args.visibleState,
    });
  },
});
