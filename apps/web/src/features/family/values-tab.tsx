"use client";

import { Icon, Markdown } from "@provost/ui";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// Issue 6.2 — Values tab. Markdown read view with admin/advisor edit mode.

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

export function FamilyValuesTab({ familyId }: { familyId?: Id<"families"> }) {
  const data = useQuery(
    api.familyHistory.getValuesStatement,
    familyId ? { familyId } : "skip",
  );
  const update = useMutation(api.familyHistory.updateValuesStatement);
  const role = useUserRole();
  const canEdit = role === "admin" || role === "advisor";

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data && !editing) setDraft(data.statement ?? "");
  }, [data, editing]);

  if (!familyId || data === undefined) {
    return (
      <div className="p-8 text-[13px] text-provost-text-secondary">Loading values…</div>
    );
  }

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      await update({ familyId, statement: draft });
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = () => {
    setDraft(data.statement ?? "");
    setEditing(false);
    setError(null);
  };

  // Edit mode.
  if (editing && canEdit) {
    return (
      <div className="p-8">
        <h2 className="mb-2 font-dm-serif text-[24px] text-provost-text-primary">
          Family Values
        </h2>
        <p className="mb-4 font-light text-[13px] text-provost-text-secondary">
          Markdown supported. This statement guides Provost's recommendations.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={16}
          className="w-full rounded-lg border border-provost-border-subtle bg-white p-4 font-light text-[14px] text-provost-text-primary outline-none focus:border-provost-border-strong"
          placeholder="What does your family stand for?"
        />
        {error ? (
          <p className="mt-2 text-[12px] text-red-600">{error}</p>
        ) : null}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-provost-text-primary px-4 py-2 font-medium text-[13px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg border border-provost-border-subtle px-4 py-2 font-medium text-[13px] text-provost-text-secondary transition-colors hover:border-provost-border-strong hover:text-provost-text-primary disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // Empty state.
  if (!data.statement) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 py-16">
        <Icon name="favorite" size={48} weight={200} className="text-provost-text-tertiary" />
        <h2 className="mt-4 font-dm-serif text-[24px] text-provost-text-primary">
          Define what your family stands for
        </h2>
        <p className="mt-3 max-w-md text-center font-light text-[14px] text-provost-text-secondary">
          This statement guides Provost's recommendations and shapes how the AI assistant relates
          to your family.
        </p>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg border border-provost-border-strong px-4 py-2 font-medium text-[13px] text-provost-text-primary transition-colors hover:bg-provost-bg-secondary"
          >
            <Icon name="edit" size={16} weight={300} />
            Write your values statement
          </button>
        ) : null}
      </div>
    );
  }

  // Read mode.
  return (
    <div className="p-8">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="font-dm-serif text-[28px] text-provost-text-primary">Family Values</h2>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-md border border-provost-border-subtle px-3 py-1.5 font-light text-[12px] text-provost-text-secondary transition-colors hover:border-provost-border-strong hover:text-provost-text-primary"
          >
            <Icon name="edit" size={14} weight={300} />
            Edit
          </button>
        ) : null}
      </div>
      <Markdown>{data.statement}</Markdown>
      {data.updated_at ? (
        <p className="mt-6 font-light text-[11px] text-provost-text-tertiary">
          Last updated
          {data.updated_by_name ? ` by ${data.updated_by_name}` : ""}
          {" on "}
          {DATE_FORMATTER.format(new Date(data.updated_at))}
        </p>
      ) : null}
    </div>
  );
}
