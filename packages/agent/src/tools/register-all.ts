import { FormArgsSchema, NavigateArgsSchema } from "@provost/schemas/tools";
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
}
