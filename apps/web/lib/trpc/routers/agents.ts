import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@repo/db";
import type { StepRecord } from "@repo/agents";
import { router, protectedProcedure, requireRole, audit } from "../server";
import {
  agentTypeSchema,
  enqueueAgentJob,
  processAvailableJobs,
  executeProposedAction,
  rejectProposedAction,
  routeIntent,
  runCopilotChat,
  attachToolAction,
  startRun,
  endRun,
  getTool,
  canApproveTool,
  toolRegistry,
  getEmbeddingProvider,
  ingestCompanyData,
  findStoredCopilotSuggestion,
  canProcessCompanyDataWithProvider,
  AgentAuthorizationError,
  evaluateGuard,
} from "@repo/agents";
import { checkRateLimit } from "../../rate-limit";
import { agentActivityInputSchema } from "../../agent-inputs";

const ownerGuard = requireRole("OWNER", "ADMIN");
const queueGuard = requireRole("OWNER", "ADMIN", "FINANCE");
const agentDataGuard = requireRole("OWNER", "ADMIN", "MANAGER", "FINANCE");

export const agentsRouter = router({
  /** Returns agent configuration for the active company. */
  configList: protectedProcedure.use(ownerGuard).query(async ({ ctx }) => {
    const configs = await ctx.prisma.agentConfig.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { agentType: "asc" },
    });
    const runs = await ctx.prisma.agentRun.groupBy({
      by: ["agentType"],
      _count: { _all: true },
      _sum: { totalTokens: true },
      where: { companyId: ctx.companyId },
    });
    return { configs, runs };
  }),

  configUpdate: protectedProcedure
    .use(ownerGuard)
    .input(
      z.object({
        agentType: agentTypeSchema,
        enabled: z.boolean().optional(),
        mode: z.enum(["PROPOSE", "AUTO"]).optional(),
        toolOverrides: z
          .record(z.string(), z.enum(["PROPOSE", "AUTO"]))
          .optional(),
        autoActionThreshold: z.number().nullable().optional(),
        monthlyTokenBudget: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const update: Record<string, unknown> = {};
      if (input.enabled !== undefined) update.enabled = input.enabled;
      if (input.mode !== undefined) update.mode = input.mode;
      if (input.toolOverrides !== undefined)
        update.toolOverrides = input.toolOverrides;
      if (input.autoActionThreshold !== undefined)
        update.autoActionThreshold = input.autoActionThreshold;
      if (input.monthlyTokenBudget !== undefined)
        update.monthlyTokenBudget = input.monthlyTokenBudget;

      const config = await ctx.prisma.agentConfig.upsert({
        where: {
          companyId_agentType: {
            companyId: ctx.companyId,
            agentType: input.agentType,
          },
        },
        create: {
          companyId: ctx.companyId,
          agentType: input.agentType,
          enabled: input.enabled ?? true,
          mode: input.mode ?? "PROPOSE",
          toolOverrides: (input.toolOverrides ?? {}) as Record<string, string>,
          autoActionThreshold: input.autoActionThreshold ?? null,
          monthlyTokenBudget: input.monthlyTokenBudget ?? 100000,
        },
        update: update as never,
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "AGENT_CONFIG_UPDATED",
        entity: "AgentConfig",
        entityId: config.id,
        metadata: { agentType: input.agentType, changes: update },
      });
      return config;
    }),

  /** Rebuilds the active company's freelancer, project, invoice, and compliance embeddings. */
  reindexEmbeddings: protectedProcedure
    .use(ownerGuard)
    .mutation(async ({ ctx }) => {
      const provider = getEmbeddingProvider();
      if (!canProcessCompanyDataWithProvider(ctx.companyId, provider)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "External AI data processing is not enabled for this company",
        });
      }
      const result = await ingestCompanyData(
        ctx.prisma,
        ctx.companyId,
        provider,
      );
      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "AGENT_EMBEDDINGS_REINDEXED",
        entity: "AgentEmbedding",
        metadata: { ...result, provider: provider.name },
      });
      return result;
    }),

  /** Returns current-month token usage, budgets, and weekly history. */
  costDashboard: protectedProcedure.query(async ({ ctx }) => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const since = new Date(monday.getTime() - 7 * 7 * 86400000);

    const [configs, usage, runs] = await Promise.all([
      ctx.prisma.agentConfig.findMany({
        where: { companyId: ctx.companyId },
      }),
      ctx.prisma.agentRun.groupBy({
        by: ["agentType"],
        _sum: { totalTokens: true },
        where: { companyId: ctx.companyId, startedAt: { gte: monthStart } },
      }),
      ctx.prisma.agentRun.findMany({
        where: { companyId: ctx.companyId, startedAt: { gte: since } },
        select: { agentType: true, totalTokens: true, startedAt: true },
        orderBy: { startedAt: "asc" },
      }),
    ]);

    const budgetByType = new Map(
      configs.map((c) => [c.agentType, c.monthlyTokenBudget ?? 100000]),
    );
    const usedByType = new Map(
      usage.map((u) => [u.agentType, u._sum.totalTokens ?? 0]),
    );

    const weeklyMap = new Map<
      string,
      { total: number; by: Record<string, number> }
    >();
    for (const r of runs) {
      const d = new Date(r.startedAt);
      const w = new Date(d);
      w.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      w.setHours(0, 0, 0, 0);
      const key = w.toISOString().slice(0, 10);
      const entry = weeklyMap.get(key) ?? { total: 0, by: {} };
      entry.total += r.totalTokens;
      entry.by[r.agentType] = (entry.by[r.agentType] ?? 0) + r.totalTokens;
      weeklyMap.set(key, entry);
    }
    const weekly = [...weeklyMap.keys()]
      .sort()
      .slice(-8)
      .map((weekStart) => ({ weekStart, ...weeklyMap.get(weekStart)! }));

    const usageList = [...budgetByType.entries()].map(([agentType, budget]) => {
      const used = usedByType.get(agentType) ?? 0;
      const percent = budget > 0 ? Math.round((used / budget) * 100) : 0;
      return { agentType, used, budget, percent, alert: percent >= 80 };
    });

    return {
      usage: usageList,
      weekly,
      monthTotal: usage.reduce((s, u) => s + (u._sum.totalTokens ?? 0), 0),
    };
  }),

  /** Returns pending proposals that the current role is allowed to approve. */
  queue: protectedProcedure.use(queueGuard).query(async ({ ctx }) => {
    const approvableTools = toolRegistry
      .filter((tool) => canApproveTool(tool, ctx.membership.role))
      .map((tool) => tool.name);
    if (approvableTools.length === 0) return [];

    return ctx.prisma.agentAction.findMany({
      where: {
        run: { companyId: ctx.companyId },
        status: "PENDING",
        tool: { in: approvableTools },
      },
      orderBy: { createdAt: "asc" },
      include: {
        run: {
          select: { id: true, agentType: true, intent: true, model: true },
        },
      },
      take: 100,
    });
  }),

  approve: protectedProcedure
    .use(queueGuard)
    .input(z.object({ actionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      let result;
      try {
        result = await executeProposedAction(
          ctx.prisma,
          input.actionId,
          ctx.userId,
          ctx.companyId,
          ctx.membership.role,
        );
      } catch (error) {
        if (error instanceof AgentAuthorizationError) {
          throw new TRPCError({ code: "FORBIDDEN", message: error.message });
        }
        throw error;
      }

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: result.deniedReason
          ? "AGENT_ACTION_AUTO_REJECTED"
          : "AGENT_ACTION_APPROVED",
        entity: "AgentAction",
        entityId: input.actionId,
        metadata: {
          tool: result.action.tool,
          deniedReason: result.deniedReason ?? null,
          error: result.executeResult?.error ?? null,
        },
      });

      return {
        action: result.action,
        deniedReason: result.deniedReason ?? null,
        executeError: result.executeResult?.error ?? null,
      };
    }),

  reject: protectedProcedure
    .use(queueGuard)
    .input(z.object({ actionId: z.string(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      let action;
      try {
        action = await rejectProposedAction(
          ctx.prisma,
          input.actionId,
          ctx.userId,
          input.reason,
          ctx.companyId,
          ctx.membership.role,
        );
      } catch (error) {
        if (error instanceof AgentAuthorizationError) {
          throw new TRPCError({ code: "FORBIDDEN", message: error.message });
        }
        throw error;
      }

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "AGENT_ACTION_REJECTED",
        entity: "AgentAction",
        entityId: input.actionId,
        metadata: { tool: action.tool, reason: input.reason },
      });
      return action;
    }),

  /** Returns the paginated agent-run activity log. */
  activity: protectedProcedure
    .use(agentDataGuard)
    .input(agentActivityInputSchema)
    .query(async ({ input, ctx }) => {
      const skip = (input.page - 1) * input.limit;
      const where: Prisma.AgentRunWhereInput = { companyId: ctx.companyId };
      if (input.status) where.status = input.status;
      const [data, total] = await Promise.all([
        ctx.prisma.agentRun.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            agentType: true,
            triggerType: true,
            intent: true,
            status: true,
            model: true,
            totalTokens: true,
            startedAt: true,
            finishedAt: true,
            _count: { select: { actions: true } },
          },
        }),
        ctx.prisma.agentRun.count({ where }),
      ]);

      return {
        data,
        meta: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  /** Runs one agent cycle for manual operations and demonstrations. */
  runNow: protectedProcedure
    .use(ownerGuard)
    .input(z.object({ agentType: agentTypeSchema }))
    .mutation(async ({ input, ctx }) => {
      const triggerType =
        input.agentType === "BILLING" ? "CRON_WEEKLY" : "CRON_DAILY";
      await enqueueAgentJob(ctx.prisma, {
        companyId: ctx.companyId,
        agentType: input.agentType,
        triggerType,
        dedupe: true,
      });
      const { processed, results } = await processAvailableJobs(ctx.prisma, {
        limit: 1,
        companyId: ctx.companyId,
      });
      return { message: `Process completed (${processed} jobs)`, results };
    }),

  /** Returns concise agent status for navigation badges and summaries. */
  status: protectedProcedure.query(async ({ ctx }) => {
    const [configs, pending] = await Promise.all([
      ctx.prisma.agentConfig.findMany({
        where: { companyId: ctx.companyId },
      }),
      ctx.prisma.agentAction.count({
        where: { run: { companyId: ctx.companyId }, status: "PENDING" },
      }),
    ]);
    const byType = new Map(configs.map((c) => [c.agentType, c]));
    return {
      pending,
      billing: {
        enabled: byType.get("BILLING")?.enabled ?? true,
        mode: byType.get("BILLING")?.mode ?? "PROPOSE",
      },
      compliance: {
        enabled: byType.get("COMPLIANCE")?.enabled ?? true,
        mode: byType.get("COMPLIANCE")?.mode ?? "PROPOSE",
      },
      copilot: {
        enabled: byType.get("OPS_COPILOT")?.enabled ?? true,
        mode: byType.get("OPS_COPILOT")?.mode ?? "PROPOSE",
      },
    };
  }),

  /** Runs rule-based copilot intent routing and company-context suggestions. */
  chat: protectedProcedure
    .use(agentDataGuard)
    .input(
      z.object({
        message: z.string().min(1).max(400).trim(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!checkRateLimit(`agent-chat:${ctx.userId}`, 30, 15 * 60 * 1000)) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many copilot requests. Please try again later.",
        });
      }
      const copilot = await ctx.prisma.agentConfig.findUnique({
        where: {
          companyId_agentType: {
            companyId: ctx.companyId,
            agentType: "OPS_COPILOT",
          },
        },
      });
      if (!copilot?.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Ops Copilot is disabled. Enable it in Config Agents to use chat.",
        });
      }

      const decision = routeIntent(input.message);
      const { runId, answer, suggestions } = await runCopilotChat(
        ctx.prisma,
        ctx.companyId,
        decision,
        input.message,
      );

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "AGENT_CHAT_QUERIED",
        entity: "AgentRun",
        entityId: runId,
        metadata: {
          intent: decision.intent,
          question: input.message.slice(0, 200),
        },
      });

      return { runId, intent: decision.intent, answer, suggestions };
    }),

  /** Applies a recent server-issued suggestion after re-running all guards. */
  applySuggestion: protectedProcedure
    .use(agentDataGuard)
    .input(
      z.object({
        runId: z.string(),
        suggestionId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (
        !checkRateLimit(`agent-suggestion:${ctx.userId}`, 20, 15 * 60 * 1000)
      ) {
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many suggestion requests. Please try again later.",
        });
      }
      const sourceRun = await ctx.prisma.agentRun.findFirst({
        where: {
          id: input.runId,
          companyId: ctx.companyId,
          agentType: "OPS_COPILOT",
          triggerType: "USER_CHAT",
          status: "SUCCEEDED",
          startedAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
        },
        select: { id: true, steps: true },
      });
      if (!sourceRun) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Suggestion is missing, expired, or belongs to another company",
        });
      }

      const suggestion = findStoredCopilotSuggestion(
        sourceRun.steps,
        input.suggestionId,
      );
      if (!suggestion) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Suggestion is not part of the referenced chat run",
        });
      }

      const tool = getTool(suggestion.tool);
      if (!tool) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Unknown tool" });
      }

      const config = await ctx.prisma.agentConfig.findUnique({
        where: {
          companyId_agentType: {
            companyId: ctx.companyId,
            agentType: "OPS_COPILOT",
          },
        },
      });
      if (!config?.enabled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Agent is disabled for this company.",
        });
      }

      const parsedInput = tool.inputSchema.safeParse(suggestion.params);
      if (!parsedInput.success) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Stored suggestion input is invalid",
        });
      }
      const preflight = await evaluateGuard({
        tool,
        ctx: {
          companyId: ctx.companyId,
          prisma: ctx.prisma,
          actorRole: ctx.membership.role,
          triggeredBy: ctx.userId,
        },
        input: parsedInput.data,
        config,
      });
      if (!preflight.allowed) {
        const forbidden = preflight.reason?.startsWith("role ");
        throw new TRPCError({
          code: forbidden ? "FORBIDDEN" : "CONFLICT",
          message: preflight.reason ?? "Suggestion was denied by guardrails",
        });
      }

      let actionRun;
      try {
        actionRun = await startRun(ctx.prisma, {
          id: `suggestion-${sourceRun.id}-${suggestion.id}`,
          companyId: ctx.companyId,
          agentType: "OPS_COPILOT",
          triggerType: "USER_CHAT",
          intent: `apply_suggestion:${sourceRun.id}:${suggestion.id}`,
          model: "rule-based",
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Suggestion has already been consumed",
          });
        }
        throw error;
      }

      const steps: StepRecord[] = [];
      let result;
      try {
        result = await attachToolAction({
          prisma: ctx.prisma,
          runId: actionRun.id,
          companyId: ctx.companyId,
          agentType: "OPS_COPILOT",
          tool,
          input: suggestion.params,
          actorRole: ctx.membership.role,
          triggeredBy: ctx.userId,
          steps,
        });
        await endRun(ctx.prisma, actionRun.id, {
          status: "SUCCEEDED",
          steps,
        });
      } catch (error) {
        await endRun(ctx.prisma, actionRun.id, {
          status: "FAILED",
          steps,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: result.deniedReason
          ? "AGENT_SUGGESTION_DENIED"
          : result.executed
            ? "AGENT_SUGGESTION_EXECUTED"
            : "AGENT_SUGGESTION_PROPOSED",
        entity: "AgentAction",
        entityId: result.action?.id ?? null,
        metadata: {
          tool: suggestion.tool,
          sourceRunId: sourceRun.id,
          suggestionId: suggestion.id,
          deniedReason: result.deniedReason ?? null,
        },
      });

      return {
        actionId: result.action?.id ?? null,
        status: result.deniedReason
          ? "DENIED"
          : result.executed
            ? "EXECUTED"
            : "PROPOSED",
        reason: result.deniedReason ?? null,
      };
    }),
});
