import type { RunEvent } from "@provost/schemas/runs";
import { applyEvents, type ThreadState } from "@/entities/threads/thread";
import { groupByTurn, type Turn } from "@/entities/turn/turn";

export function getTurnsFromThread(thread: ThreadState, events?: RunEvent[]): Turn[] {
  const state = events && events.length > 0 ? applyEvents(thread, events) : thread;
  return groupByTurn(state.messages);
}
