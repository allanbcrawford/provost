"use client";

import { useAuth, useSignIn } from "@clerk/nextjs";
import { Button, Input, Label } from "@provost/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

export default function SignInPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();
  const { signIn, fetchStatus } = useSignIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const redirectUrl = params?.get("redirect_url") ?? "/";
  const submitting = fetchStatus === "fetching";

  useEffect(() => {
    if (authLoaded && isSignedIn) router.replace(redirectUrl);
  }, [authLoaded, isSignedIn, redirectUrl, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError(null);

    const { error: pwError } = await signIn.password({
      identifier: email,
      password,
    });
    if (pwError) {
      setError(pwError.message ?? "Sign-in failed.");
      return;
    }

    const { error: finalizeError } = await signIn.finalize();
    if (finalizeError) {
      setError(finalizeError.message ?? "Sign-in failed.");
      return;
    }
    router.replace(redirectUrl);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-provost-bg-secondary p-6">
      <div className="w-full max-w-[420px] rounded-[16px] border border-provost-border-subtle bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="font-dm-serif text-3xl text-provost-text-primary">Sign in to Provost</h1>
          <p className="mt-2 text-provost-text-secondary text-sm">
            Welcome back. Enter your credentials to continue.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-red-700 text-sm" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-center text-provost-text-secondary text-xs">
          Provost is invite-only. Contact your administrator for access.
        </p>
      </div>
    </main>
  );
}
