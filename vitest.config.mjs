// Vitest config for Convex backend tests. Uses convex-test's edge-runtime
// shim so queries / mutations / actions run in a Convex-compatible sandbox
// without a real deployment. Tests live under convex/__tests__/*.test.ts.
//
// Run with:  pnpm convex:test         (alias for `vitest run`)
// Watch with: pnpm convex:test --watch
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["convex/__tests__/**/*.test.ts"],
    // Match Convex codegen exclusions; edge-runtime can't load .next or app
    // bundles, and we don't want stale generated artifacts confusing imports.
    exclude: ["**/node_modules/**", "**/_generated/**", "**/.next/**", "**/.turbo/**"],
    // Tests run with party-check ON so we exercise production semantics, not
    // the stub-mode short-circuit. Dev deployment also has this flipped.
    env: { ACL_PARTY_CHECK_ENABLED: "true" },
  },
});
