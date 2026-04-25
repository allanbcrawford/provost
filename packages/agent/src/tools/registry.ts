import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export type ToolSurface =
  | "family"
  | "documents"
  | "library"
  | "lessons"
  | "signals"
  | "simulations"
  | "professionals"
  | "governance"
  | "any";

export type ToolDefinition<TArgs = unknown, _TResult = unknown> = {
  name: string;
  description: string;
  argsSchema: z.ZodType<TArgs>;
  approvalRequired: boolean;
  surfaces: ToolSurface[];
  rolesAllowed?: Array<"admin" | "member" | "advisor" | "trustee">;
  handlerRef: string; // key for looking up Convex function handler, e.g. "agent/tools/navigate:handle"
};

const registry = new Map<string, ToolDefinition<any, any>>();

export function registerTool(def: ToolDefinition<any, any>) {
  if (registry.has(def.name)) throw new Error(`tool ${def.name} already registered`);
  registry.set(def.name, def);
  return def;
}

export function getTool(name: string): ToolDefinition | undefined {
  return registry.get(name);
}

export function listTools(): ToolDefinition[] {
  return Array.from(registry.values());
}

export function toolsForSurface(surface: ToolSurface, role?: string): ToolDefinition[] {
  return listTools().filter((t) => {
    const surfaceOk = t.surfaces.includes("any") || t.surfaces.includes(surface);
    const roleOk = !t.rolesAllowed || (role && t.rolesAllowed.includes(role as any));
    return surfaceOk && roleOk;
  });
}

export function toOpenAITools(defs: ToolDefinition[]): Array<{
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  return defs.map((d) => ({
    type: "function",
    function: {
      name: d.name,
      description: d.description,
      parameters: zodToJsonSchema(d.argsSchema, { target: "openApi3" }) as Record<string, unknown>,
    },
  }));
}
