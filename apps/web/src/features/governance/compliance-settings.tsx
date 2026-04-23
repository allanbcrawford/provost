"use client";

export function ComplianceSettings() {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-medium text-provost-text-primary">Guardrails</h2>
        <p className="mt-1 text-provost-text-secondary text-sm">
          Configure approval thresholds, prohibited tools, and retention windows.
        </p>
        <p className="mt-3 text-provost-text-muted text-xs">Wired up in Phase 6.</p>
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-medium text-provost-text-primary">Data residency</h2>
        <p className="mt-1 text-provost-text-secondary text-sm">
          Region pinning and export policies.
        </p>
        <p className="mt-3 text-provost-text-muted text-xs">Wired up in Phase 6.</p>
      </div>
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-medium text-provost-text-primary">Audit retention</h2>
        <p className="mt-1 text-provost-text-secondary text-sm">
          How long audit events are retained before archival.
        </p>
        <p className="mt-3 text-provost-text-muted text-xs">Wired up in Phase 6.</p>
      </div>
    </div>
  );
}
