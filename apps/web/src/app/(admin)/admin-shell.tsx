"use client";
import type { ReactNode } from "react";
import { withSiteAdminGuard } from "@/HOCs/with-site-admin-guard";

function AdminShellInner({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export const AdminShell = withSiteAdminGuard(AdminShellInner);
