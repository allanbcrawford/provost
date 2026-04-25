// Convex module loader for convex-test. Tests live in `tests-convex/` (a
// sibling of `convex/`, NOT under it — keeping them under `convex/` causes
// the Convex bundler to choke on import.meta.glob during deploy).
//
// We pass an explicit module map built via import.meta.glob to convexTest's
// second arg so it can resolve `_generated/api.js` etc. The glob is relative
// to THIS file: `../convex/**/*.ts` grabs the whole convex tree.

export const modules = import.meta.glob("../convex/**/*.ts", { eager: false });
