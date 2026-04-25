// Convex module loader for convex-test. Tests live in `convex/__tests__/`,
// not at the convex root, so convex-test's auto-resolver doesn't find the
// sibling `_generated/` directory. We pass an explicit module map built via
// import.meta.glob from a path-relative-to-convex-root.
//
// The glob path is relative to THIS file. Tests/__tests__ → ../*.ts grabs
// the convex root; ../**/*.ts grabs everything below it.
//
// We exclude the test directory itself and _generated to avoid cycles
// or stale generated artifacts in the module graph.

export const modules = import.meta.glob("../**/*.ts", { eager: false });
