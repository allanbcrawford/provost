"use client";

import type { ReactNode } from "react";
import { ChatRail } from "@/components/chat-rail";
import { Header } from "@/components/header";
import { SidebarNav } from "@/components/sidebar-nav";
import { BreadcrumbProvider } from "@/context/breadcrumb-context";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <BreadcrumbProvider>
      <div className="flex h-dvh w-full overflow-hidden bg-neutral-50">
        <SidebarNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
        </div>
        <ChatRail />
      </div>
    </BreadcrumbProvider>
  );
}
