"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useFamilyContext } from "@/context/family-context";
import { api } from "../../../../convex/_generated/api";

export function FamilyBootstrap({ children }: { children: React.ReactNode }) {
  const { isSignedIn, userId } = useAuth();
  const router = useRouter();
  const provision = useMutation(api.users.getOrProvisionFromClerk);
  const families = useQuery(api.families.listMine, isSignedIn ? {} : "skip");
  // Site admins (Provost internal team) aren't members of any family by
  // default — they manage curation through /(admin). Redirect them out of the
  // family-shell into /library when they hit a family-shell route with no
  // family selected, instead of showing the "No families linked" wall.
  const siteAdmin = useQuery(api.users.meSiteAdmin, isSignedIn ? {} : "skip");
  const isSiteAdmin = siteAdmin?.isSiteAdmin === true;
  const { family, setFamily } = useFamilyContext();

  useEffect(() => {
    if (isSignedIn && userId) {
      provision({}).catch(() => {});
    }
  }, [isSignedIn, userId, provision]);

  useEffect(() => {
    if (families && families.length > 0 && !family) {
      const saved = typeof window !== "undefined" ? localStorage.getItem("selectedFamilyId") : null;
      const chosen = saved ? families.find((f: { _id: string }) => f._id === saved) : undefined;
      setFamily((chosen ?? families[0]) as never);
    }
  }, [families, family, setFamily]);

  useEffect(() => {
    if (family?._id && typeof window !== "undefined") {
      localStorage.setItem("selectedFamilyId", family._id);
    }
  }, [family]);

  // Site admins with no family memberships land on the curation surface.
  useEffect(() => {
    if (isSignedIn && families && families.length === 0 && isSiteAdmin) {
      router.replace("/library");
    }
  }, [isSignedIn, families, isSiteAdmin, router]);

  if (isSignedIn && families === undefined) {
    return <div className="p-8 text-provost-text-secondary text-sm">Loading your families…</div>;
  }
  if (isSignedIn && families && families.length === 0) {
    if (isSiteAdmin) {
      // Tiny placeholder while the redirect-effect fires.
      return <div className="p-8 text-provost-text-secondary text-sm">Loading…</div>;
    }
    return (
      <div className="p-8 text-provost-text-secondary text-sm">
        No families linked to this account. Contact your admin.
      </div>
    );
  }
  return <>{children}</>;
}
