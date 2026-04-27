"use client";

import { Button } from "@provost/ui";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useAuthedFamily } from "@/context/family-context";
import { EventDetail } from "@/features/events/event-detail";
import { EventFormModal } from "@/features/events/event-form-modal";
import { EventsCalendar } from "@/features/events/events-calendar";
import { EventsList } from "@/features/events/events-list";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES, ROLES } from "@/lib/roles";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

type ViewMode = "list" | "calendar";
const VIEW_KEY = "events_view_mode";

function EventsPage() {
  const family = useAuthedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const myRole = family?.myRole;
  const events = useQuery(api.events.list, familyId ? { familyId } : "skip");
  const me = useQuery(api.users.meQuery, {});

  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialStart, setCreateInitialStart] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<Id<"events"> | null>(null);
  const detailOpen = selectedId !== null;
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Load persisted view choice on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(VIEW_KEY);
    if (saved === "list" || saved === "calendar") setViewMode(saved);
  }, []);

  function chooseView(next: ViewMode) {
    setViewMode(next);
    if (typeof window !== "undefined") window.localStorage.setItem(VIEW_KEY, next);
  }

  const canCreate = myRole === ROLES.ADMIN || myRole === ROLES.ADVISOR;
  const canEditRecap = canCreate;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-dm-serif font-medium text-[42px] text-provost-text-primary tracking-[-0.84px]">
          Events
        </h1>
        {canCreate && familyId && (
          <Button
            type="button"
            onClick={() => {
              setCreateInitialStart(null);
              setCreateOpen(true);
            }}
          >
            New event
          </Button>
        )}
      </div>

      <div className="mb-6 flex items-center gap-2">
        <div className="inline-flex rounded-full border border-provost-border-subtle bg-white p-0.5">
          <ViewPill active={viewMode === "list"} onClick={() => chooseView("list")}>
            List
          </ViewPill>
          <ViewPill active={viewMode === "calendar"} onClick={() => chooseView("calendar")}>
            Calendar
          </ViewPill>
        </div>
      </div>

      {viewMode === "list" ? (
        <EventsList events={events ?? null} onSelect={setSelectedId} />
      ) : (
        <EventsCalendar
          events={events ?? null}
          onSelect={setSelectedId}
          onCreateAt={
            canCreate
              ? (ts) => {
                  setCreateInitialStart(ts);
                  setCreateOpen(true);
                }
              : undefined
          }
        />
      )}

      {familyId && (
        <EventFormModal
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) setCreateInitialStart(null);
          }}
          familyId={familyId}
          currentUserId={me?._id ?? null}
          initialStart={createInitialStart}
        />
      )}

      <EventDetail
        eventId={selectedId}
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        canEditRecap={canEditRecap}
      />
    </div>
  );
}

function ViewPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 font-medium text-[13px] transition-colors ${
        active
          ? "bg-provost-bg-inverse text-provost-text-inverse"
          : "text-provost-text-secondary hover:bg-provost-bg-secondary"
      }`}
    >
      {children}
    </button>
  );
}

export default withRoleGuard(EventsPage, APP_ROLES.EVENTS ?? []);
