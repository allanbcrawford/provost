import { RedirectToSignIn, Show } from "@clerk/nextjs";
import { preloadQuery } from "convex/nextjs";
import type { Preloaded } from "convex/react";
import type { ReactNode } from "react";
import { ChatRail } from "@/components/chat-rail";
import { FamilyBootstrap } from "@/components/family-bootstrap";
import { Header } from "@/components/header";
import { SidebarNav } from "@/components/sidebar-nav";
import { BreadcrumbProvider } from "@/context/breadcrumb-context";
import { FamilyProvider } from "@/context/family-context";
import { PreloadedDataProvider } from "@/context/preloaded-data-context";
import { SidebarProvider } from "@/context/sidebar-context";
import { WidgetPortalProvider } from "@/context/widget-portal-context";
import { ChatPanelProvider } from "@/features/chat/chat-panel-context";
import { resolveFamilyFromCookie } from "@/lib/server/family-from-cookie";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

async function preloadThreads(
  familyId: Id<"families"> | undefined,
  token: string | undefined,
): Promise<Preloaded<typeof api.threads.list> | null> {
  if (!familyId || !token) return null;
  try {
    return await preloadQuery(api.threads.list, { familyId }, { token });
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { family, cookieId, token } = await resolveFamilyFromCookie();
  const preloadedThreads = await preloadThreads(family?._id, token);
  return (
    <Show when="signed-in" fallback={<RedirectToSignIn />}>
      <FamilyProvider initialFamily={family}>
        <FamilyBootstrap initialFamilyId={family?._id ?? cookieId}>
          <PreloadedDataProvider threads={preloadedThreads}>
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
          </PreloadedDataProvider>
        </FamilyBootstrap>
      </FamilyProvider>
    </Show>
  );
}
