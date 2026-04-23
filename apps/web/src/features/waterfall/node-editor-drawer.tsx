"use client";

import { useEffect, useState } from "react";
import {
  type ChildrenPct,
  type CustomEdits,
  DEFAULT_CHILDREN_PCT,
  DEFAULT_TRUST_B_FUNDING,
  type DeathOrder,
  type EditableNodeId,
} from "./types";

type Props = {
  editing: EditableNodeId | null;
  customEdits: CustomEdits;
  onClose: () => void;
  onApply: (next: CustomEdits) => void;
  onResetForNode: (node: EditableNodeId) => void;
};

export function NodeEditorDrawer({
  editing,
  customEdits,
  onClose,
  onApply,
  onResetForNode,
}: Props) {
  if (!editing) return null;

  const title =
    editing === "david"
      ? "David Williams"
      : editing === "jennifer"
        ? "Jennifer Williams"
        : editing === "michael"
          ? "Michael Williams"
          : editing === "trustB"
            ? "Family Trust (B)"
            : "First Death Event";
  const subheading =
    editing === "trustB"
      ? "Bypass funding"
      : editing === "firstDeath"
        ? "Scenario trigger"
        : "Beneficiary share";

  return (
    <aside className="pointer-events-auto absolute top-4 right-4 bottom-4 z-20 flex w-[340px] flex-col overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-provost-border-subtle border-b px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-[#6d28d9] text-[10px] uppercase tracking-wider">
            Editing node
          </p>
          <h3 className="mt-0.5 font-dm-serif text-[16px] text-provost-text-primary leading-tight">
            {title}
          </h3>
          <p className="text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
            {subheading}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close editor"
          className="flex size-7 items-center justify-center rounded-full text-provost-text-secondary hover:bg-provost-bg-muted"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {editing === "david" || editing === "jennifer" || editing === "michael" ? (
          <ChildEditor
            key={editing}
            who={editing}
            customEdits={customEdits}
            onApply={onApply}
            onClose={onClose}
            onResetForNode={onResetForNode}
          />
        ) : editing === "trustB" ? (
          <TrustBEditor
            key="trustB"
            customEdits={customEdits}
            onApply={onApply}
            onClose={onClose}
            onResetForNode={onResetForNode}
          />
        ) : (
          <FirstDeathEditor
            key="firstDeath"
            customEdits={customEdits}
            onApply={onApply}
            onClose={onClose}
            onResetForNode={onResetForNode}
          />
        )}
      </div>
    </aside>
  );
}

