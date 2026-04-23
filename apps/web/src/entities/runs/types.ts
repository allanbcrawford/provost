export type {
  RunEvent,
  WidgetPayload,
} from "@provost/schemas/runs";

import type { RunEvent } from "@provost/schemas/runs";

export type RunStatus = "idle" | "streaming" | "paused";

export type RunEventOfType<T extends RunEvent["type"]> = Extract<RunEvent, { type: T }>;
