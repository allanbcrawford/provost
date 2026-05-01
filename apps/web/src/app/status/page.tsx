// Public status page — no auth, no nav. Server Component.
//
// Sources:
//   - Deploy info: COMMIT_SHA + COMMIT_TIME (Vercel build hook env vars).
//     GitHub link derived from VERCEL_GIT_REPO_OWNER + VERCEL_GIT_REPO_SLUG.
//   - Convex backend: GET <NEXT_PUBLIC_CONVEX_URL>/version (existing pattern).
//   - OpenAI: convex action `status.openaiPing` (3s timeout, never leaks key).
//   - Cron health: convex query `status.cronHealth` (audit_events scan).
//   - Chat TTFT: convex query `status.recentChatTtftStats` (Phase 7.3).
//
// All Convex calls go through fetchQuery/fetchAction without a token —
// these endpoints are intentionally public.

import { fetchAction, fetchQuery } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";

export const dynamic = "force-dynamic";

type StatusDot = "green" | "yellow" | "red" | "unknown";

const DOT_COLORS: Record<StatusDot, string> = {
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  unknown: "bg-neutral-300",
};
const DOT_LABELS: Record<StatusDot, string> = {
  green: "Operational",
  yellow: "Degraded",
  red: "Down",
  unknown: "Unknown",
};

function StatusRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: StatusDot;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between border-neutral-100 border-b py-3 last:border-0">
      <div>
        <span className="font-medium text-neutral-800">{label}</span>
        {detail && (
          <span className="ml-2 font-mono text-neutral-400 text-xs">{detail}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_COLORS[status]}`}
          aria-hidden="true"
        />
        <span className="text-neutral-600 text-sm">{DOT_LABELS[status]}</span>
      </div>
    </div>
  );
}

function relativeTime(ms: number): string {
  const delta = Date.now() - ms;
  const abs = Math.abs(delta);
  const m = 60 * 1000;
  const h = 60 * m;
  const d = 24 * h;
  if (abs < m) return "just now";
  if (abs < h) return `${Math.floor(abs / m)} min ago`;
  if (abs < d) return `${Math.floor(abs / h)} h ago`;
  return `${Math.floor(abs / d)} d ago`;
}

async function getConvexStatus(): Promise<StatusDot> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return "unknown";
  try {
    const res = await fetch(`${url}/version`, {
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(4000),
    });
    return res.ok ? "green" : "yellow";
  } catch {
    return "yellow";
  }
}

type CronRow = {
  name: string;
  lastRunAt: number | null;
  status: "ok" | "error" | "unknown";
  durationMs: number | null;
};

async function getCronHealth(): Promise<CronRow[]> {
  try {
    return (await fetchQuery(api.status.cronHealth, {})) as CronRow[];
  } catch {
    return [];
  }
}

async function getOpenAiPing(): Promise<{
  status: "ok" | "error" | "unknown";
  latencyMs: number;
}> {
  try {
    return (await fetchAction(api.status.openaiPing, {})) as {
      status: "ok" | "error" | "unknown";
      latencyMs: number;
    };
  } catch {
    return { status: "error", latencyMs: 0 };
  }
}

type TtftStats = { p50: number | null; p95: number | null; sampleSize: number };

async function getTtftStats(): Promise<TtftStats | null> {
  try {
    return (await fetchQuery(api.status.recentChatTtftStats, {})) as TtftStats;
  } catch {
    return null;
  }
}

function commitLink(sha: string): string | null {
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const slug = process.env.VERCEL_GIT_REPO_SLUG;
  if (!owner || !slug) return null;
  return `https://github.com/${owner}/${slug}/commit/${sha}`;
}

function cronStatusDot(status: CronRow["status"]): StatusDot {
  if (status === "ok") return "green";
  if (status === "error") return "red";
  return "unknown";
}

function openAiDot(status: "ok" | "error" | "unknown"): StatusDot {
  if (status === "ok") return "green";
  if (status === "error") return "red";
  return "unknown";
}

