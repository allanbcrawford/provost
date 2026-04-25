"use client";

import { Button } from "@provost/ui";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export function RecapEditor({
  eventId,
  initial,
  canEdit,
}: {
  eventId: Id<"events">;
  initial: string | null;
  canEdit: boolean;
}) {
  const setRecap = useMutation(api.events.setRecap);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Re-sync local state when the event's recap changes upstream.
  useEffect(() => {
    if (!editing) setValue(initial ?? "");
  }, [initial, editing]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await setRecap({ eventId, recap: value.trim() });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save recap.");
    } finally {
      setSaving(false);
    }
  }

  // Read-only renders for everyone (members + admins when not editing).
  if (!editing) {
    if (!initial && !canEdit) return null;
    return (
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-[13px] text-provost-text-secondary uppercase tracking-[1px]">
            Recap
          </h3>
          {canEdit && (
            <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
              {initial ? "Edit" : "Add recap"}
            </Button>
          )}
        </div>
        {initial ? (
          <p className="whitespace-pre-wrap rounded-md border border-provost-border-subtle bg-white p-3 text-[14px] text-provost-text-primary tracking-[-0.42px]">
            {initial}
          </p>
        ) : (
          <p className="text-[13px] text-provost-text-secondary italic tracking-[-0.39px]">
            No recap yet.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="font-medium text-[13px] text-provost-text-secondary uppercase tracking-[1px]">
        Recap
      </h3>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={5}
        className="w-full rounded-md border border-provost-border-subtle bg-white px-3 py-2 text-[14px] text-provost-text-primary tracking-[-0.42px] placeholder:text-provost-text-secondary focus:outline-none focus:ring-2 focus:ring-provost-border-default"
        placeholder="What was decided? Action items, next steps…"
      />
      {error && <p className="text-[12px] text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setEditing(false);
            setValue(initial ?? "");
            setError(null);
          }}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save recap"}
        </Button>
      </div>
    </section>
  );
}
