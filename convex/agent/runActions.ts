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
    case "form":
      return { ok: true, echo: { tool: toolName, args: toolArgs } };
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
    const { run, thread, familyName } = context;

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

      const systemPrompt = buildSystemPrompt({
        route: args.route,
        familyName: familyName ?? undefined,
        selection: args.selection ?? null,
        visibleState: args.visibleState,
      });

      const history = (run.history ?? []) as ChatMessage[];
      let messages: ChatMessage[] = [{ role: "system", content: systemPrompt }, ...history];

      const toolDefs = toolsForSurface(args.route as ToolSurface);
      const toolsByName = new Map(toolDefs.map((t) => [t.name, t]));
      const openaiTools = toOpenAITools(toolDefs);
      const openai = getOpenAI();

      for (let turn = 0; turn < MAX_TURNS; turn++) {
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
        const toolCallAccum: Record<number, PendingToolCall> = {};
        let finishReason: string | null = null;

        for await (const chunk of stream) {
          const choice = chunk.choices[0];
          if (!choice) continue;
          const delta = choice.delta;

          if (delta.content) {
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
              approvalRequired: def?.approvalRequired ?? false,
            },
          });
        }

        const approvalNeeded = pendingCalls.filter(
          (c) => toolsByName.get(c.name)?.approvalRequired === true,
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
    const decisionByToolCallId = new Map(approvals.map((a) => [a.tool_call_id, a.status] as const));

    let messages = (run.history ?? []) as ChatMessage[];

    for (const call of pending) {
      const decision = decisionByToolCallId.get(call.id);
      let result: unknown;
      if (decision === "approved") {
        result = await dispatchTool(
          ctx,
          call.name,
          safeParseJson(call.argsJson),
          call.id,
          args.runId,
        );
        await ctx.runMutation(internal.agent.runInternal.writeEvent, {
          runId: args.runId,
          threadId: thread._id,
          sequence: nextSeq(),
          type: "tool_call_approved",
          data: { id: call.id, name: call.name },
        });
      } else {
        result = { ok: false, error: "rejected_by_user" };
        await ctx.runMutation(internal.agent.runInternal.writeEvent, {
          runId: args.runId,
          threadId: thread._id,
          sequence: nextSeq(),
          type: "tool_call_rejected",
          data: { id: call.id, name: call.name },
        });
      }
      messages = [
        ...messages,
        {
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
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
