import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Provost",
  description: "AI Family Wealth Advisor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // TODO(phase-4): mount <WidgetPortalProvider> in apps/web/src/app/(app)/layout.tsx
  // (the authenticated shell) so chat tools can push widgets into page slots.
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
