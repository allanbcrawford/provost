"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUserRole } from "@/hooks/use-user-role";
import type { Role } from "@/lib/roles";

export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: Role[],
) {
  return function Guarded(props: P) {
    const role = useUserRole();
    const router = useRouter();

    useEffect(() => {
      if (role && !allowedRoles.includes(role)) router.replace("/");
    }, [role, router]);

    if (role === null) {
      return <div className="p-8 text-sm text-provost-text-secondary">Loading…</div>;
    }
    if (!allowedRoles.includes(role)) return null;
    return <Component {...props} />;
  };
}
