import { RedirectToSignIn, Show } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { AdminHeader } from "@/components/admin-header";
import { AdminSidebarNav } from "@/components/admin-sidebar-nav";
import { SidebarProvider } from "@/context/sidebar-context";
import { AdminShell } from "./admin-shell";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Show when="signed-in" fallback={<RedirectToSignIn />}>
      <SidebarProvider>
        <AdminShell>
          <div className="flex h-dvh flex-col overflow-hidden bg-provost-bg-primary">
            <AdminHeader />
            <div className="flex flex-1 overflow-hidden">
              <AdminSidebarNav />
              <main className="min-w-0 flex-1 overflow-y-auto bg-white">{children}</main>
            </div>
          </div>
        </AdminShell>
      </SidebarProvider>
    </Show>
  );
}
