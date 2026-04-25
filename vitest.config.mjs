// Vitest config for Convex backend tests. Uses convex-test's edge-runtime
// shim so queries / mutations / actions run in a Convex-compatible sandbox
// without a real deployment. Tests live under tests-convex/*.test.ts —
// a sibling of convex/, NOT inside it (otherwise the Convex bundler tries
// to deploy them as functions and trips on vitest-only globals like
// import.meta.glob).
//
// Run with:  pnpm convex:test         (alias for `vitest run`)
// Watch with: pnpm convex:test:watch
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["tests-convex/**/*.test.ts"],
    // Match Convex codegen exclusions; edge-runtime can't load .next or app
    // bundles, and we don't want stale generated artifacts confusing imports.
    exclude: ["**/node_modules/**", "**/_generated/**", "**/.next/**", "**/.turbo/**"],
    // Tests run with party-check ON so we exercise production semantics, not
    // the stub-mode short-circuit. Dev deployment also has this flipped.
    env: { ACL_PARTY_CHECK_ENABLED: "true" },
  },
});
