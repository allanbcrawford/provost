import {
  FormArgsSchema,
  GenerateSignalsArgsSchema,
  NavigateArgsSchema,
  RenderFamilyGraphArgsSchema,
  RenderWaterfallSimulationArgsSchema,
} from "@provost/schemas/tools";
import { registerTool } from "./registry";

export function registerAllTools(): void {
  registerTool({
    name: "navigate",
    description: "Navigate the user to a specific route in the application.",
    argsSchema: NavigateArgsSchema,
    approvalRequired: false,
    surfaces: ["any"],
    handlerRef: "agent/tools/navigate:handle",
  });

  registerTool({
    name: "form",
    description: "Open a dynamic form to collect structured input from the user.",
    argsSchema: FormArgsSchema,
    approvalRequired: false,
    surfaces: ["any"],
    handlerRef: "agent/tools/form:handle",
  });

  registerTool({
    name: "render_waterfall_simulation",
    description:
      "Open the inheritance waterfall simulation modal with pre-seeded revisions (fundRevocable, ilit, buysell, portability, qtip) and custom edits (childrenPct, trustBFunding, deathOrder).",
    argsSchema: RenderWaterfallSimulationArgsSchema,
    approvalRequired: false,
    surfaces: ["family", "simulations", "any"],
    handlerRef: "agent/tools/renderWaterfallSimulation:handle",
  });

  registerTool({
    name: "render_family_graph",
    description:
      "Focus the family graph on a specific member/document/signal and optionally filter layers or show only flagged entities.",
    argsSchema: RenderFamilyGraphArgsSchema,
    approvalRequired: false,
    surfaces: ["family", "signals", "any"],
    handlerRef: "agent/tools/renderFamilyGraph:handle",
  });

  registerTool({
    name: "generate_signals",
    description:
      "Scan the family's members and documents with the rule engine and refresh the signals inbox.",
    argsSchema: GenerateSignalsArgsSchema,
    approvalRequired: false,
    surfaces: ["signals", "family", "any"],
    handlerRef: "agent/tools/generateSignals:handle",
  });
}
