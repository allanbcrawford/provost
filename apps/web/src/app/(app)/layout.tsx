import { RedirectToSignIn, Show } from "@clerk/nextjs";
import { fetchQuery } from "convex/nextjs";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { ChatRail } from "@/components/chat-rail";
import { FamilyBootstrap } from "@/components/family-bootstrap";
import { Header } from "@/components/header";
import { SidebarNav } from "@/components/sidebar-nav";
import { BreadcrumbProvider } from "@/context/breadcrumb-context";
import { type Family, FamilyProvider } from "@/context/family-context";
import { SidebarProvider } from "@/context/sidebar-context";
import { WidgetPortalProvider } from "@/context/widget-portal-context";
import { ChatPanelProvider } from "@/features/chat/chat-panel-context";
import { FAMILY_COOKIE_NAME } from "@/lib/family-cookie";
import { getConvexAuthToken } from "@/lib/server/convex-auth";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

// SSR family resolution: fetch the user's families with their Clerk token so
// the first paint already has a verified family record. Falls back to
// undefined on any error (token mint failure, Convex unreachable, etc.) so
// the client bootstrap can recover with the normal listMine subscription.
async function resolveInitialFamily(cookieId: string | undefined): Promise<Family> {
  const token = await getConvexAuthToken();
  if (!token) return null;
  try {
    const families = (await fetchQuery(api.families.listMine, {}, { token })) as Array<{
      _id: Id<"families">;
      name: string;
      myRole: string;
    }>;
    if (families.length === 0) return null;
    const matched = cookieId ? families.find((f) => f._id === cookieId) : undefined;
    return (matched ?? families[0]) as Family;
  } catch {
    return null;
  }
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieId = (await cookies()).get(FAMILY_COOKIE_NAME)?.value;
  const initialFamily = await resolveInitialFamily(cookieId);
  return (
    <Show when="signed-in" fallback={<RedirectToSignIn />}>
      <FamilyProvider initialFamily={initialFamily}>
        <FamilyBootstrap initialFamilyId={initialFamily?._id ?? cookieId}>
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