function ChildEditor({
  who,
  customEdits,
  onApply,
  onClose,
  onResetForNode,
}: {
  who: "david" | "jennifer" | "michael";
  customEdits: CustomEdits;
  onApply: (next: CustomEdits) => void;
  onClose: () => void;
  onResetForNode: (node: EditableNodeId) => void;
}) {
  const starting = customEdits.childrenPct ?? DEFAULT_CHILDREN_PCT;
  const [pct, setPct] = useState<number>(starting[who]);
  const [rebalance, setRebalance] = useState<boolean>(true);

  useEffect(() => {
    setPct(starting[who]);
  }, [who, starting]);

  const preview = computePreview(starting, who, pct, rebalance);

  return (
    <>
      <p className="mb-1.5 block font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
        Beneficiary share
      </p>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="flex-1 accent-[#6d28d9]"
          aria-label={`${who} percentage`}
        />
        <div className="flex items-center gap-1 rounded-[8px] border border-provost-border-subtle bg-white px-2 py-1">
          <input
            type="number"
            min={0}
            max={100}
            value={pct}
            onChange={(e) => setPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            className="w-12 bg-transparent text-right font-semibold text-[13px] text-provost-text-primary focus:outline-none"
          />
          <span className="text-[12px] text-provost-text-secondary">%</span>
        </div>
      </div>

      <label className="mb-4 flex cursor-pointer items-center gap-2 text-[12.5px] text-provost-text-primary">
        <input
          type="checkbox"
          checked={rebalance}
          onChange={(e) => setRebalance(e.target.checked)}
          className="size-4 accent-[#6d28d9]"
        />
        Auto-rebalance siblings
      </label>

      <div className="mb-4 rounded-[10px] border border-provost-border-subtle bg-provost-bg-muted p-3">
        <p className="mb-1.5 font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
          Preview
        </p>
        <ul className="space-y-1 text-[12.5px]">
          <li className="flex justify-between">
            <span>David</span>
            <span className="font-semibold">{preview.david}%</span>
          </li>
          <li className="flex justify-between">
            <span>Jennifer</span>
            <span className="font-semibold">{preview.jennifer}%</span>
          </li>
          <li className="flex justify-between">
            <span>Michael</span>
            <span className="font-semibold">{preview.michael}%</span>
          </li>
          <li className="mt-1.5 flex justify-between border-provost-border-subtle border-t pt-1.5 text-[11.5px] text-provost-text-secondary">
            <span>Total</span>
            <span>{preview.david + preview.jennifer + preview.michael}%</span>
          </li>
        </ul>
      </div>

      <p className="mb-4 rounded-[8px] bg-[#fffbeb] px-3 py-2 text-[#7a5a1e] text-[11.5px] leading-relaxed">
        Drafts as an amendment to the Living Trust distribution provisions. Apply changes sends this
        to the draft-revision pipeline.
      </p>

      <Footer
        onReset={() => {
          onResetForNode(who);
          onClose();
        }}
        onApply={() => {
          onApply({ ...customEdits, childrenPct: preview });
          onClose();
        }}
      />
    </>
  );
}

function computePreview(
  starting: ChildrenPct,
  who: "david" | "jennifer" | "michael",
  newVal: number,
  rebalance: boolean,
): ChildrenPct {
  if (!rebalance) {
    return { ...starting, [who]: newVal } as ChildrenPct;
  }
  const others = (["david", "jennifer", "michael"] as const).filter((k) => k !== who) as [
    "david" | "jennifer" | "michael",
    "david" | "jennifer" | "michael",
  ];
  const [o1, o2] = others;
  const originalOther = starting[o1] + starting[o2];
  const remaining = Math.max(0, 100 - newVal);
  const next: ChildrenPct = { ...starting, [who]: newVal } as ChildrenPct;
  if (originalOther === 0) {
    next[o1] = Math.round(remaining / 2);
    next[o2] = remaining - next[o1];
  } else {
    const a = Math.round((starting[o1] / originalOther) * remaining);
    next[o1] = a;
    next[o2] = remaining - a;
  }
  return next;
}

function TrustBEditor({
  customEdits,
  onApply,
  onClose,
  onResetForNode,
}: {
  customEdits: CustomEdits;
  onApply: (next: CustomEdits) => void;
  onClose: () => void;
  onResetForNode: (node: EditableNodeId) => void;
}) {
  const starting = customEdits.trustBFunding ?? DEFAULT_TRUST_B_FUNDING;
  const [amount, setAmount] = useState<number>(starting);

  return (
    <>
      <p className="mb-1.5 block font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
        Funding amount ($M)
      </p>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={15}
          step={0.1}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="flex-1 accent-[#6d28d9]"
          aria-label="Trust B funding"
        />
        <div className="flex items-center gap-1 rounded-[8px] border border-provost-border-subtle bg-white px-2 py-1">
          <span className="text-[12px] text-provost-text-secondary">$</span>
          <input
            type="number"
            min={0}
            max={15}
            step={0.1}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Math.min(15, Number(e.target.value) || 0)))}
            className="w-14 bg-transparent text-right font-semibold text-[13px] text-provost-text-primary focus:outline-none"
          />
          <span className="text-[12px] text-provost-text-secondary">M</span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <QuickPick
          label="Full exemption"
          sub="$7.0M"
          active={amount === 7.0}
          onClick={() => setAmount(7.0)}
        />
        <QuickPick
          label="Minimal"
          sub="$0.5M"
          active={amount === 0.5}
          onClick={() => setAmount(0.5)}
        />
        <QuickPick label="Max" sub="$15M" active={amount === 15} onClick={() => setAmount(15)} />
      </div>

      <p className="mb-4 rounded-[8px] bg-[#fffbeb] px-3 py-2 text-[#7a5a1e] text-[11.5px] leading-relaxed">
        The bypass trust captures up to the federal exemption at first death. Portability elections
        shift this to $0.5M and port unused exemption to the surviving spouse instead.
      </p>

      <Footer
        onReset={() => {
          onResetForNode("trustB");
          onClose();
        }}
        onApply={() => {
          onApply({ ...customEdits, trustBFunding: amount });
          onClose();
        }}
      />
    </>
  );
}

