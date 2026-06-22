import type { ToolDef } from "./types.js";
import { planToolDef } from "../commands/plan/index.js";
import { helpToolDef } from "../commands/help/index.js";

export const registry: ReadonlyMap<string, ToolDef> = new Map<string, ToolDef>([
  [planToolDef.name, planToolDef as ToolDef],
  [helpToolDef.name, helpToolDef as ToolDef],
]);

export function getToolDef(name: string): ToolDef | undefined {
  return registry.get(name);
}

export function getCliTools(): ToolDef[] {
  return [...registry.values()].filter((t) => t.cli);
}

export function getMcpTools(): ToolDef[] {
  return [...registry.values()].filter((t) => t.mcp);
}
