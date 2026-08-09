import type { ToolDef } from "../types";
import { billingTools } from "./billing";
import { complianceTools } from "./compliance";

export const toolRegistry: ToolDef[] = [...billingTools, ...complianceTools];

export function getTool(name: string): ToolDef | undefined {
  return toolRegistry.find((t) => t.name === name);
}
