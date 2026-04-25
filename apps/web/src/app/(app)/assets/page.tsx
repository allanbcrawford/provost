"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { useSelectedFamily } from "@/context/family-context";
import { AssetsList } from "@/features/assets/assets-list";
import { AssetsSummary } from "@/features/assets/assets-summary";
import { TypeFilter } from "@/features/assets/type-filter";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";

function AssetsPage() {
  const family = useSelectedFamily();
  const [type, setType] = useState<string | null>(null);

  const familyId = family?._id as Id<"families"> | undefined;
  const summary = useQuery(api.assets.summary, familyId ? { familyId } : "skip");
  const assets = useQuery(
    api.assets.list,
    familyId ? { familyId, type: type ?? undefined } : "skip",
  );

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-dm-serif text-[42px] font-medium tracking-[-0.84px] text-provost-text-primary">
          Assets
        </h1>
      </div>

      <AssetsSummary summary={summary ?? null} />

      <TypeFilter selected={type} onChange={setType} />

      <AssetsList assets={assets ?? null} />
    </div>
  );
}

export default withRoleGuard(AssetsPage, APP_ROLES.ASSETS!);
