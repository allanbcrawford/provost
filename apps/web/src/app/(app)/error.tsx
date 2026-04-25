"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h2 className="font-semibold text-gray-900 text-xl">We hit a snag loading this view</h2>
      <p className="text-gray-600 text-sm">
        Try again in a moment. If it keeps happening, contact your admin.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-indigo-600 px-4 py-2 font-medium text-sm text-white hover:bg-indigo-700"
      >
        Try again
      </button>
    </div>
  );
}
