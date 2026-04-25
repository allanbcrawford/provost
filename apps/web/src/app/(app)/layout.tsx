import { RedirectToSignIn, Show } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { ChatRail } from "@/components/chat-rail";
import { FamilyBootstrap } from "@/components/family-bootstrap";
import { Header } from "@/components/header";
import { SidebarNav } from "@/components/sidebar-nav";
import { BreadcrumbProvider } from "@/context/breadcrumb-context";
import { FamilyProvider } from "@/context/family-context";
import { SidebarProvider } from "@/context/sidebar-context";
import { WidgetPortalProvider } from "@/context/widget-portal-context";
import { ChatPanelProvider } from "@/features/chat/chat-panel-context";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Show when="signed-in" fallback={<RedirectToSignIn />}>
      <FamilyProvider>
        <FamilyBootstrap>
          <WidgetPortalProvider>
            <ChatPanelProvider>
              <SidebarProvider>
                <BreadcrumbProvider>
                  <div className="flex h-dvh flex-col overflow-hidden bg-provost-bg-primary">
                    <Header />
                    <div className="flex flex-1 overflow-hidden">
                      <SidebarNav />
                      <main className="min-w-0 flex-1 overflow-y-auto bg-white">{children}</main>
                      <ChatRail />
                    </div>
                  </div>
                </BreadcrumbProvider>
              </SidebarProvider>
            </ChatPanelProvider>
          </WidgetPortalProvider>
        </FamilyBootstrap>
      </FamilyProvider>
    </Show>
  );
}
