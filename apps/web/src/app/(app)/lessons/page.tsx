"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@provost/ui";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { useAuthedFamily } from "@/context/family-context";
import { BookmarksGrid } from "@/features/lessons/bookmarks-grid";
import type { LessonListItem } from "@/features/lessons/lesson-item";
import { LessonsList } from "@/features/lessons/lessons-list";
import { ProgramsTree } from "@/features/lessons/programs-tree";
import { ProgressTable } from "@/features/lessons/progress-table";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

// Tabs follow the PRD: My Lessons (default) and Bookmarks for everyone;
// Programs and Progress only for admins / advisors.
type TabKey = "my" | "bookmarks" | "programs" | "progress";

function LessonsPage() {
  const family = useAuthedFamily();
  // Programs and Progress tabs are scoped to roles that maintain or supervise
  // the curriculum — admins, advisors, trustees. Plain members see only the
  // first two tabs.
  const role = family?.myRole;
  const isCurriculumViewer = role === "admin" || role === "advisor" || role === "trustee";

  const familyId = family?._id as Id<"families"> | undefined;
  const activeLessons = useQuery(api.lessons.myActiveLessons, familyId ? { familyId } : "skip");
  const bookmarks = useQuery(api.bookmarks.list, family ? {} : "skip");
  const programsTree = useQuery(
    api.lessons.programsTree,
    familyId && isCurriculumViewer ? { familyId } : "skip",
  );
  const progressRows = useQuery(
    api.lessons.familyProgress,
    familyId && isCurriculumViewer ? { familyId } : "skip",
  );

  const myLessonsForList = useMemo<LessonListItem[]>(() => {
    if (!activeLessons) return [];
    return activeLessons.map((l) => ({
      _id: l._id,
      title: l.title,
      description: l.description,
      category: l.category,
      status: (l.status as LessonListItem["status"]) ?? null,
      slide_index: l.slide_index,
    }));
  }, [activeLessons]);

  const tabs: { key: TabKey; label: string; visible: boolean }[] = [
    { key: "my", label: "My Lessons", visible: true },
    { key: "bookmarks", label: "Bookmarks", visible: true },
    { key: "programs", label: "Programs", visible: isCurriculumViewer },
    { key: "progress", label: "Progress", visible: isCurriculumViewer },
  ];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-dm-serif font-medium text-[42px] text-provost-text-primary tracking-[-0.84px]">
          Lessons
        </h1>
      </div>

      <Tabs defaultValue="my" className="flex flex-col gap-6">
        <TabsList>
          {tabs
            .filter((t) => t.visible)
            .map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
        </TabsList>

        <TabsContent value="my">
          {activeLessons === undefined ? (
            <p className="text-[14px] text-provost-text-secondary tracking-[-0.42px]">Loading…</p>
          ) : (
            <LessonsList
              lessons={myLessonsForList}
              emptyMessage="No active lessons. Provost will recommend ones suited to your stewardship phase."
            />
          )}
        </TabsContent>

        <TabsContent value="bookmarks">
          <BookmarksGrid bookmarks={bookmarks ?? null} />
        </TabsContent>

        {isCurriculumViewer && (
          <TabsContent value="programs">
            <ProgramsTree tree={programsTree ?? null} />
          </TabsContent>
        )}

        {isCurriculumViewer && (
          <TabsContent value="progress">
            <ProgressTable rows={progressRows ?? null} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

export default withRoleGuard(LessonsPage, APP_ROLES.LESSONS ?? []);
