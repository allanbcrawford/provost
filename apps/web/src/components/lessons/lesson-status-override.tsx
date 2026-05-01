"use client";

// Advisor / admin manual unlock surface for member lesson rollups. Wraps
// the `lessons.setLessonStatusForMember` mutation in a small dropdown that
// can be dropped into the (forthcoming, Issue 3.3) ProgressTab cells without
// the importer needing to know about the audit + role-gating semantics.
//
// Renders a trigger button labeled with the current status; clicking it
// reveals the four allowed statuses (locked / active / complete / advanced).
// Selecting a status fires the mutation and writes a
// `lesson.status.advisor_override` audit event server-side. On error, the
// trigger label flips to "Failed — retry" briefly, then reverts.

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Icon,
} from "@provost/ui";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export type LessonStatus = "locked" | "active" | "complete" | "advanced";

const STATUSES: ReadonlyArray<{ value: LessonStatus; label: string }> = [
  { value: "locked", label: "Locked" },
  { value: "active", label: "Active" },
  { value: "complete", label: "Complete" },
  { value: "advanced", label: "Advanced" },
];

type LessonStatusOverrideProps = {
  memberId: Id<"users">;
  lessonId: Id<"lessons">;
  currentStatus: LessonStatus | string | null;
  onChanged?: (next: LessonStatus) => void;
  // Compact rendering for tables — drops the leading icon + smaller padding.
  compact?: boolean;
};

function statusLabel(status: LessonStatus | string | null): string {
  if (!status) return "Locked";
  const found = STATUSES.find((s) => s.value === status);
  if (found) return found.label;
  // Legacy aliases — show the canonical equivalent so the trigger label
  // stays readable while the migration is in flight.
  if (status === "assigned" || status === "in_progress") return "Active";
  if (status === "completed") return "Complete";
  return status;
}

export function LessonStatusOverride({
  memberId,
  lessonId,
  currentStatus,
  onChanged,
  compact = false,
}: LessonStatusOverrideProps) {
  const setStatus = useMutation(api.lessons.setLessonStatusForMember);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function handleSelect(status: LessonStatus) {
    if (pending) return;
    setError(false);
    setPending(true);
    try {
      await setStatus({ memberId, lessonId, status });
      onChanged?.(status);
    } catch {
      setError(true);
      window.setTimeout(() => setError(false), 2500);
    } finally {
      setPending(false);
    }
  }

  const triggerLabel = error
    ? "Failed — retry"
    : pending
      ? "Saving…"
      : statusLabel(currentStatus);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "md"}
          aria-label={`Override lesson status (current: ${statusLabel(currentStatus)})`}
        >
          {!compact && <Icon name="tune" size={14} />}
          <span className={compact ? "" : "ml-1"}>{triggerLabel}</span>
          <Icon name="expand_more" size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Override status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {STATUSES.map((s) => (
          <DropdownMenuItem
            key={s.value}
            onSelect={() => {
              void handleSelect(s.value);
            }}
            disabled={pending}
          >
            {s.label}
            {currentStatus === s.value && (
              <Icon name="check" size={14} className="ml-auto" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
