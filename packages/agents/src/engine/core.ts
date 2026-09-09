import type {
  PrismaClient,
  AgentRun,
  AgentAction,
  AgentActionMode,
} from "@repo/db";
import { Prisma } from "@repo/db";
import type {
  AgentType,
  AgentTrigger,
  StepRecord,
  ToolContext,
  ToolDef,
} from "../types";
import { evaluateGuard } from "../guards/pipeline";
import { fetchAgentConfig } from "../config";

export interface RunMeta {
  id?: string;
  companyId: string;
  agentType: AgentType;
  triggerType: AgentTrigger;
  intent?: string;
  model?: string;
}

export async function startRun(
  prisma: PrismaClient,
  meta: RunMeta,
): Promise<AgentRun> {
  return prisma.agentRun.create({
    data: {
      id: meta.id,
      companyId: meta.companyId,
      agentType: meta.agentType,
      triggerType: meta.triggerType,
      intent: meta.intent ?? null,
      model: meta.model ?? null,
      status: "RUNNING",
    },
  });
}

export interface EndRunParams {
  status: "SUCCEEDED" | "FAILED" | "NEEDS_REVIEW";
  steps?: StepRecord[];
  totalTokens?: number;
  error?: string;
}

export async function endRun(
  prisma: PrismaClient,
  runId: string,
  params: EndRunParams,
): Promise<AgentRun> {
  return prisma.agentRun.update({
    where: { id: runId },
    data: {
      status: params.status,
      steps: (params.steps ?? []) as Prisma.InputJsonValue,
      totalTokens: params.totalTokens ?? 0,
      error: params.error ?? null,
      finishedAt: new Date(),
    },
  });
}

/** Checks the current monthly token budget for one company and agent type. */
export async function checkTokenBudget(
  prisma: PrismaClient,
  companyId: string,
  agentType: AgentType,
  budget: number,
): Promise<{ ok: boolean; used: number }> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const agg = await prisma.agentRun.aggregate({
    _sum: { totalTokens: true },
    where: {
      companyId,
      agentType,
      startedAt: { gte: monthStart },
    },
  });

  const used = agg._sum.totalTokens ?? 0;
  return { ok: used < budget, used };
}

export async function writeAudit(
  prisma: PrismaClient,
  params: {
    companyId: string;
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      companyId: params.companyId,
      userId: params.userId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
    },
  });
}

export interface AttachOptions {
  prisma: PrismaClient;
  runId: string;
  companyId: string;
  agentType: AgentType;
  tool: ToolDef;
  input: unknown;
  index?: number;
  actorRole?: ToolContext["actorRole"];
  triggeredBy?: string | null;
  steps?: StepRecord[];
}

export interface AttachResult {
  action?: AgentAction;
  executed?: boolean;
  output?: unknown;
  deniedReason?: string;
}

/** Applies guardrails, persists the action, and executes automatic actions. */
export async function attachToolAction(
  opts: AttachOptions,
): Promise<AttachResult> {
  const config = await fetchAgentConfig(
    opts.prisma,
    opts.companyId,
    opts.agentType,
  );

  const parsed = opts.tool.inputSchema.safeParse(opts.input);
  if (!parsed.success) {
    opts.steps?.push({
      index: opts.index ?? 0,
      tool: opts.tool.name,
      kind: "invalid",
      output: parsed.error.issues,
    });
    return { deniedReason: `Invalid input for ${opts.tool.name}` };
  }
  const input = parsed.data;

  const ctx: ToolContext = {
    companyId: opts.companyId,
    prisma: opts.prisma,
    actorRole: opts.actorRole ?? "SYSTEM",
    triggeredBy: opts.triggeredBy,
  };

  const guard = await evaluateGuard({
    tool: opts.tool,
    ctx,
    input,
    config,
  });

  if (!guard.allowed) {
    opts.steps?.push({
      index: opts.index ?? 0,
      tool: opts.tool.name,
      kind: "denied",
      output: guard.reason,
    });
    return { deniedReason: guard.reason };
  }

  const action = await createActionSafe(opts, guard, input);

  if (!action) {
    opts.steps?.push({
      index: opts.index ?? 0,
      tool: opts.tool.name,
      kind: "denied",
      output: "duplicate action (idempotency key) already exists",
    });
    return {
      deniedReason:
        "duplicate action (idempotency key) already exists (maybe still pending)",
    };
  }

  if (guard.mode === "AUTO") {
    const result = await executeToolAction(
      opts.prisma,
      ctx,
      opts.tool,
      input,
      action,
      "AUTO",
    );
    opts.steps?.push({
      index: opts.index ?? 0,
      tool: opts.tool.name,
      kind: "tool",
      output: result.ok ? result.output : { error: result.error },
    });
    return {
      action,
      executed: result.ok,
      output: result.output,
      deniedReason: undefined,
    };
  }

  opts.steps?.push({
    index: opts.index ?? 0,
    tool: opts.tool.name,
    kind: "tool",
    output: { actionId: action.id, status: "proposed" },
  });
  return { action, executed: false };
}

/** Persists an action while treating a unique-key race as a denied duplicate. */
async function createActionSafe(
  opts: AttachOptions,
  guard: { mode: AgentActionMode; idempotencyKey?: string | null },
  input: unknown,
): Promise<AgentAction | null> {
  try {
    return await opts.prisma.agentAction.create({
      data: {
        runId: opts.runId,
        tool: opts.tool.name,
        input: input as Prisma.InputJsonValue,
        mode: guard.mode,
        status: "PENDING",
        idempotencyKey: guard.idempotencyKey ?? null,
      },
    });
  } catch (err) {
    const isDuplicate =
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      guard.idempotencyKey != null;
    if (isDuplicate) return null;
    throw err;
  }
}

export interface ExecuteResult {
  ok: boolean;
  output?: unknown;
  error?: string;
}

export async function executeToolAction(
  prisma: PrismaClient,
  ctx: ToolContext,
  tool: ToolDef,
  input: unknown,
  action: AgentAction,
  mode: "AUTO" | "PROPOSE",
): Promise<ExecuteResult> {
  try {
    const output = await tool.execute(ctx, input);
    await prisma.agentAction.update({
      where: { id: action.id },
      data: {
        status: mode === "AUTO" ? "AUTO_EXECUTED" : "APPROVED",
        output: output as Prisma.InputJsonValue,
        executedAt: new Date(),
      },
    });
    await writeAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.triggeredBy,
      action: `AGENT_${tool.name.toUpperCase()}`,
      entity: "AgentAction",
      entityId: action.id,
      metadata: {
        runId: action.runId,
        actor: mode,
        actorRole: ctx.actorRole ?? null,
        actorType: ctx.isApproval ? "USER_APPROVAL" : "AGENT",
      },
    });
    return { ok: true, output };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.agentAction.update({
      where: { id: action.id },
      data: { status: "FAILED", error: message },
    });
    await writeAudit(prisma, {
      companyId: ctx.companyId,
      userId: ctx.triggeredBy,
      action: `AGENT_${tool.name.toUpperCase()}_FAILED`,
      entity: "AgentAction",
      entityId: action.id,
      metadata: {
        runId: action.runId,
        error: message,
        actorRole: ctx.actorRole ?? null,
        actorType: ctx.isApproval ? "USER_APPROVAL" : "AGENT",
      },
    });
    return { ok: false, error: message };
  }
}
