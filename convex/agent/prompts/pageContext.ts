// Page-context scaffolding. The chat agent receives a `selection` (kind +
// id) and `visibleState` snapshot from the page the user is on. These
// fragments translate that into "here's what the user is likely trying to
// do right now" guidance.

type PageContextArgs = {
  route?: string;
  selection?: { kind: string; id: string } | null;
  visibleState?: Record<string, unknown> | null;
};

export function pageContextFragment(args: PageContextArgs): string {
  const { route, selection, visibleState } = args;
  if (!route) return "";
  const lines: string[] = [];
  const guidance = ROUTE_GUIDANCE[route] ?? defaultRouteGuidance;
  lines.push(guidance(selection ?? null, visibleState ?? null));
  if (selection) {
    lines.push(
      `The user has selected: kind="${selection.kind}", id="${selection.id}". ` +
        "Treat that resource as the implicit subject of follow-up questions.",
    );
  }
  if (visibleState && Object.keys(visibleState).length > 0) {
    lines.push(`Visible UI state for context:\n${JSON.stringify(visibleState, null, 2)}`);
  }
  return `<page_context route="${route}">\n${lines.join("\n\n")}\n</page_context>`;
}

const ROUTE_GUIDANCE: Record<
  string,
  (
    selection: { kind: string; id: string } | null,
    visibleState: Record<string, unknown> | null,
  ) => string
> = {
  "/documents": (sel) =>
    sel
      ? "The user is reading an estate document. Ground answers in the document's clauses; if the user asks about an obligation or right, point to the section that creates it."
      : "The user is browsing the document library. Help them find the right document or explain a category if asked.",
  "/lessons": (sel) =>
    sel
      ? "The user is reading or just finished a lesson. Be ready to summarize, quiz them gently, or connect the lesson's concepts to their own family situation."
      : "The user is browsing the lesson library. Surface what's recommended for their phase, and offer to explain prerequisites.",
  "/family": () =>
    "The user is on the People surface — family tree + members + professionals. Questions are usually about who is who, who has what role, and how members relate.",
  "/signals": () =>
    "The user is reviewing observations and follow-ups from the agent. Be concrete about which document or member each signal references and what action would resolve it.",
  "/simulations": () =>
    "The user is running a waterfall scenario. Be exact about who receives what, in what amounts, under which death-order branch. If they're asking what changes when they toggle a revision, isolate the delta.",
  "/assets": () =>
    "The user is on the Assets surface. Questions are typically about totals, liquidity, type breakdowns, and changes over time. Reference the trend chart's YTD figure when discussing recent direction.",
  "/events": () =>
    "The user is on Events. Questions are about scheduling, attendees, agendas, or recap content. If asked to schedule, propose times relative to other family commitments visible in their calendar.",
  "/messages": () =>
    "The user is on Messages. Be careful with privacy — they may show you a draft or a thread; do not assume any other family member has seen it.",
  "/library": () =>
    "The user is in the (admin) Library curating canonical lessons or documents. Treat this as a creator / curator surface, not a family-member-facing one.",
};

function defaultRouteGuidance(): string {
  return "No page-specific scaffolding for this route — answer the user's question directly.";
}
