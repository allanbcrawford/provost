"use client";

import { usePathname, useRouter } from "next/navigation";
import { useWidgetPortal } from "@/context/widget-portal-context";
import type { Id } from "../../../../convex/_generated/dataModel";
import { type CiteCitation, CiteWidget } from "./cite-widget";
import { FormToolWidget, type FormToolWidgetProps } from "./form-tool";
import { NavigateToolWidget } from "./navigate-tool";
import { TaskToolWidget, type TaskToolWidgetProps } from "./task-widget";

type WidgetRendererProps = {
  kind: string;
  props: Record<string, unknown>;
};

function WaterfallInlineCard(props: Record<string, unknown>) {
  const router = useRouter();
  const pathname = usePathname();
  const portal = useWidgetPortal();

  const handleOpen = () => {
    portal.push("family-page", { kind: "waterfall", props });
    if (pathname !== "/family") router.push("/family");
  };

  return (
    <div className="rounded-[8px] border border-provost-border-subtle bg-provost-bg-muted px-3 py-2.5 text-[12.5px] text-provost-text-secondary">
      <div className="mb-2 font-semibold text-provost-text-primary">
        Inheritance Waterfall Simulation ready
      </div>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-[6px] border border-provost-border-subtle bg-provost-bg-primary px-3 py-1.5 text-[12px] font-medium text-provost-text-primary hover:bg-provost-bg-hover"
      >
        Open Inheritance Waterfall Simulation
      </button>
    </div>
  );
}

function GraphFocusInlineCard(props: Record<string, unknown>) {
  const router = useRouter();
  const pathname = usePathname();
  const portal = useWidgetPortal();

  if (pathname === "/family") return null;

  const handleOpen = () => {
    portal.push("family-page", { kind: "graph-focus", props });
    router.push("/family");
  };

  return (
    <div className="rounded-[8px] border border-provost-border-subtle bg-provost-bg-muted px-3 py-2.5 text-[12.5px] text-provost-text-secondary">
      <div className="mb-2 font-semibold text-provost-text-primary">Family graph focus ready</div>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-[6px] border border-provost-border-subtle bg-provost-bg-primary px-3 py-1.5 text-[12px] font-medium text-provost-text-primary hover:bg-provost-bg-hover"
      >
        Open family graph
      </button>
    </div>
  );
}

type LibraryResult = {
  sourceId: string;
  title: string;
  category: string;
  snippet: string;
};

function LibraryResultsInlineCard(props: Record<string, unknown>) {
  const query = (props.query as string | undefined) ?? "";
  const results = (props.results as LibraryResult[] | undefined) ?? [];

  if (results.length === 0) {
    return (
      <div className="rounded-[8px] border border-provost-border-subtle bg-provost-bg-muted px-3 py-2.5 text-[12.5px] text-provost-text-secondary">
        No library results{query ? ` for "${query}"` : ""}.
      </div>
    );
  }

  return (
    <div className="rounded-[8px] border border-provost-border-subtle bg-provost-bg-muted px-3 py-2.5 text-[12.5px] text-provost-text-secondary">
      <div className="mb-2 font-semibold text-provost-text-primary">
        Library results{query ? ` for "${query}"` : ""} ({results.length})
      </div>
      <ul className="flex flex-col gap-1.5">
        {results.map((r) => (
          <li
            key={r.sourceId}
            className="rounded-[6px] border border-provost-border-subtle bg-provost-bg-primary px-2.5 py-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-medium text-provost-text-primary">
                  {r.title}
                </div>
                <div className="truncate text-[11.5px] text-provost-text-secondary">
                  {r.category}
                  {r.snippet ? ` — ${r.snippet}` : ""}
                </div>
              </div>
              <a
                href={`/library/${r.sourceId}`}
                className="shrink-0 text-[11.5px] font-medium text-provost-text-primary underline"
              >
                Open →
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export const WIDGET_RENDERERS: Record<string, (props: Record<string, unknown>) => React.ReactNode> =
  {
    navigate: (props) => <NavigateToolWidget path={props.path as string} />,
    form: (props) => (
      <FormToolWidget
        title={props.title as string}
        description={props.description as string | undefined}
        fields={props.fields as FormToolWidgetProps["fields"]}
        runId={props.runId as Id<"thread_runs">}
        toolCallId={props.toolCallId as string}
      />
    ),
    waterfall: (props) => <WaterfallInlineCard {...props} />,
    "graph-focus": (props) => <GraphFocusInlineCard {...props} />,
    cite: (props) => (
      <CiteWidget
        documentId={props.documentId as string}
        page={props.page as number | null | undefined}
        explanation={props.explanation as string}
        citations={(props.citations as CiteCitation[] | undefined) ?? []}
      />
    ),
    "library-results": (props) => <LibraryResultsInlineCard {...props} />,
    task: (props) => (
      <TaskToolWidget
        taskId={props.taskId as string}
        title={props.title as string}
        assigneeType={props.assigneeType as TaskToolWidgetProps["assigneeType"]}
        status={props.status as TaskToolWidgetProps["status"]}
      />
    ),
    "signals-refreshed": (props) => (
      <div className="rounded-[8px] border border-provost-border-subtle bg-provost-bg-muted px-3 py-2.5 text-[12.5px] text-provost-text-secondary">
        Refreshed {props.count as number} signals.{" "}
        <a className="font-medium text-provost-text-primary underline" href="/signals">
          View inbox →
        </a>
      </div>
    ),
  };

export function renderWidget({ kind, props }: WidgetRendererProps): React.ReactNode {
  const renderer = WIDGET_RENDERERS[kind];
  if (!renderer) return null;
  return renderer(props);
}