export default async function StatusPage() {
  const commitSha = process.env.COMMIT_SHA ?? "unknown";
  const commitTimeRaw = process.env.COMMIT_TIME ?? null;
  const commitTimeMs = commitTimeRaw ? Date.parse(commitTimeRaw) : Number.NaN;
  const commitRel =
    commitTimeRaw && !Number.isNaN(commitTimeMs)
      ? relativeTime(commitTimeMs)
      : (commitTimeRaw ?? null);

  const ghLink = commitSha !== "unknown" ? commitLink(commitSha) : null;
  const shortSha = commitSha !== "unknown" ? commitSha.slice(0, 7) : null;

  const deployDetail = shortSha
    ? `${shortSha}${commitRel ? ` · ${commitRel}` : ""}`
    : undefined;

  // Run independent backend checks in parallel.
  const [convexStatus, openai, crons, ttft] = await Promise.all([
    getConvexStatus(),
    getOpenAiPing(),
    getCronHealth(),
    getTtftStats(),
  ]);

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="mb-1 font-semibold text-2xl text-neutral-900">
        Provost Status
      </h1>
      <p className="mb-8 text-neutral-500 text-sm">
        Real-time health of platform services.
      </p>

      {/* 1. Deploy info */}
      <section className="mb-8 rounded-xl border border-neutral-200 bg-white px-6 py-4 shadow-sm">
        <h2 className="mb-2 font-semibold text-neutral-700 text-sm">Deploy</h2>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-neutral-500">Commit</dt>
          <dd className="font-mono text-neutral-800">
            {shortSha ? (
              ghLink ? (
                <a
                  className="underline decoration-neutral-300 hover:decoration-neutral-700"
                  href={ghLink}
                  rel="noreferrer"
                  target="_blank"
                >
                  {shortSha}
                </a>
              ) : (
                shortSha
              )
            ) : (
              <span className="text-neutral-400">unknown</span>
            )}
          </dd>
          <dt className="text-neutral-500">Built</dt>
          <dd className="text-neutral-800">
            {commitTimeRaw ? (
              <span title={commitTimeRaw}>{commitRel}</span>
            ) : (
              <span className="text-neutral-400">unknown</span>
            )}
          </dd>
        </dl>
      </section>

      {/* 2-3. Core services */}
      <div className="mb-8 rounded-xl border border-neutral-200 bg-white px-6 py-2 shadow-sm">
        <StatusRow
          label="Web Application"
          status="green"
          detail={deployDetail}
        />
        <StatusRow label="Convex Backend" status={convexStatus} />
        <StatusRow label="Authentication (Clerk)" status="green" />
        <StatusRow
          label="AI Services (OpenAI)"
          status={openAiDot(openai.status)}
          detail={
            openai.status === "unknown"
              ? "no key configured"
              : `${openai.latencyMs} ms`
          }
        />
      </div>

      {/* 4. Crons */}
      <section className="mb-8 rounded-xl border border-neutral-200 bg-white px-6 py-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-neutral-700 text-sm">
          Scheduled Jobs
        </h2>
        {crons.length === 0 ? (
          <p className="text-neutral-400 text-sm">No crons registered.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {crons.map((c) => (
              <li
                key={c.name}
                className="flex items-center justify-between py-2 text-sm"
              >
                <div>
                  <span className="font-mono text-neutral-800">{c.name}</span>
                  <span className="ml-2 text-neutral-400 text-xs">
                    {c.lastRunAt ? relativeTime(c.lastRunAt) : "never run yet"}
                    {c.durationMs !== null ? ` · ${c.durationMs} ms` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${DOT_COLORS[cronStatusDot(c.status)]}`}
                    aria-hidden="true"
                  />
                  <span className="text-neutral-500 text-xs">
                    {DOT_LABELS[cronStatusDot(c.status)]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 5. Chat TTFT */}
      <section className="mb-8 rounded-xl border border-neutral-200 bg-white px-6 py-4 shadow-sm">
        <h2 className="mb-3 font-semibold text-neutral-700 text-sm">
          Chat Time-to-First-Token (last 60 min)
        </h2>
        {ttft && ttft.sampleSize > 0 ? (
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-neutral-500 text-xs">p50</dt>
              <dd className="font-mono text-lg text-neutral-800">
                {ttft.p50} ms
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 text-xs">p95</dt>
              <dd className="font-mono text-lg text-neutral-800">
                {ttft.p95} ms
              </dd>
            </div>
            <div>
              <dt className="text-neutral-500 text-xs">samples</dt>
              <dd className="font-mono text-lg text-neutral-800">
                {ttft.sampleSize}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-neutral-400 text-sm">
            {ttft === null ? "unavailable" : "no samples in window"}
          </p>
        )}
      </section>

      <p className="mt-6 text-center text-neutral-400 text-xs">
        This page does not require authentication.
      </p>
    </main>
  );
}
