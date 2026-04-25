"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFamilyContext } from "@/context/family-context";
import { writeFamilyCookie } from "@/lib/family-cookie";
import { api } from "../../../../convex/_generated/api";

export function FamilyBootstrap({
  children,
  initialFamilyId,
}: {
  children: React.ReactNode;
  initialFamilyId?: string;
}) {
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  const provision = useMutation(api.users.getOrProvisionFromClerk);
  const families = useQuery(api.families.listMine, isSignedIn ? {} : "skip");
  const siteAdmin = useQuery(api.users.meSiteAdmin, isSignedIn ? {} : "skip");
  const isSiteAdmin = siteAdmin?.isSiteAdmin === true;
  const { family, setFamily } = useFamilyContext();

  useEffect(() => {
    if (isSignedIn && userId) {
      provision({}).catch(() => {});
    }
  }, [isSignedIn, userId, provision]);

  // Pick a family once listMine resolves. Prefer the cookie/localStorage hint
  // if it matches one the user actually belongs to; otherwise fall back to
  // families[0]. We never trust the hint by itself — the server-side cookie
  // could carry a stale id from a prior session.
  useEffect(() => {
    if (!families || families.length === 0 || family) return;
    const savedId =
      initialFamilyId ??
      (typeof window !== "undefined" ? localStorage.getItem("selectedFamilyId") : null);
    const chosen = savedId ? families.find((f: { _id: string }) => f._id === savedId) : undefined;
    setFamily((chosen ?? families[0]) as never);
  }, [families, family, setFamily, initialFamilyId]);

  // Persist the verified selection to both localStorage (legacy) and a cookie
  // so the server can use it to skip the loading wall on the next refresh.
  useEffect(() => {
    if (family?._id && typeof window !== "undefined") {
      localStorage.setItem("selectedFamilyId", family._id);
      writeFamilyCookie(family._id);
    }
  }, [family]);

  // Site admins with no family memberships land on the curation surface. Also
  // clear the family cookie so the (app) shell stops trying to skip the
  // loading wall on subsequent loads under this account.
  useEffect(() => {
    if (isSignedIn && families && families.length === 0 && isSiteAdmin) {
      writeFamilyCookie(null);
      if (typeof window !== "undefined") localStorage.removeItem("selectedFamilyId");
      router.replace("/library");
    }
  }, [isSignedIn, families, isSiteAdmin, router]);

  // Once listMine has loaded, the cookie hint has done its job. If the user
  // turns out to have no families and we're awaiting the admin redirect, or
  // the hint pointed at a family they no longer belong to, the reconciliation
  // effect above already corrected the cookie via the verified selection.
  // Below we still gate three terminal states behind explicit checks so we
  // never render the shell with a family the user hasn't been confirmed in.

  // First-load wall: we have no hint and listMine is still loading. Without a
  // hint, rendering the shell would flash empty content for users who do have
  // families. With a hint, we skip the wall and let children render with
  // family === null — every family-scoped query already uses "skip" until
  // family is set, so nothing fires unsafely.
  if (isSignedIn && families === undefined && !initialFamilyId) {
    return <div className="p-8 text-provost-text-secondary text-sm">Loading your families…</div>;
  }

  // Confirmed empty: site admin gets a brief placeholder while the redirect
  // effect fires; everyone else sees the "no families linked" wall.
  if (isSignedIn && families && families.length === 0) {
    if (isSiteAdmin) {
      return <div className="p-8 text-provost-text-secondary text-sm">Loading…</div>;
    }
    return (
      <div className="p-8 text-provost-text-secondary text-sm">
        No families linked to this account. Contact your admin.
      </div>
    );
  }

  // Hint-but-still-loading: render the shell. family === null, so every
  // family-scoped query skips. Header/sidebar render their default chrome
  // until reconciliation fills in the verified family.
  return <>{children}</>;
}
