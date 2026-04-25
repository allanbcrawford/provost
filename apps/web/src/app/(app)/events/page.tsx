"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@provost/ui";
import { useQuery } from "convex/react";
import { useSelectedFamily } from "@/context/family-context";
import { EventsCalendar } from "@/features/events/events-calendar";
import { EventsList } from "@/features/events/events-list";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

function EventsPage() {
  const family = useSelectedFamily();
  const familyId = family?._id as Id<"families"> | undefined;
  const events = useQuery(api.events.list, familyId ? { familyId } : "skip");

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-dm-serif text-[42px] font-medium tracking-[-0.84px] text-provost-text-primary">
          Events
        </h1>
      </div>

      <Tabs defaultValue="calendar" className="flex flex-col gap-6">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="list">List</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <EventsCalendar events={events ?? null} />
        </TabsContent>
        <TabsContent value="list">
          <EventsList events={events ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default withRoleGuard(EventsPage, APP_ROLES.EVENTS!);
