import type { PrismaClient, AgentConfig } from "@repo/db";
import type { GuardResult, ToolContext, ToolDef } from "../types";

export interface EvaluateOptions {
  tool: ToolDef;
  ctx: ToolContext;
  input: unknown;
  config: AgentConfig | null;
}

const EXECUTED_STATUSES = ["AUTO_EXECUTED", "APPROVED"] as const;

/**
 * Guard pipeline: entitlement → permission → mode (propose/auto) →
 * budget threshold → idempotency. Terbalik-satu → tolak.
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

  // 1. Permission: hanya untuk aksi yang dipicu pengguna (acton as user).
  if (ctx.actorRole && !tool.permission.includes(ctx.actorRole)) {
    return {
      allowed: false,
      reason: `role ${ctx.actorRole} is not allowed to call tool ${tool.name}`,
      mode: "PROPOSE",
    };
  }

  // 2. Mode akhir = default tool, di-override konfigurasi per-tool.
  let mode = tool.defaultMode;
  const override = (config.toolOverrides as Record<string, string> | null)?.[
    tool.name
  ];
  if (override === "AUTO" || override === "PROPOSE") {
    mode = override;
  }

  // 3. Guard finansial: berapa pun config, melewati threshold → dipaksa PROPOSE.
  const amount = tool.monetary?.(input) ?? null;
  if (
    amount != null &&
    config.autoActionThreshold != null &&
    amount > config.autoActionThreshold
  ) {
    mode = "PROPOSE";
  }

  // 4. Idempotensi: kunci unik per aksi, dicek terhadap aksi sebelumnya.
  if (tool.idempotencyKey) {
    const key = await tool.idempotencyKey(ctx, input);
    if (key) {
      const existing = await ctx.prisma.agentAction.findFirst({
        where: {
          tool: tool.name,
          idempotencyKey: key,
          status: { in: [...EXECUTED_STATUSES] },
        },
        select: { id: true },
      });
      if (existing) {
        return {
          allowed: false,
          reason: `duplicate action (${key}) already executed before`,
          mode,
        };
      }
      return { allowed: true, mode, idempotencyKey: key };
    }
  }

  return { allowed: true, mode };
}
