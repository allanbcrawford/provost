"use client";

import type { Id } from "../../../../convex/_generated/dataModel";
import { FormToolWidget, type FormToolWidgetProps } from "./form-tool";
import { NavigateToolWidget } from "./navigate-tool";

type WidgetRendererProps = {
  kind: string;
  props: Record<string, unknown>;
};

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
  };

export function renderWidget({ kind, props }: WidgetRendererProps): React.ReactNode {
  const renderer = WIDGET_RENDERERS[kind];
  if (!renderer) return null;
  return renderer(props);
}
