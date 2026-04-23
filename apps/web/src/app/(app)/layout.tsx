import { RedirectToSignIn, Show } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { FamilyBootstrap } from "@/components/family-bootstrap";
import { FamilyProvider } from "@/context/family-context";
import { WidgetPortalProvider } from "@/context/widget-portal-context";
import { ChatPanelProvider } from "@/features/chat/chat-panel-context";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <Show when="signed-in" fallback={<RedirectToSignIn />}>
      <FamilyProvider>
        <FamilyBootstrap>
          <WidgetPortalProvider>
            <ChatPanelProvider>
              <AppShell>{children}</AppShell>
            </ChatPanelProvider>
          </WidgetPortalProvider>
        </FamilyBootstrap>
      </FamilyProvider>
    </Show>
  );
}
