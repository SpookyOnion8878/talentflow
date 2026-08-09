import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { timesheetSchema, paginationSchema } from "@repo/validators";
import { Prisma } from "@repo/db";
import type { TimesheetStatus } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { enqueueAgentJob } from "@repo/agents";

const managerGuard = requireRole("OWNER", "ADMIN", "MANAGER", "FINANCE");

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
      const where: Prisma.TimesheetWhereInput = {
        freelancer: { companyId: ctx.companyId },
      };

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
            freelancer: true,
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
        data,
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
      const where = { submittedById: ctx.userId };

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
        });
        if (!contract)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Contract not found",
          });
      }

      const timesheet = await ctx.prisma.timesheet.create({
        data: { ...input, submittedById: ctx.userId, status: "PENDING" },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "TIMESHEET_SUBMITTED",
        entity: "Timesheet",
        entityId: timesheet.id,
        metadata: {
          hours: timesheet.hours,
          date: timesheet.date.toISOString(),
        },
      });

      return timesheet;
    }),

  approve: protectedProcedure
    .use(managerGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const timesheet = await ctx.prisma.timesheet.findFirst({
        where: { id: input.id, freelancer: { companyId: ctx.companyId } },
      });
      if (!timesheet)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Timesheet not found",
        });
      if (timesheet.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending timesheets can be approved",
        });
      }

      const updated = await ctx.prisma.timesheet.update({
        where: { id: input.id },
        data: {
          status: "APPROVED",
          approvedBy: ctx.userId,
          approvedAt: new Date(),
        },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "TIMESHEET_APPROVED",
        entity: "Timesheet",
        entityId: input.id,
        metadata: { hours: timesheet.hours },
      });

      // Trigger AI Agent: kali approved akan di-queue untuk draft invoice.
      try {
        await enqueueAgentJob(ctx.prisma, {
          companyId: ctx.companyId,
          agentType: "BILLING",
          triggerType: "TIMESHEET_APPROVED",
        });
      } catch (err) {
        console.error("[agents] enqueue TIMESHEET_APPROVED gagal", err);
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
        where: { id: input.id, freelancer: { companyId: ctx.companyId } },
      });
      if (!timesheet)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Timesheet not found",
        });
      if (timesheet.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only pending timesheets can be rejected",
        });
      }

      const updated = await ctx.prisma.timesheet.update({
        where: { id: input.id },
        data: {
          status: "REJECTED",
          rejectReason: input.reason,
          approvedBy: ctx.userId,
          approvedAt: new Date(),
        },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "TIMESHEET_REJECTED",
        entity: "Timesheet",
        entityId: input.id,
        metadata: { reason: input.reason },
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
        freelancer: { companyId: ctx.companyId },
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
        include: { freelancer: true, contract: true },
      });
      const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);
      const pendingCount = await ctx.prisma.timesheet.count({
        where: { status: "PENDING", freelancer: { companyId: ctx.companyId } },
      });

      return { totalHours, pendingCount, entryCount: timesheets.length };
    }),
});
