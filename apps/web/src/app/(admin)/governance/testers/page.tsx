"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../../../convex/_generated/api";

type Tester = {
  _id: string;
  first_name: string;
  last_name: string;
  email: string;
  memberRole: string;
  onboarding_status: string;
};

export default function TestersPage() {
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
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-dm-serif text-[42px] font-medium tracking-[-0.84px] text-provost-text-primary">
          Internal Testers
        </h1>
        <p className="mt-2 text-[14px] tracking-[-0.42px] text-provost-text-secondary">
          Invite internal testers to the staging demo family. Admin only.
        </p>
      </div>

      <div className="flex flex-col gap-10">
        <section>
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-provost-text-tertiary">
            Invite a tester
          </h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tester@example.com"
              required
              className="h-[40px] flex-1 rounded-[8px] border border-provost-border-subtle bg-white px-3 text-[14px] tracking-[-0.42px] text-provost-text-primary focus:border-provost-text-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="h-[40px] rounded-full bg-provost-text-primary px-5 text-[15px] font-medium text-white disabled:opacity-50"
            >
              {loading ? "Inviting…" : "Send invite"}
            </button>
          </form>

          {inviteUrl && (
            <div className="mt-3 rounded-[8px] bg-green-50 p-3">
              <p className="mb-1 text-[12px] font-medium text-green-800">
                Invite link (share manually):
              </p>
              <a
                href={inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-[12px] text-green-700 underline"
              >
                {inviteUrl}
              </a>
            </div>
          )}

          {!inviteUrl && (
            <p className="mt-2 text-[12px] text-provost-text-secondary">
              If <code>CLERK_SECRET_KEY</code> is configured, an email invite is sent automatically.
              Otherwise the invite link is logged server-side (Phase 8+ stretch).
            </p>
          )}
        </section>

        {error && (
          <p className="rounded-[8px] bg-red-50 px-3 py-2 text-[14px] tracking-[-0.42px] text-red-700">
            {error}
          </p>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-wider text-provost-text-tertiary">
              Demo family members
            </h2>
            <button
              type="button"
              onClick={handleLoad}
              disabled={listLoading}
              className="text-[12px] font-medium text-provost-text-primary underline disabled:opacity-50"
            >
              {listLoading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {testers.length === 0 ? (
            <p className="text-[14px] tracking-[-0.42px] text-provost-text-secondary">
              No members loaded yet. Click Refresh to fetch.
            </p>
          ) : (
            <div className="overflow-hidden rounded-[8px] border border-provost-border-subtle">
              <table className="w-full text-[14px] tracking-[-0.42px]">
                <thead className="bg-provost-bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-provost-text-tertiary">
                      Name
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-provost-text-tertiary">
                      Email
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-provost-text-tertiary">
                      Role
                    </th>
                    <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-provost-text-tertiary">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-provost-border-subtle">
                  {testers.map((t) => (
                    <tr key={t._id}>
                      <td className="px-4 py-2 text-provost-text-primary">
                        {t.first_name} {t.last_name}
                      </td>
                      <td className="px-4 py-2 text-provost-text-secondary">{t.email}</td>
                      <td className="px-4 py-2 capitalize text-provost-text-secondary">
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
