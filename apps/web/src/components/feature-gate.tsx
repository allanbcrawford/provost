"use client";

// Wrap a UI surface in <FeatureGate feature="messages"> to show its
// children only when the flag is enabled (globally OR for the caller's
// family via family_overrides). Disabled state renders a "Launching soon"
// overlay; loading state renders a skeleton card. Site admins see the
// children regardless so they can verify configuration.

import { Icon } from "@provost/ui";
import { useQuery } from "convex/react";
import type { ReactNode } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import { api } from "../../../../convex/_generated/api";

type Props = {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function FeatureGate({ feature, children, fallback }: Props) {
  const result = useQuery(api.featureFlags.get, { key: feature });
  const role = useUserRole();
  const siteAdminLike = role === "admin" || role === "advisor";

  if (result === undefined) {
    return (
      <div className="h-[160px] animate-pulse rounded-md border border-provost-border-subtle bg-provost-bg-secondary" />
    );
  }
  if (result.enabled) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-provost-border-subtle bg-white px-6 py-12 text-center">
      <Icon name="schedule" size={32} weight={300} className="text-provost-text-tertiary" />
      <p className="font-medium text-[16px] text-provost-text-primary">Launching soon</p>
      <p className="max-w-md text-[13px] text-provost-text-secondary">
        This feature isn't enabled for your family yet. We'll let you know when it's ready.
      </p>
      {siteAdminLike && (
        <p className="mt-2 rounded-full bg-provost-bg-secondary px-3 py-1 text-[11px] text-provost-text-secondary uppercase tracking-wider">
          {feature} · disabled globally
        </p>
      )}
    </div>
  );
}
