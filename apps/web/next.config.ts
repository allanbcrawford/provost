import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@provost/ui", "@provost/schemas", "@provost/agent"],
  reactStrictMode: true,
};

export default config;
