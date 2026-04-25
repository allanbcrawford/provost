import { auth } from "@clerk/nextjs/server";

// Mints a Clerk JWT to attach to Convex SSR requests. Returns undefined when
// the request has no signed-in user (anonymous, sign-in flight, etc.) so
// callers can fall back to client-side rendering instead of erroring out.
export async function getConvexAuthToken(): Promise<string | undefined> {
  try {
    const { getToken } = await auth();
    const token = await getToken({ template: "convex" });
    return token ?? undefined;
  } catch {
    return undefined;
  }
}