function QuickPick({
  label,
  sub,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex flex-col items-start rounded-[8px] border px-2.5 py-1.5 text-left",
        active
          ? "border-[#6d28d9] bg-[#ede4ff] text-[#6d28d9]"
          : "border-provost-border-subtle bg-white text-provost-text-primary hover:bg-provost-bg-muted",
      ].join(" ")}
    >
      <span className="font-semibold text-[11px] uppercase tracking-wide">{label}</span>
      <span className="text-[11px]">{sub}</span>
    </button>
  );
}

function FirstDeathEditor({
  customEdits,
  onApply,
  onClose,
  onResetForNode,
}: {
  customEdits: CustomEdits;
  onApply: (next: CustomEdits) => void;
  onClose: () => void;
  onResetForNode: (node: EditableNodeId) => void;
}) {
  const starting = customEdits.deathOrder ?? "robert-first";
  const [order, setOrder] = useState<DeathOrder>(starting);

  const options: Array<{ key: DeathOrder; title: string; detail: string }> = [
    {
      key: "robert-first",
      title: "Robert first, then Linda",
      detail: "Current planning assumption — Linda becomes the surviving spouse.",
    },
    {
      key: "linda-first",
      title: "Linda first, then Robert",
      detail:
        "Inverse scenario — Robert becomes the surviving spouse. Linda's exemption would port.",
    },
    {
      key: "simultaneous",
      title: "Simultaneous (common accident)",
      detail:
        "No surviving-spouse provisions apply. Estate passes directly to children per the Living Trust default.",
    },
  ];

  return (
    <>
      <p className="mb-2 font-semibold text-[10.5px] text-provost-text-tertiary uppercase tracking-wider">
        Who passes away first?
      </p>
      <div className="mb-4 space-y-2">
        {options.map((o) => {
          const active = order === o.key;
          return (
            <label
              key={o.key}
              className={[
                "flex cursor-pointer items-start gap-2.5 rounded-[10px] border px-3 py-2.5",
                active ? "border-[#6d28d9] bg-[#faf5ff]" : "border-provost-border-subtle bg-white",
              ].join(" ")}
            >
              <input
                type="radio"
                name="death-order"
                value={o.key}
                checked={active}
                onChange={() => setOrder(o.key)}
                className="mt-0.5 accent-[#6d28d9]"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[12.5px] text-provost-text-primary">
                  {o.title}
                </span>
                <span className="block text-[11.5px] text-provost-text-secondary leading-relaxed">
                  {o.detail}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      <p className="mb-4 rounded-[8px] bg-[#fffbeb] px-3 py-2 text-[#7a5a1e] text-[11.5px] leading-relaxed">
        Changing the death order re-evaluates which spouse's exemption gets consumed by the bypass
        trust and which trusts qualify for the marital deduction.
      </p>

      <Footer
        onReset={() => {
          onResetForNode("firstDeath");
          onClose();
        }}
        onApply={() => {
          onApply({ ...customEdits, deathOrder: order });
          onClose();
        }}
      />
    </>
  );
}

function Footer({ onReset, onApply }: { onReset: () => void; onApply: () => void }) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2 border-provost-border-subtle border-t pt-3">
      <button
        type="button"
        onClick={onReset}
        className="rounded-[8px] border border-provost-border-subtle bg-white px-3 py-1.5 font-medium text-[12px] text-provost-accent-red hover:bg-provost-bg-muted"
      >
        Reset to default
      </button>
      <button
        type="button"
        onClick={onApply}
        className="rounded-[8px] bg-[#1d4a35] px-3 py-1.5 font-medium text-[12px] text-white hover:bg-[#163a29]"
      >
        Apply changes
      </button>
    </div>
  );
}
