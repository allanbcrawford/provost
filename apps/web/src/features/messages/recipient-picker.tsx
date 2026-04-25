"use client";

import { Icon } from "@provost/ui";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

type Role = "admin" | "member" | "advisor" | "trustee";

type Contact = {
  _id: Id<"users">;
  name: string;
  email: string;
  role: Role;
  employment_role: string | null;
  kind: "user" | "professional";
};

const ROLE_BADGE: Record<Role, string> = {
  admin: "Admin",
  member: "Member",
  advisor: "Advisor",
  trustee: "Trustee",
};

const ROLE_BADGE_CLASS: Record<Role, string> = {
  admin: "bg-amber-100 text-amber-800",
  member: "bg-slate-100 text-slate-700",
  advisor: "bg-emerald-100 text-emerald-800",
  trustee: "bg-violet-100 text-violet-800",
};

export function RecipientPicker({
  familyId,
  selected,
  onChange,
}: {
  familyId: Id<"families">;
  selected: Contact[];
  onChange: (next: Contact[]) => void;
}) {
  const data = useQuery(api.messages.listMessageableContacts, { familyId });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const all: Contact[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.users.map((u) => ({ ...u, kind: "user" as const })),
      ...data.professionals.map((p) => ({ ...p, kind: "professional" as const })),
    ];
  }, [data]);

  const selectedIds = useMemo(() => new Set(selected.map((c) => c._id)), [selected]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = all.filter((c) => !selectedIds.has(c._id));
    if (q.length === 0) return available.slice(0, 8);
    return available
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          (c.employment_role ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [all, query, selectedIds]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function add(c: Contact) {
    if (selectedIds.has(c._id)) return;
    onChange([...selected, c]);
    setQuery("");
  }

  function remove(id: Id<"users">) {
    onChange(selected.filter((c) => c._id !== id));
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-provost-border-subtle bg-white px-2 py-1.5 focus-within:border-provost-text-primary">
        {selected.map((c) => (
          <span
            key={c._id}
            className="inline-flex items-center gap-1.5 rounded-full bg-provost-bg-muted px-2.5 py-1 text-[12px] text-provost-text-primary tracking-[-0.36px]"
          >
            <span>{c.name}</span>
            <span
              className={`rounded-full px-1.5 py-0.5 font-medium text-[10px] uppercase tracking-wide ${ROLE_BADGE_CLASS[c.role]}`}
            >
              {ROLE_BADGE[c.role]}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                remove(c._id);
              }}
              className="text-provost-text-secondary hover:text-provost-text-primary"
              aria-label={`Remove ${c.name}`}
            >
              <Icon name="close" size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? "Add recipients…" : ""}
          className="min-w-[120px] flex-1 border-0 bg-transparent px-1.5 py-1 text-[14px] text-provost-text-primary tracking-[-0.42px] outline-none placeholder:text-provost-text-secondary"
        />
      </div>

      {open && (
        <div className="absolute top-full right-0 left-0 z-10 mt-1 max-h-[280px] overflow-y-auto rounded-[10px] border border-provost-border-subtle bg-white shadow-lg">
          {data === undefined ? (
            <div className="px-3 py-2 text-[13px] text-provost-text-secondary">Loading…</div>
          ) : matches.length === 0 ? (
            <div className="px-3 py-2 text-[13px] text-provost-text-secondary">
              {query.trim().length > 0 ? "No matches." : "No more recipients."}
            </div>
          ) : (
            <ul>
              {matches.map((c) => (
                <li key={c._id}>
                  <button
                    type="button"
                    onClick={() => add(c)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-provost-bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-[13px] text-provost-text-primary tracking-[-0.39px]">
                        {c.name}
                      </div>
                      <div className="truncate text-[12px] text-provost-text-secondary tracking-[-0.36px]">
                        {c.email}
                        {c.employment_role ? ` · ${c.employment_role}` : ""}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 font-medium text-[10px] uppercase tracking-wide ${ROLE_BADGE_CLASS[c.role]}`}
                    >
                      {ROLE_BADGE[c.role]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export type { Contact as RecipientContact };
