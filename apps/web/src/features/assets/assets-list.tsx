"use client";

import { Icon } from "@provost/ui";
import { Fragment } from "react";
import type { Doc } from "../../../../../convex/_generated/dataModel";

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export function AssetsList({ assets }: { assets: Doc<"assets">[] | null }) {
  if (assets === null) {
    return <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">Loading…</p>;
  }
  if (assets.length === 0) {
    return (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] tracking-[-0.42px] text-provost-text-secondary">
        No assets in this view.
      </div>
    );
  }
  return (
    <ul className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white">
      {assets.map((a, i) => (
        <Fragment key={a._id}>
          {i > 0 && <li aria-hidden className="h-px bg-provost-border-subtle" />}
          <li className="flex items-center gap-5 px-5 py-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-provost-bg-muted text-provost-text-secondary">
              <Icon name="account_balance" size={20} weight={300} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-medium tracking-[-0.48px] text-provost-text-primary">
                {a.name}
              </div>
              <div className="mt-0.5 text-[12px] tracking-[-0.36px] text-provost-text-secondary">
                {a.type} · as of {a.as_of_date}
              </div>
            </div>
            <div className="text-right text-[16px] font-medium tracking-[-0.48px] text-provost-text-primary">
              {formatCurrency(a.value, a.currency)}
            </div>
          </li>
        </Fragment>
      ))}
    </ul>
  );
}
