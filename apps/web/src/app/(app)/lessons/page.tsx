"use client";

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@provost/ui";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { useSelectedFamily } from "@/context/family-context";
import type { LessonListItem } from "@/features/lessons/lesson-item";
import { LessonsList } from "@/features/lessons/lessons-list";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

type TabKey = "my" | "fun-facts" | "completed" | "curriculum" | "progress";

const TABS: { key: TabKey; label: string }[] = [
  { key: "my", label: "My Lessons" },
  { key: "fun-facts", label: "Fun Facts" },
  { key: "completed", label: "Completed" },
  { key: "curriculum", label: "Curriculum" },
  { key: "progress", label: "Progress" },
];

function LessonsPage() {
  const family = useSelectedFamily();
  const lessons = useQuery(
    api.lessons.list,
    family ? { familyId: family._id as Id<"families"> } : "skip",
  );
  const [tab, setTab] = useState<TabKey>("my");

  const filtered = useMemo<LessonListItem[]>(() => {
    if (!lessons) return [];
    const list = lessons as LessonListItem[];
    if (tab === "my")
      return list.filter((l) => l.status === "assigned" || l.status === "in_progress");
    if (tab === "completed") return list.filter((l) => l.status === "completed");
    return [];
  }, [lessons, tab]);

  const isLoading = lessons === undefined;

  const emptyMessage =
    tab === "my"
      ? "No lessons in progress. Browse the curriculum to get started."
      : tab === "completed"
        ? "You haven't completed any lessons yet."
        : tab === "fun-facts"
          ? "No family fun facts yet."
          : tab === "curriculum"
            ? "Curriculum management coming soon."
            : "Progress tracking coming soon.";

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-dm-serif text-[42px] font-medium tracking-[-0.84px] text-provost-text-primary">
          Lessons
        </h1>
        <Button
          variant="outline"
          className="h-[35px] rounded-full border-provost-text-primary px-5 text-[15px] font-medium"
        >
          Request new lesson
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="flex flex-col gap-6">
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => (
          <TabsContent key={t.key} value={t.key}>
            {isLoading ? (
              <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">
                Loading lessons…
              </p>
            ) : (
              <LessonsList lessons={filtered} emptyMessage={emptyMessage} />
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

export default withRoleGuard(LessonsPage, APP_ROLES.LESSONS!);
