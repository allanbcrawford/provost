"use client";
import { useQuery } from "convex/react";
import { useSelectedFamily } from "@/context/family-context";
import type { Role } from "@/lib/roles";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export function useUserRole(): Role | null {
  const family = useSelectedFamily();
  const membership = useQuery(
    api.families.getMembership,
    family ? { familyId: family._id as Id<"families"> } : "skip",
  );
  return (membership?.role as Role) ?? null;
}
