import type { PrismaClient, AgentConfig } from "@repo/db";
import type { GuardResult, Role, ToolContext, ToolDef } from "../types";

export interface EvaluateOptions {
  tool: ToolDef;
  ctx: ToolContext;
  input: unknown;
  config: AgentConfig | null;
}

export function canApproveTool(tool: ToolDef, role: Role): boolean {
  return tool.approvalPermission?.includes(role) ?? false;
}

/**
 * Evaluates enablement, actor permission, execution mode, monetary threshold,
 * and idempotency before a tool action can be created or executed.
 */
export async function evaluateGuard({
  tool,
  ctx,
  input,
  config,
}: EvaluateOptions): Promise<GuardResult> {
  if (!config?.enabled) {
    return { allowed: false, reason: "agent is disabled", mode: "PROPOSE" };
  }

  // Approval permissions are intentionally distinct from automation rights.
  const roleAllowed = ctx.actorRole
    ? ctx.isApproval
      ? canApproveTool(tool, ctx.actorRole)
      : tool.permission.includes(ctx.actorRole)
    : true;
  if (!roleAllowed) {
    return {
      allowed: false,
      reason: `role ${ctx.actorRole} is not allowed to call tool ${tool.name}`,
      mode: "PROPOSE",
    };
  }

  // Read-only tools stay automatic; mutating tools inherit the company mode.
  let mode = tool.readOnly ? "AUTO" : config.mode;
  const override = (config.toolOverrides as Record<string, string> | null)?.[
    tool.name
  ];
  if (!tool.readOnly && (override === "AUTO" || override === "PROPOSE")) {
    mode = override;
  }

  // Monetary actions above the configured threshold always require approval.
  const amount = tool.monetary?.(input) ?? null;
  if (
    amount != null &&
    config.autoActionThreshold != null &&
    amount > config.autoActionThreshold
  ) {
    mode = "PROPOSE";
  }

  // Idempotency rejects a key that has already been executed successfully.
  if (tool.idempotencyKey) {
    const key = await tool.idempotencyKey(ctx, input);
    if (key) {
      const existing = await ctx.prisma.agentAction.findFirst({
        where: {
          tool: tool.name,
          idempotencyKey: key,
        },
        select: { id: true },
      });
      if (existing) {
        return {
          allowed: false,
          reason: `duplicate action (${key}) already exists`,
          mode,
        };
      }
      return { allowed: true, mode, idempotencyKey: key };
    }
  }

  return { allowed: true, mode };
}
