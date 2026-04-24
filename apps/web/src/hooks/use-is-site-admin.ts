"use client";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

/**
 * Returns the current Clerk-authed user's site-admin status.
 * `null` while loading; `true` / `false` once resolved.
 */
export function useIsSiteAdmin(): boolean | null {
  const result = useQuery(api.users.meSiteAdmin, {});
  if (result === undefined) return null;
  return result.isSiteAdmin;
}
