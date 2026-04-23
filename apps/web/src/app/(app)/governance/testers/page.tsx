"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { withRoleGuard } from "@/HOCs/with-role-guard";
import { APP_ROLES } from "@/lib/roles";
import { api } from "../../../../../../../convex/_generated/api";

type Tester = {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  memberRole: string;
  onboarding_status: string;
};

function TestersPage() {
  const inviteTester = useMutation(api.users.inviteTester);
  const listTesters = useMutation(api.users.listTesters);

  const [email, setEmail] = useState("");
  const [testers, setTesters] = useState<Tester[]>([]);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);

  async function handleLoad() {
    setListLoading(true);
    setError(null);
    try {
      const result = await listTesters({});
      setTesters((result as Tester[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load testers.");
    } finally {
      setListLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setInviteUrl(null);
    try {
      const result = (await inviteTester({ email: email.trim() })) as {
        userId: string;
        inviteUrl: string | null;
      };
      setInviteUrl(result.inviteUrl);
      setEmail("");
      await handleLoad();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="border-neutral-200 border-b px-6 pt-8 pb-4">
        <h1 className="font-semibold text-2xl text-provost-text-primary">Internal Testers</h1>
        <p className="mt-1 text-provost-text-secondary text-sm">
          Invite internal testers to the staging demo family. Admin only.
        </p>
      </header>

      <div className="space-y-8 p-6">
        <section>
          <h2 className="mb-3 font-medium text-provost-text-primary text-sm">Invite a tester</h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tester@example.com"
              required
              className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-provost-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="rounded-md bg-provost-primary px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {loading ? "Inviting…" : "Send invite"}
            </button>
          </form>

          {inviteUrl && (
            <div className="mt-3 rounded-md bg-green-50 p-3">
              <p className="mb-1 text-green-800 text-xs font-medium">
                Invite link (share manually):
              </p>
              <a
                href={inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-xs text-green-700 underline"
              >
                {inviteUrl}
              </a>
            </div>
          )}

          {!inviteUrl && (
            <p className="mt-2 text-provost-text-secondary text-xs">
              If <code>CLERK_SECRET_KEY</code> is configured, an email invite is sent automatically.
              Otherwise the invite link is logged server-side (Phase 8+ stretch).
            </p>
          )}
        </section>

        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-red-700 text-sm">{error}</p>}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium text-provost-text-primary text-sm">Demo family members</h2>
            <button
              type="button"
              onClick={handleLoad}
              disabled={listLoading}
              className="text-provost-primary text-xs underline disabled:opacity-50"
            >
              {listLoading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {testers.length === 0 ? (
            <p className="text-provost-text-secondary text-sm">
              No members loaded yet. Click Refresh to fetch.
            </p>
          ) : (
            <div className="overflow-hidden rounded-md border border-neutral-200">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-provost-text-secondary text-xs">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-provost-text-secondary text-xs">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-provost-text-secondary text-xs">
                      Role
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-provost-text-secondary text-xs">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {testers.map((t) => (
                    <tr key={t._id}>
                      <td className="px-4 py-2 text-provost-text-primary">
                        {t.first_name} {t.last_name}
                      </td>
                      <td className="px-4 py-2 text-provost-text-secondary">{t.email}</td>
                      <td className="px-4 py-2 text-provost-text-secondary capitalize">
                        {t.memberRole}
                      </td>
                      <td className="px-4 py-2 text-provost-text-secondary">
                        {t.onboarding_status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default withRoleGuard(TestersPage, APP_ROLES.GOVERNANCE!);
