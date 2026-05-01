"use client";

// Issue 6.1 / PRD §18 — top-left advisor multi-family chip.
//
// Render rules:
//   - Only renders for users with at least one `family_users.role === advisor`
//     membership. We gate by querying `api.advisor.assignedFamiliesSoft`,
//     which returns [] for non-advisors so this component cleanly hides.
//   - When >0 assigned families and either no family selected or aggregate
//     view active, the chip caption reads "N Families".
//   - When a single family is selected the chip falls through to render the
//     selected family's name (matching the legacy header treatment), so the
//     header behavior for family-admin / family-member users is unchanged.
//
// Click behavior:
//   - Opens a dropdown listing every assigned family, with a leading
//     "All Families" item that returns the advisor to aggregate view.
//   - Selecting a family writes the family cookie + localStorage, calls
//     setFamily / setAggregateView on the context, and navigates to /home.

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFamilyContext } from "@/context/family-context";
import { writeFamilyCookie } from "@/lib/family-cookie";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type AssignedFamily = {
  id: Id<"families">;
  name: string;
  memberCount: number;
  lastActivityAt: number;
  pendingObservationCount: number;
};

export function FamilySelectorChip({ fallbackLabel }: { fallbackLabel: string }) {
  const router = useRouter();
  const { family, setFamily, isAggregateView, setAggregateView } = useFamilyContext();
  const assigned = useQuery(api.advisor.assignedFamiliesSoft, {}) as
    | AssignedFamily[]
    | undefined;
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click. Cheap; only mounts the listener while open.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Non-advisor users: hide the chip entirely. Header upstream renders the
  // legacy family-name span instead.
  if (!assigned || assigned.length === 0) {
    return <span className="truncate font-dm-serif text-2xl md:text-[34px]">{fallbackLabel}</span>;
  }

  function pickAll() {
    setAggregateView(true);
    setFamily(null);
    if (typeof window !== "undefined") localStorage.removeItem("selectedFamilyId");
    writeFamilyCookie(null);
    setOpen(false);
    router.push("/home");
  }

  function pickFamily(item: AssignedFamily) {
    setAggregateView(false);
    setFamily({ _id: item.id, name: item.name, myRole: "advisor" });
    if (typeof window !== "undefined") localStorage.setItem("selectedFamilyId", item.id);
    writeFamilyCookie(item.id);
    setOpen(false);
    router.push("/home");
  }

  const chipLabel =
    isAggregateView || !family
      ? `${assigned.length} Famil${assigned.length === 1 ? "y" : "ies"}`
      : fallbackLabel;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex max-w-[300px] items-center gap-1 truncate rounded-lg px-2 py-1 font-dm-serif text-2xl transition-colors hover:bg-provost-bg-secondary md:text-[34px]"
      >
        <span className="truncate">{chipLabel}</span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="#6B6B6B"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 z-50 mt-2 w-[320px] rounded-xl border border-provost-border-subtle bg-white py-2 shadow-lg"
        >
          <button
            type="button"
            onClick={pickAll}
            className={`flex w-full items-center justify-between px-4 py-2 text-left text-[15px] transition-colors hover:bg-provost-bg-secondary ${
              isAggregateView ? "font-semibold" : "font-normal"
            }`}
          >
            <span>All Families</span>
            <span className="text-provost-text-secondary text-xs">{assigned.length} total</span>
          </button>
          <div className="my-1 h-px bg-provost-border-subtle" />
          {assigned.map((item) => {
            const selected = !isAggregateView && family?._id === item.id;
            return (
              <button
                type="button"
                key={item.id}
                onClick={() => pickFamily(item)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-[15px] transition-colors hover:bg-provost-bg-secondary ${
                  selected ? "font-semibold" : "font-normal"
                }`}
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate">{item.name}</span>
                  <span className="text-provost-text-secondary text-xs">
                    {item.memberCount} member{item.memberCount === 1 ? "" : "s"}
                  </span>
                </div>
                {item.pendingObservationCount > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-red-600 px-1.5 text-white text-xs">
                    {item.pendingObservationCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
