"use client";

import { type CustomEdits, DEFAULT_CHILDREN_PCT, type RevisionState } from "./types";

type DeltaItem = {
  label: string;
  detail: string;
  custom?: boolean;
  resetKey?: keyof CustomEdits;
};

function buildDeltas(revisions: RevisionState, custom: CustomEdits): DeltaItem[] {
  const out: DeltaItem[] = [];
  if (revisions.fundRevocable) {
    out.push({
      label: "Revocable Trust funded",
      detail: "Portfolio + residence retitled into the trust — no probate on first death.",
    });
  }
  if (revisions.ilit) {
    out.push({
      label: "ILIT adds $15M bypass",
      detail:
        "Life insurance proceeds flow directly to David / Jennifer / Michael outside the estate.",
    });
  }
  if (revisions.buysell) {
    out.push({
      label: "Buy-sell funds Family Trust",
      detail: "Williams Holdings converts to $12M cash on first death, feeding Trust B.",
    });
  }
  if (revisions.portability) {
    out.push({
      label: "Portability takes over for Trust B",
      detail: "Trust B funded minimally; Robert's unused exemption ports to Linda.",
    });
  }
  if (revisions.qtip) {
    out.push({
      label: "Trust C locked via QTIP election",
      detail: "Terminal beneficiaries of the Marital Trust fixed — no drift at second death.",
    });
  }
  if (custom.childrenPct) {
    const p = custom.childrenPct;
    out.push({
      label: `Children redistribution: ${p.david}/${p.jennifer}/${p.michael}`,
      detail: `Adjusted from default ${DEFAULT_CHILDREN_PCT.david}/${DEFAULT_CHILDREN_PCT.jennifer}/${DEFAULT_CHILDREN_PCT.michael}.`,
      custom: true,
      resetKey: "childrenPct",
    });
  }
  if (custom.trustBFunding !== undefined) {
    out.push({
      label: `Trust B custom funding: $${custom.trustBFunding.toFixed(1)}M`,
      detail: "Overrides the default exemption-funded amount.",
      custom: true,
      resetKey: "trustBFunding",
    });
  }
  if (custom.deathOrder) {
    const label =
      custom.deathOrder === "robert-first"
        ? "Robert → Linda"
        : custom.deathOrder === "linda-first"
          ? "Linda → Robert"
          : "Simultaneous";
    out.push({
      label: `Death order: ${label}`,
      detail: "Scenario trigger changed — surviving-spouse provisions re-evaluate.",
      custom: true,
      resetKey: "deathOrder",
    });
  }
  return out;
}

type Props = {
  revisions: RevisionState;
  customEdits: CustomEdits;
  onResetCustom: (key: keyof CustomEdits) => void;
};

export function DeltaSummary({ revisions, customEdits, onResetCustom }: Props) {
  const deltas = buildDeltas(revisions, customEdits);
  return (
    <div className="rounded-[12px] border border-provost-border-subtle bg-provost-bg-muted px-5 py-4">
      <p className="mb-2 font-dm-serif text-[16px] text-provost-text-primary leading-tight">
        What changes in the inheritance flow
      </p>
      {deltas.length === 0 ? (
        <p className="text-[12.5px] text-provost-text-secondary">
          Toggle a revision above to see how the waterfall redraws.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {deltas.map((d, i) => (
            <li key={i} className="flex items-start gap-2 text-[12.5px]">
              <span className="mt-1 block size-1.5 shrink-0 rounded-full bg-provost-text-secondary" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-provost-text-primary">{d.label}</span>
                  {d.custom && (
                    <span className="inline-flex items-center rounded-full bg-[#ede4ff] px-1.5 py-0.5 font-semibold text-[#6d28d9] text-[9.5px] uppercase tracking-wider">
                      Custom
                    </span>
                  )}
                  {d.custom && d.resetKey && (
                    <button
                      type="button"
                      onClick={() => d.resetKey && onResetCustom(d.resetKey)}
                      className="text-[10.5px] text-provost-text-tertiary underline hover:text-provost-text-secondary"
                    >
                      Reset
                    </button>
                  )}
                </span>
                <span className="block text-[11.5px] text-provost-text-secondary">{d.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
