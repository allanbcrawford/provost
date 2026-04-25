import { fetchQuery } from "convex/nextjs";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Family } from "@/context/family-context";
import { FAMILY_COOKIE_NAME } from "@/lib/family-cookie";
import { getConvexAuthToken } from "@/lib/server/convex-auth";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export type ResolvedFamily = {
  family: Family;
  cookieId: string | undefined;
  token: string | undefined;
};

// Single source of truth for SSR family resolution. Used by (app)/layout.tsx
// and any page that wants to preloadQuery against the current family without
// re-running listMine. Keep this idempotent — Next.js dedupes async calls
// from the same render via React.cache, but explicit reuse from the layout
// is what makes preloadQuery args available to pages without prop drilling.
export const resolveFamilyFromCookie = cache(async (): Promise<ResolvedFamily> => {
  const cookieId = (await cookies()).get(FAMILY_COOKIE_NAME)?.value;
  const token = await getConvexAuthToken();
  if (!token) return { family: null, cookieId, token: undefined };
  try {
    const families = (await fetchQuery(api.families.listMine, {}, { token })) as Array<{
      _id: Id<"families">;
      name: string;
      myRole: string;
    }>;
    if (families.length === 0) return { family: null, cookieId, token };
    const matched = cookieId ? families.find((f) => f._id === cookieId) : undefined;
    return { family: (matched ?? families[0]) as Family, cookieId, token };
  } catch {
    return { family: null, cookieId, token };
  }
});
