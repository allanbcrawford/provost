"use client";

import { useConvexAuth, useMutation } from "convex/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

// Issue 6.5 — client-side presence heartbeat.
//
// Mounts once at the authenticated layout root. While the tab is alive and
// authenticated, fires `presence.heartbeat` every 30s, plus once on mount
// and once whenever the tab transitions back to visible (so a user coming
// out of a backgrounded tab shows as active immediately rather than waiting
// up to 30s).
//
// Heartbeat interval rationale: 30s gives us a 2x safety margin against the
// 60s "active" window — a single dropped beat (e.g. transient network blip)
// still keeps the user marked active. Halving it to 15s would double write
// volume for no UX win; doubling to 60s would put us at the edge.

const HEARTBEAT_INTERVAL_MS = 30_000;

export function usePresenceHeartbeat(familyId?: Id<"families">): void {
  const { isAuthenticated } = useConvexAuth();
  const heartbeat = useMutation(api.presence.heartbeat);
  const pathname = usePathname();

  // Latest values captured in refs so the interval callback always sees the
  // current pathname/familyId without needing to be torn down + recreated on
  // every navigation.
  const familyIdRef = useRef<Id<"families"> | undefined>(familyId);
  const pathnameRef = useRef<string>(pathname ?? "/");
  const heartbeatRef = useRef(heartbeat);
  const isAuthedRef = useRef(isAuthenticated);

  useEffect(() => {
    familyIdRef.current = familyId;
  }, [familyId]);

  useEffect(() => {
    pathnameRef.current = pathname ?? "/";
  }, [pathname]);

  useEffect(() => {
    heartbeatRef.current = heartbeat;
  }, [heartbeat]);

  useEffect(() => {
    isAuthedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fire = () => {
      if (!isAuthedRef.current) return;
      heartbeatRef
        .current({
          familyId: familyIdRef.current,
          surface: pathnameRef.current,
        })
        .catch(() => {
          // Heartbeats are fire-and-forget; a transient failure (network,
          // sign-out race) will be retried by the next tick. Swallowing
          // here avoids unhandled-rejection noise in the console.
        });
    };

    fire();
    const interval = window.setInterval(fire, HEARTBEAT_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") fire();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAuthenticated]);
}
