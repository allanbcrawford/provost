"use client";

import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { useSelectedFamily } from "@/context/family-context";
import { LessonsList } from "@/features/lessons/lessons-list";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

type TabKey = "my" | "all" | "completed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "my", label: "My Lessons" },
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
];

function LessonsPage() {
  const family = useSelectedFamily();
  const lessons = useQuery(
    api.lessons.list,
    family ? { familyId: family._id as Id<"families"> } : "skip",
  );
  const [tab, setTab] = useState<TabKey>("my");

  const filtered = useMemo(() => {
    if (!lessons) return [];
    if (tab === "my")
      return lessons.filter((l) => l.status === "assigned" || l.status === "in_progress");
    if (tab === "completed") return lessons.filter((l) => l.status === "completed");
    return lessons;
  }, [lessons, tab]);

  const isLoading = lessons === undefined;

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-semibold text-2xl text-neutral-900">Lessons</h1>
      </div>

      <div className="mb-6 flex gap-1 border-neutral-200 border-b">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={[
              "-mb-px border-b-2 px-4 py-2 text-sm transition-colors",
              tab === t.key
                ? "border-neutral-900 font-medium text-neutral-900"
                : "border-transparent text-neutral-600 hover:text-neutral-900",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-neutral-500 text-sm">Loading lessons…</p>
      ) : (
        <LessonsList
          lessons={filtered}
          emptyMessage={
            tab === "my"
              ? "No lessons in progress. Check the All tab to browse the curriculum."
              : tab === "completed"
                ? "You haven't completed any lessons yet."
                : "No lessons available."
          }
        />
      )}
    </div>
  );
}

export default withRoleGuard(LessonsPage, APP_ROLES.LESSONS!);
