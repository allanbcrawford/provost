"use client";

import { preloadedQueryResult } from "convex/nextjs";
import { type Preloaded, useConvexAuth, usePreloadedQuery } from "convex/react";
import type { FunctionReference } from "convex/server";
import type { ReactElement, ReactNode } from "react";

// usePreloadedQuery internally calls useQuery, which subscribes a Convex
// client query the moment it mounts. If the client hasn't yet attached its
// auth token (sign-in flight, post-hydration window), the subscription
// runs unauthenticated and the query handler throws — bubbling past every
// gate to the error boundary.
//
// AuthedPreloadedQuery splits the render path so usePreloadedQuery only
// runs once Convex itself reports isAuthenticated === true. While auth is
// still attaching, it renders with the preloaded snapshot via
// preloadedQueryResult (a pure JSON->value transform). The snapshot was
// minted server-side with the user's JWT, so it's the right initial value
// to render from.
type AnyQueryRef = FunctionReference<"query">;

export function AuthedPreloadedQuery<Q extends AnyQueryRef>({
  preloaded,
  children,
}: {
  preloaded: Preloaded<Q>;
  children: (data: Q["_returnType"]) => ReactNode;
}): ReactElement {
  const { isAuthenticated } = useConvexAuth();
  return isAuthenticated ? (
    <LivePreloadedQuery preloaded={preloaded}>{children}</LivePreloadedQuery>
  ) : (
    <SnapshotPreloadedQuery preloaded={preloaded}>{children}</SnapshotPreloadedQuery>
  );
}

function LivePreloadedQuery<Q extends AnyQueryRef>({
  preloaded,
  children,
}: {
  preloaded: Preloaded<Q>;
  children: (data: Q["_returnType"]) => ReactNode;
}): ReactElement {
  const data = usePreloadedQuery(preloaded);
  return <>{children(data)}</>;
}

function SnapshotPreloadedQuery<Q extends AnyQueryRef>({
  preloaded,
  children,
}: {
  preloaded: Preloaded<Q>;
  children: (data: Q["_returnType"]) => ReactNode;
}): ReactElement {
  const data = preloadedQueryResult(preloaded);
  return <>{children(data)}</>;
}
