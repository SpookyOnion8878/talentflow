import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { timesheetSchema, paginationSchema } from "@repo/validators";
import {
  Prisma,
  canTransition,
  decimalToNumber,
  timesheetTransitions,
} from "@repo/db";
import type { TimesheetStatus } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { enqueueAgentJob } from "@repo/agents";
import { freelancerPublicSelect } from "../../freelancer-access";

const managerGuard = requireRole("OWNER", "ADMIN", "MANAGER", "FINANCE");

function requireTimesheetTransition(from: string, to: string): void {
  if (!canTransition(timesheetTransitions, from, to)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Timesheet cannot transition from ${from} to ${to}`,
    });
  }
}

export const timesheetRouter = router({
  list: protectedProcedure
    .input(
      paginationSchema.extend({
        status: z.string().optional(),
        freelancerId: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const skip = (input.page - 1) * input.limit;
      const where: Prisma.TimesheetWhereInput = { companyId: ctx.companyId };

      if (input.status && input.status !== "ALL")
        where.status = input.status as TimesheetStatus;
      if (input.freelancerId) where.freelancerId = input.freelancerId;

      const [data, total] = await Promise.all([
        ctx.prisma.timesheet.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { date: "desc" },
          include: {
            freelancer: { select: freelancerPublicSelect },
            project: { select: { id: true, name: true } },
            contract: {
              select: {
                id: true,
                contractNo: true,
                ratePerHour: true,
                currency: true,
              },
            },
            submitter: { select: { name: true } },
            approver: { select: { name: true } },
          },
        }),
        ctx.prisma.timesheet.count({ where }),
      ]);

      return {
        data: data.map((timesheet) => ({
          ...timesheet,
          contract: timesheet.contract
            ? {
                ...timesheet.contract,
                ratePerHour: decimalToNumber(timesheet.contract.ratePerHour),
              }
            : null,
        })),
        meta: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  myTimesheets: protectedProcedure
    .input(paginationSchema)
    .query(async ({ input, ctx }) => {
      const skip = (input.page - 1) * input.limit;
      const where = { submittedById: ctx.userId, companyId: ctx.companyId };

      const [data, total] = await Promise.all([
        ctx.prisma.timesheet.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { date: "desc" },
          include: {
            freelancer: {
              select: { id: true, firstName: true, lastName: true },
            },
            project: { select: { id: true, name: true } },
          },
        }),
        ctx.prisma.timesheet.count({ where }),
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

  submit: protectedProcedure
    .use(managerGuard)
    .input(timesheetSchema)
    .mutation(async ({ input, ctx }) => {
      let resolvedProjectId = input.projectId;
      const freelancer = await ctx.prisma.freelancer.findFirst({
        where: { id: input.freelancerId, companyId: ctx.companyId },
      });
      if (!freelancer)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Freelancer not found",
        });

      if (input.projectId) {
        const project = await ctx.prisma.project.findFirst({
          where: { id: input.projectId, companyId: ctx.companyId },
        });
        if (!project)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
      }

      if (input.contractId) {
        const contract = await ctx.prisma.contract.findFirst({
          where: {
            id: input.contractId,
            companyId: ctx.companyId,
            freelancerId: input.freelancerId,
          },
          select: { projectId: true },
        });
        if (!contract)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contract not found",
          });
        if (resolvedProjectId && contract.projectId !== resolvedProjectId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Contract does not belong to the selected project",
          });
        }
        resolvedProjectId ??= contract.projectId ?? undefined;
      }

      const timesheet = await ctx.prisma.$transaction(async (transaction) => {
        const created = await transaction.timesheet.create({
          data: {
            ...input,
            companyId: ctx.companyId,
            projectId: resolvedProjectId,
            submittedById: ctx.userId,
            status: "PENDING",
          },
        });
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "TIMESHEET_SUBMITTED",
          entity: "Timesheet",
          entityId: created.id,
          metadata: {
            hours: created.hours,
            date: created.date.toISOString(),
          },
        });
        return created;
      });

      return timesheet;
    }),

  approve: protectedProcedure
    .use(managerGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const timesheet = await ctx.prisma.timesheet.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!timesheet)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Timesheet not found",
        });
      requireTimesheetTransition(timesheet.status, "APPROVED");

      const updated = await ctx.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.timesheet.updateMany({
          where: {
            id: input.id,
            companyId: ctx.companyId,
            status: timesheet.status,
          },
          data: {
            status: "APPROVED",
            approvedBy: ctx.userId,
            approvedAt: new Date(),
          },
        });
        if (claimed.count !== 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Timesheet status changed during this request",
          });
        }
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "TIMESHEET_APPROVED",
          entity: "Timesheet",
          entityId: input.id,
          metadata: { hours: timesheet.hours },
        });
        return transaction.timesheet.findUniqueOrThrow({
          where: { id: input.id },
        });
      });

      // Trigger the AI agent after approval so it can queue a draft invoice.
      try {
        await enqueueAgentJob(ctx.prisma, {
          companyId: ctx.companyId,
          agentType: "BILLING",
          triggerType: "TIMESHEET_APPROVED",
        });
      } catch (err) {
        console.error("[agents] failed to enqueue TIMESHEET_APPROVED", err);
      }

      return updated;
    }),

  reject: protectedProcedure
    .use(managerGuard)
    .input(
      z.object({
        id: z.string(),
        reason: z.string().min(1, "Reason is required"),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const timesheet = await ctx.prisma.timesheet.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!timesheet)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Timesheet not found",
        });
      requireTimesheetTransition(timesheet.status, "REJECTED");

      const updated = await ctx.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.timesheet.updateMany({
          where: {
            id: input.id,
            companyId: ctx.companyId,
            status: timesheet.status,
          },
          data: {
            status: "REJECTED",
            rejectReason: input.reason,
            approvedBy: ctx.userId,
            approvedAt: new Date(),
          },
        });
        if (claimed.count !== 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Timesheet status changed during this request",
          });
        }
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "TIMESHEET_REJECTED",
          entity: "Timesheet",
          entityId: input.id,
          metadata: { reason: input.reason },
        });
        return transaction.timesheet.findUniqueOrThrow({
          where: { id: input.id },
        });
      });

      return updated;
    }),

  getSummary: protectedProcedure
    .input(
      z.object({
        freelancerId: z.string().optional(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const where: Prisma.TimesheetWhereInput = {
        status: "APPROVED",
        companyId: ctx.companyId,
      };
      if (input.freelancerId) where.freelancerId = input.freelancerId;
      if (input.startDate || input.endDate) {
        where.date = {
          ...(input.startDate ? { gte: input.startDate } : {}),
          ...(input.endDate ? { lte: input.endDate } : {}),
        };
      }

      const timesheets = await ctx.prisma.timesheet.findMany({
        where,
      });
      const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);
      const pendingCount = await ctx.prisma.timesheet.count({
        where: { status: "PENDING", companyId: ctx.companyId },
      });

      return { totalHours, pendingCount, entryCount: timesheets.length };
    }),
});
