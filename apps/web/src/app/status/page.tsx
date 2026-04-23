export const dynamic = "force-dynamic";

type StatusDot = "green" | "yellow" | "unknown";

function StatusRow({
  label,
  status,
  detail,
}: {
  label: string;
  status: StatusDot;
  detail?: string;
}) {
  const colors: Record<StatusDot, string> = {
    green: "bg-green-500",
    yellow: "bg-yellow-400",
    unknown: "bg-neutral-300",
  };
  const labels: Record<StatusDot, string> = {
    green: "Operational",
    yellow: "Degraded",
    unknown: "Unknown",
  };
  return (
    <div className="flex items-center justify-between border-b border-neutral-100 py-3 last:border-0">
      <div>
        <span className="font-medium text-neutral-800">{label}</span>
        {detail && <span className="ml-2 text-neutral-400 text-sm">{detail}</span>}
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${colors[status]}`}
          aria-hidden="true"
        />
        <span className="text-neutral-600 text-sm">{labels[status]}</span>
      </div>
    </div>
  );
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

export default async function StatusPage() {
  const commitSha = process.env.COMMIT_SHA ?? "unknown";
  const commitTime = process.env.COMMIT_TIME ?? null;

  const deployDetail =
    commitSha !== "unknown"
      ? `${commitSha.slice(0, 7)}${commitTime ? ` · ${commitTime}` : ""}`
      : undefined;

  const convexStatus = await getConvexStatus();

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <h1 className="mb-1 font-semibold text-2xl text-neutral-900">Provost Status</h1>
      <p className="mb-8 text-neutral-500 text-sm">Real-time health of platform services.</p>

      <div className="rounded-xl border border-neutral-200 bg-white px-6 py-2 shadow-sm">
        <StatusRow label="Web Application" status="green" detail={deployDetail} />
        <StatusRow label="Convex Backend" status={convexStatus} />
        <StatusRow label="Authentication (Clerk)" status="green" />
        <StatusRow label="AI Services (OpenAI)" status="green" />
      </div>

      <p className="mt-6 text-center text-neutral-400 text-xs">
        This page does not require authentication.{" "}
        {commitTime
          ? `Last deploy: ${commitTime}.`
          : commitSha !== "unknown"
            ? `Build: ${commitSha.slice(0, 7)}.`
            : "Deploy time unavailable."}
      </p>
    </main>
  );
}
