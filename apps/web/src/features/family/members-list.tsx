"use client";

import { Icon } from "@provost/ui";
import { useMutation } from "convex/react";
import { useState } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type LifecycleStatus = "pending" | "invited" | "active" | "dormant" | "suspended";

type Member = {
  _id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string;
  generation: number;
  role: "admin" | "member";
  lifecycle_status?: LifecycleStatus;
};

type Props = {
  members: Member[];
  familyId?: Id<"families">;
};

const LIFECYCLE_PILL: Record<LifecycleStatus, { label: string; className: string } | null> = {
  pending: {
    label: "Pending",
    className: "bg-provost-bg-secondary text-provost-text-secondary",
  },
  invited: {
    label: "Invited",
    className: "bg-provost-bg-secondary text-provost-text-secondary",
  },
  active: null,
  dormant: { label: "Dormant", className: "bg-amber-100 text-amber-800" },
  suspended: { label: "Suspended", className: "bg-red-100 text-red-800" },
};

function formatFullName(m: Member): string {
  const middleInitial = m.middle_name ? `${m.middle_name[0] ?? ""}.` : "";
  return [m.first_name, middleInitial, m.last_name].filter(Boolean).join(" ");
}

function ageFromDob(dob?: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function formatBirthday(dob?: string): string | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function stewardshipLabel(generation: number, age: number | null): string {
  if (age !== null && age < 18) return "Emerging Steward";
  if (generation <= 1) return "Enduring Steward";
  return "Operating Steward";
}

function initials(m: Member): string {
  return `${(m.first_name[0] ?? "").toUpperCase()}${(m.last_name[0] ?? "").toUpperCase()}`;
}

export function MembersList({ members, familyId }: Props) {
  const sorted = [...members].sort((a, b) => {
    if (a.generation !== b.generation) return a.generation - b.generation;
    return a.last_name.localeCompare(b.last_name);
  });
  const role = useUserRole();
  const isAdmin = role === "admin";
  const setLifecycleStatus = useMutation(api.familyUsers.setLifecycleStatus);
  const [pendingFor, setPendingFor] = useState<string | null>(null);

  async function changeStatus(userId: string, status: LifecycleStatus) {
    if (!familyId) return;
    if (status === "suspended") {
      const ok = window.confirm(
        "Suspend this member? They keep the family record but lose access until reinstated.",
      );
      if (!ok) return;
    }
    try {
      setPendingFor(userId);
      await setLifecycleStatus({
        familyId,
        userId: userId as Id<"users">,
        status,
      });
    } finally {
      setPendingFor(null);
    }
  }

  return (
    <div>
      <p className="mb-8 font-light text-[15px] text-provost-text-secondary">
        {members.length} family member{members.length === 1 ? "" : "s"}
      </p>
      <ul className="divide-y divide-provost-border-subtle">
        {sorted.map((m) => {
          const age = ageFromDob(m.date_of_birth);
          const bday = formatBirthday(m.date_of_birth);
          return (
            <li key={m._id} className="flex items-center gap-5 py-6">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-provost-bg-secondary font-medium text-[13px] text-provost-text-secondary tracking-wide">
                {initials(m)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate text-[20px] text-provost-text-primary leading-tight tracking-[-0.4px]">
                  <span className="truncate">{formatFullName(m)}</span>
                  {(() => {
                    const pill = LIFECYCLE_PILL[m.lifecycle_status ?? "active"];
                    if (!pill) return null;
                    return (
                      <span
                        className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-medium text-[10px] uppercase tracking-wide ${pill.className}`}
                      >
                        {pill.label}
                      </span>
                    );
                  })()}
                </p>
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2.5 font-light text-[14px] text-provost-text-secondary">
                  {age !== null && <span>{age}</span>}
                  {bday && (
                    <>
                      <span aria-hidden className="text-provost-text-tertiary">
                        •
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="cake" size={14} weight={200} />
                        {bday}
                      </span>
                    </>
                  )}
                </p>
                {isAdmin && familyId && (
                  <select
                    aria-label="Set lifecycle status"
                    disabled={pendingFor === m._id}
                    value={m.lifecycle_status ?? "active"}
                    onChange={(e) => changeStatus(m._id, e.target.value as LifecycleStatus)}
                    className="mt-2 rounded-md border border-provost-border-subtle bg-white px-2 py-1 text-[12px] text-provost-text-primary"
                  >
                    <option value="pending">Pending</option>
                    <option value="invited">Invited</option>
                    <option value="active">Active</option>
                    <option value="dormant">Dormant</option>
                    <option value="suspended">Suspended</option>
                  </select>
                )}
              </div>

              <div className="hidden w-[200px] shrink-0 md:block">
                <p className="font-medium text-[14px] text-provost-status-pending">
                  Inactive recently
                </p>
                <p className="mt-1 font-light text-[13px] text-provost-text-secondary">
                  Never · visits this week
                </p>
              </div>

              <div className="hidden w-[200px] shrink-0 md:block">
                <p className="text-[16px] text-provost-text-primary tracking-[-0.2px]">
                  {stewardshipLabel(m.generation, age)}
                </p>
                <p className="mt-1 font-light text-[13px] text-provost-text-secondary">
                  No lessons assigned
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-0.5 pl-2">
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-md text-provost-text-secondary transition-colors hover:bg-provost-bg-secondary hover:text-provost-text-primary"
                  aria-label="Send message"
                >
                  <Icon name="edit_square" size={20} weight={200} />
                </button>
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-md text-provost-text-secondary transition-colors hover:bg-provost-bg-secondary hover:text-provost-text-primary"
                  aria-label="Schedule event"
                >
                  <Icon name="event" size={20} weight={200} />
                </button>
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-md text-provost-text-secondary transition-colors hover:bg-provost-bg-secondary hover:text-provost-text-primary"
                  aria-label="Assign lesson"
                >
                  <Icon name="menu_book" size={20} weight={200} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
