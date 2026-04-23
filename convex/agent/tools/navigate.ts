"use node";
import { v } from "convex/values";
import { internalAction } from "../../_generated/server";

const ALLOWED_PATHS = [
  "/",
  "/family",
  "/documents",
  "/library",
  "/lessons",
  "/signals",
  "/simulations",
  "/professionals",
  "/governance",
  "/settings",
];

function isAllowedPath(path: string): boolean {
  if (ALLOWED_PATHS.includes(path)) return true;
  if (path.startsWith("/documents/") && path.split("/").length === 3) return true;
  if (path.startsWith("/lessons/") && path.split("/").length === 3) return true;
  if (path.startsWith("/library/") && path.split("/").length === 3) return true;
  return false;
}

export const handle = internalAction({
  args: { args: v.any(), toolCallId: v.string(), runId: v.id("thread_runs") },
  handler: async (_ctx, { args }) => {
    const path = typeof args?.path === "string" ? args.path : "/";
    if (!isAllowedPath(path)) {
      return { success: false, error: `path '${path}' not allowed`, widget: null };
    }
    return {
      success: true,
      widget: { kind: "navigate", props: { path } },
    };
  },
});
