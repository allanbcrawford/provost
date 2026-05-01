import type { Metadata } from "next";
import { Fraunces, Source_Serif_4, Geist } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Provost",
  description: "AI Family Wealth Advisor",
};

// Phase 1.5 fonts per Design MOC.md: Fraunces (display), Source Serif 4 (body
// serif), Geist (sans). Material Symbols loaded via <link> below — keep that.
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source-serif",
});
const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist",
});

// Pre-paint theme bootstrap (Issue 6.4). Runs synchronously in <head> before
// React hydrates so dark-preference users never see a flash of light content.
// Reads localStorage["provost.theme"] (one of: "light" | "dark" | "system");
// when missing or "system", defers to prefers-color-scheme. Defensive against
// access errors (Safari private mode can throw on localStorage). After this
// script runs, document.documentElement.dataset.theme is either "light" or
// "dark"; the React layer reads/syncs that value on mount.
const themeBootstrapScript = `(function(){try{var s=null;try{s=localStorage.getItem('provost.theme');}catch(_){}var sysDark=false;try{sysDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;}catch(_){}var t=(s==='dark'||s==='light')?s:(sysDark?'dark':'light');document.documentElement.dataset.theme=t;}catch(_){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${sourceSerif.variable} ${geist.variable}`}
    >
      <head>
        {/* Pre-paint theme application — must come before any styled content
            renders to avoid FOUC for dark-mode users. Issue 6.4. */}
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: inline pre-paint script is the standard FOUC-avoidance pattern
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,200..700,0..1,0&display=block"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh bg-provost-bg-primary text-provost-text-primary antialiased">
        <Providers>{children}</Providers>
        {/* Phase 7.3: Vercel Speed Insights — no-op outside Vercel deployments */}
        <SpeedInsights />
      </body>
    </html>
  );
}
