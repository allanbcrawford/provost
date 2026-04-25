"use client";

import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@provost/ui";
import { useQuery } from "convex/react";
import { useState } from "react";
import { useSelectedFamily } from "@/context/family-context";
import { EventDetail } from "@/features/events/event-detail";
import { EventFormModal } from "@/features/events/event-form-modal";
import { EventsCalendar } from "@/features/events/events-calendar";
import { EventsList } from "@/features/events/events-list";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES, ROLES } from "@/lib/roles";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

function EventsPage() {
  const family = useSelectedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const myRole = family?.myRole;
  const events = useQuery(api.events.list, familyId ? { familyId } : "skip");
  const me = useQuery(api.users.meQuery, {});

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<Id<"events"> | null>(null);
  const detailOpen = selectedId !== null;

  const canCreate = myRole === ROLES.ADMIN || myRole === ROLES.ADVISOR;
  const canEditRecap = canCreate;

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-dm-serif font-medium text-[42px] text-provost-text-primary tracking-[-0.84px]">
          Events
        </h1>
        {canCreate && familyId && (
          <Button type="button" onClick={() => setCreateOpen(true)}>
            New event
          </Button>
        )}
      </div>

      <Tabs defaultValue="list" className="flex flex-col gap-6">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <EventsList events={events ?? null} onSelect={setSelectedId} />
        </TabsContent>
        <TabsContent value="calendar">
          <EventsCalendar events={events ?? null} onSelect={setSelectedId} />
        </TabsContent>
      </Tabs>

      {familyId && (
        <EventFormModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          familyId={familyId}
          currentUserId={me?._id ?? null}
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

export default withRoleGuard(EventsPage, APP_ROLES.EVENTS ?? []);
