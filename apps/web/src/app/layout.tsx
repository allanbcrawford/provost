import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Provost",
  description: "AI Family Wealth Advisor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-white text-neutral-900 antialiased">{children}</body>
    </html>
  );
}
