"use client";

import { usePathname, useRouter } from "next/navigation";
import { useWidgetPortal } from "@/context/widget-portal-context";
import type { Id } from "../../../../convex/_generated/dataModel";
import { FormToolWidget, type FormToolWidgetProps } from "./form-tool";
import { NavigateToolWidget } from "./navigate-tool";

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
  };

export function renderWidget({ kind, props }: WidgetRendererProps): React.ReactNode {
  const renderer = WIDGET_RENDERERS[kind];
  if (!renderer) return null;
  return renderer(props);
}
