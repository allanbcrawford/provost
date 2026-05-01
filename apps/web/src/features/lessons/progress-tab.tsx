"use client";

// Education > Progress tab. PRO-135 / Issue 3.3.
//
// Layout:
//   1. Stewardship-phase line chart (one line per member, last 90 days).
//   2. Member rows with progress bar + expand chevron.
//   3. Expanded row -> lesson-by-lesson rollup with format icons + status
//      indicators (complete check, stale "i" icon, failed-quiz "i" icon,
//      locked padlock).
//
// Permission gating: handled upstream in lessons/page.tsx via
// `isCurriculumViewer` (admin/advisor/trustee). This component itself
// re-checks `family.myRole` for defense-in-depth, but assumes the parent
// tab is hidden for plain members.

import { cn } from "@provost/ui";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { FormatProgressIcon } from "@/components/lessons/format-progress-icon";
import { LessonStatusOverride } from "@/components/lessons/lesson-status-override";
import { StewardshipPhaseChart } from "@/components/charts/stewardship-phase-chart";

type Props = {
  familyId: Id<"families">;
  canView: boolean;
};

const PHASE_LABEL: Record<string, string> = {
  emerging: "Emerging",
  developing: "Developing",
  operating: "Operating",
  enduring: "Enduring",
};

const PHASE_CHIP: Record<string, string> = {
  emerging: "bg-blue-50 text-blue-800 ring-blue-200",
  developing: "bg-teal-50 text-teal-800 ring-teal-200",
  operating: "bg-amber-50 text-amber-800 ring-amber-200",
  enduring: "bg-violet-50 text-violet-800 ring-violet-200",
};

function PhaseChip({ phase }: { phase: string | null }) {
  if (!phase) {
    return (
      <span className="inline-flex rounded-full bg-provost-bg-muted px-2 py-0.5 font-medium text-[11px] text-provost-text-secondary ring-1 ring-provost-border-subtle">
        No phase
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 font-medium text-[11px] ring-1",
        PHASE_CHIP[phase] ?? "bg-provost-bg-muted text-provost-text-secondary ring-provost-border-subtle",
      )}
    >
      {PHASE_LABEL[phase] ?? phase}
    </span>
  );
}

function MemberAvatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-provost-bg-muted font-medium text-[13px] text-provost-text-primary">
      {initial}
    </span>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="h-1.5 w-40 overflow-hidden rounded-full bg-provost-bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-medium text-[12px] text-provost-text-secondary tracking-[-0.36px]">
        {completed} / {total} lessons
      </span>
    </div>
  );
}

function LessonStatusIndicator({
  status,
  attention,
}: {
  status: "locked" | "active" | "complete" | "advanced";
  attention: {
    reason: "stale" | "failed_quiz" | null;
    daysSinceLastTouch?: number;
    failedAttempts?: number;
  };
}) {
  if (status === "complete" || status === "advanced") {
    return (
      <span
        className="material-symbols-outlined text-emerald-600"
        style={{ fontSize: 22, fontVariationSettings: "'wght' 600, 'FILL' 1" }}
        title="Complete"
        aria-label="Complete"
      >
        check_circle
      </span>
    );
  }
  if (status === "locked") {
    return (
      <span
        className="material-symbols-outlined text-provost-text-secondary"
        style={{ fontSize: 22, fontVariationSettings: "'wght' 500, 'FILL' 0" }}
        title="Locked"
        aria-label="Locked"
      >
        lock
      </span>
    );
  }
  if (attention.reason === "stale") {
    const days = attention.daysSinceLastTouch ?? 0;
    return (
      <span
        className="material-symbols-outlined text-amber-600"
        style={{ fontSize: 22, fontVariationSettings: "'wght' 600, 'FILL' 1" }}
        title={`No activity in ${days} day${days === 1 ? "" : "s"}`}
        aria-label={`No activity in ${days} days`}
      >
        info
      </span>
    );
  }
  if (attention.reason === "failed_quiz") {
    const n = attention.failedAttempts ?? 0;
    return (
      <span
        className="material-symbols-outlined text-amber-600"
        style={{ fontSize: 22, fontVariationSettings: "'wght' 600, 'FILL' 1" }}
        title={`${n} failed quiz attempts`}
        aria-label={`${n} failed quiz attempts`}
      >
        info
      </span>
    );
  }
  return null;
}

