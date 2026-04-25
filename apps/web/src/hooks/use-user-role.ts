"use client";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useSelectedFamily } from "@/context/family-context";
import type { Role } from "@/lib/roles";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useUserRole(): Role | null {
  // Skip the query during sign-out: the family context can briefly retain the
  // previous family after Clerk has cleared its identity, which would
  // otherwise fire getMembership unauthenticated. Convex side now also
  // tolerates this (returns null), so this is defense-in-depth.
  const { isSignedIn } = useAuth();
  const family = useSelectedFamily();
  const membership = useQuery(
    api.families.getMembership,
    isSignedIn && family ? { familyId: family._id as Id<"families"> } : "skip",
  );
  return (membership?.role as Role) ?? null;
}
