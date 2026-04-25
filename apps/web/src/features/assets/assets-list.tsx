"use client";

import { Button, Icon } from "@provost/ui";
import { Fragment, useState } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import { APP_ROLES, type Role } from "@/lib/roles";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { AssetFormModal } from "./asset-form-modal";

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

export interface AssetsListProps {
  assets: Doc<"assets">[] | null;
  familyId?: Id<"families">;
}

export function AssetsList({ assets, familyId }: AssetsListProps) {
  const role = useUserRole();
  const allowedRoles = APP_ROLES.ASSETS ?? [];
  const canAdd = Boolean(familyId) && role !== null && allowedRoles.includes(role as Role);
  const [addOpen, setAddOpen] = useState(false);

  const header = canAdd ? (
    <div className="flex items-center justify-between">
      <h2 className="font-medium text-[18px] text-provost-text-primary tracking-[-0.54px]">
        Holdings
      </h2>
      <Button type="button" size="sm" onClick={() => setAddOpen(true)}>
        <Icon name="add" size={16} weight={400} className="mr-1" />
        Add asset
      </Button>
    </div>
  ) : null;

  let body: React.ReactNode;
  if (assets === null) {
    body = <p className="text-[14px] text-provost-text-secondary tracking-[-0.42px]">Loading…</p>;
  } else if (assets.length === 0) {
    body = (
      <div className="rounded-[14px] border border-provost-border-subtle border-dashed bg-white p-8 text-center text-[14px] text-provost-text-secondary tracking-[-0.42px]">
        No assets in this view.
      </div>
    );
  } else {
    body = (
      <ul className="overflow-hidden rounded-[14px] border border-provost-border-subtle bg-white">
        {assets.map((a, i) => (
          <Fragment key={a._id}>
            {i > 0 && <li aria-hidden className="h-px bg-provost-border-subtle" />}
            <li className="flex items-center gap-5 px-5 py-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-provost-bg-muted text-provost-text-secondary">
                <Icon name="account_balance" size={20} weight={300} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-[16px] text-provost-text-primary tracking-[-0.48px]">
                  {a.name}
                </div>
                <div className="mt-0.5 text-[12px] text-provost-text-secondary tracking-[-0.36px]">
                  {a.type} · as of {a.as_of_date}
                </div>
              </div>
              <div className="text-right font-medium text-[16px] text-provost-text-primary tracking-[-0.48px]">
                {formatCurrency(a.value, a.currency)}
              </div>
            </li>
          </Fragment>
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {header}
      {body}
      {canAdd && familyId ? (
        <AssetFormModal open={addOpen} onOpenChange={setAddOpen} familyId={familyId} />
      ) : null}
    </div>
  );
}