function ExpandedMemberRollup({ memberId }: { memberId: Id<"users"> }) {
  const rollup = useQuery(api.lessons.memberLessonRollup, { memberId });
  // Reactive query — overrides re-fetch automatically; no local mutation
  // needed beyond firing the mutation from <LessonStatusOverride>.

  if (rollup === undefined) {
    return (
      <div className="px-5 py-4 text-[13px] text-provost-text-secondary tracking-[-0.39px]">
        Loading lessons…
      </div>
    );
  }
  if (rollup.length === 0) {
    return (
      <div className="px-5 py-4 text-[13px] text-provost-text-secondary tracking-[-0.39px]">
        No lessons assigned to this member yet.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-provost-border-subtle">
      {rollup.map((lesson) => (
        <li key={lesson.lessonId} className="flex items-center gap-4 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-[13px] text-provost-text-primary tracking-[-0.39px]">
              {lesson.lessonTitle}
            </p>
            {lesson.trackTitle && (
              <p className="truncate text-[12px] text-provost-text-secondary tracking-[-0.36px]">
                {lesson.trackTitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <FormatProgressIcon kind="read" progress={lesson.formatProgress.read} size={28} />
            <FormatProgressIcon kind="listen" progress={0} size={28} disabled />
            <FormatProgressIcon kind="watch" progress={0} size={28} disabled />
            <FormatProgressIcon kind="quiz" progress={lesson.formatProgress.quiz} size={28} />
          </div>
          <div className="flex w-7 justify-end">
            <LessonStatusIndicator status={lesson.status} attention={lesson.needsAttention} />
          </div>
          <LessonStatusOverride
            memberId={memberId}
            lessonId={lesson.lessonId}
            currentStatus={lesson.status}
            compact
          />
        </li>
      ))}
    </ul>
  );
}

export function ProgressTab({ familyId, canView }: Props) {
  const [expandedMember, setExpandedMember] = useState<Id<"users"> | null>(null);
  const overview = useQuery(
    api.lessons.familyProgressOverview,
    canView ? { familyId } : "skip",
  );

  if (!canView) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        Progress is visible to family admins and advisors only.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <StewardshipPhaseChart members={overview ?? null} />

      <div className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white">
        {overview === undefined ? (
          <div className="px-5 py-6 text-[14px] text-provost-text-secondary tracking-[-0.42px]">
            Loading members…
          </div>
        ) : overview.length === 0 ? (
          <div className="px-5 py-6 text-[14px] text-provost-text-secondary tracking-[-0.42px]">
            No members yet.
          </div>
        ) : (
          <ul className="divide-y divide-provost-border-subtle">
            {overview.map((m) => {
              const isOpen = expandedMember === m.memberId;
              return (
                <li key={m.memberId}>
                  <button
                    type="button"
                    onClick={() => setExpandedMember(isOpen ? null : m.memberId)}
                    className="flex w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-provost-bg-muted/40"
                    aria-expanded={isOpen}
                  >
                    <MemberAvatar name={m.memberName} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-[14px] text-provost-text-primary tracking-[-0.42px]">
                          {m.memberName}
                        </p>
                        <PhaseChip phase={m.stewardshipPhase} />
                      </div>
                      {m.programName && (
                        <p className="truncate text-[12px] text-provost-text-secondary tracking-[-0.36px]">
                          {m.programName}
                        </p>
                      )}
                    </div>
                    <ProgressBar
                      completed={m.completedLessonCount}
                      total={m.totalLessonCount}
                    />
                    <span
                      className="material-symbols-outlined text-provost-text-secondary transition-transform"
                      style={{
                        fontSize: 22,
                        transform: isOpen ? "rotate(180deg)" : "none",
                      }}
                      aria-hidden="true"
                    >
                      expand_more
                    </span>
                  </button>
                  {isOpen && (
                    <div className="border-provost-border-subtle border-t bg-provost-bg-secondary/40">
                      <ExpandedMemberRollup memberId={m.memberId} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
