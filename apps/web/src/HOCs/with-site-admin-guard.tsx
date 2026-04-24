"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useIsSiteAdmin } from "@/hooks/use-is-site-admin";

export function withSiteAdminGuard<P extends object>(Component: React.ComponentType<P>) {
  return function Guarded(props: P) {
    const isSiteAdmin = useIsSiteAdmin();
    const router = useRouter();

    useEffect(() => {
      if (isSiteAdmin === false) router.replace("/");
    }, [isSiteAdmin, router]);

    if (isSiteAdmin === null) {
      return <div className="p-8 text-sm text-provost-text-secondary">Loading…</div>;
    }
    if (!isSiteAdmin) return null;
    return <Component {...props} />;
  };
}
