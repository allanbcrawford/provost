import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@provost/ui", "@provost/schemas", "@provost/agent"],
  reactStrictMode: true,
  // Silence Turbopack/webpack conflict warning introduced in Next.js 16
  turbopack: {},
};

export default withSentryConfig(config, {
  silent: true,
  disableLogger: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
});
