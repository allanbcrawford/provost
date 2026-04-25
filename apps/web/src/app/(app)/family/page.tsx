import { preloadQuery } from "convex/nextjs";
import type { Preloaded } from "convex/react";
import { resolveFamilyFromCookie } from "@/lib/server/family-from-cookie";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { PreloadedFamilyGraphProvider } from "./family-graph-context";
import FamilyPageDefault from "./family-page.client";

async function preloadGraph(
  familyId: Id<"families"> | undefined,
  token: string | undefined,
): Promise<Preloaded<typeof api.family.getGraph> | null> {
  if (!familyId || !token) return null;
  try {
    return await preloadQuery(api.family.getGraph, { familyId }, { token });
  } catch {
    return null;
  }
}

export default async function FamilyPage() {
  const { family, token } = await resolveFamilyFromCookie();
  const preloaded = await preloadGraph(family?._id, token);
  return (
    <PreloadedFamilyGraphProvider preloaded={preloaded}>
      <FamilyPageDefault />
    </PreloadedFamilyGraphProvider>
  );
}
