import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import {
  projectSchema,
  projectUpdateSchema,
  paginationSchema,
} from "@repo/validators";
import { Prisma, decimalToNumber } from "@repo/db";
import type { ProjectStatus } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { freelancerPublicSelect } from "../../freelancer-access";

const roleGuard = requireRole("OWNER", "ADMIN", "MANAGER");

function serializeProjectMoney<T extends { budget: Prisma.Decimal | null }>(
  project: T,
) {
  return {
    ...project,
    budget: project.budget === null ? null : decimalToNumber(project.budget),
  };
}

export const projectRouter = router({
  list: protectedProcedure
    .input(paginationSchema.extend({ status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const skip = (input.page - 1) * input.limit;
      const where: Prisma.ProjectWhereInput = { companyId: ctx.companyId };
      if (input.status && input.status !== "ALL")
        where.status = input.status as ProjectStatus;

      const [data, total] = await Promise.all([
        ctx.prisma.project.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            assignments: {
              include: {
                freelancer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                  },
                },
              },
            },
            _count: { select: { timesheets: true, contracts: true } },
          },
        }),
        ctx.prisma.project.count({ where }),
      ]);

      return {
        data: data.map(serializeProjectMoney),
        meta: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          assignments: {
            include: { freelancer: { select: freelancerPublicSelect } },
          },
          contracts: {
            include: { freelancer: { select: freelancerPublicSelect } },
          },
          timesheets: {
            orderBy: { date: "desc" },
            take: 20,
            include: {
              freelancer: {
                select: { id: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      if (!project)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found",
        });
      return {
        ...serializeProjectMoney(project),
        contracts: project.contracts.map((contract) => ({
          ...contract,
          ratePerHour: decimalToNumber(contract.ratePerHour),
        })),
      };
    }),

  create: protectedProcedure
    .use(roleGuard)
    .input(projectSchema)
    .mutation(async ({ input, ctx }) => {
      const project = await ctx.prisma.$transaction(async (transaction) => {
        const created = await transaction.project.create({
          data: { ...input, companyId: ctx.companyId },
        });
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "PROJECT_CREATED",
          entity: "Project",
          entityId: created.id,
          metadata: { name: created.name },
        });
        return created;
      });

      return serializeProjectMoney(project);
    }),

  update: protectedProcedure
    .use(roleGuard)
    .input(z.object({ id: z.string(), data: projectUpdateSchema }))
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.project.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
      const nextStartDate = input.data.startDate ?? existing.startDate;
      const nextEndDate = input.data.endDate ?? existing.endDate;
      if (nextStartDate && nextEndDate && nextEndDate < nextStartDate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Project end date cannot be before its start date",
        });
      }

      const project = await ctx.prisma.$transaction(async (transaction) => {
        const updated = await transaction.project.update({
          where: { id: input.id },
          data: input.data,
        });
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "PROJECT_UPDATED",
          entity: "Project",
          entityId: updated.id,
        });
        return updated;
      });

      return serializeProjectMoney(project);
    }),

  assignFreelancer: protectedProcedure
    .use(roleGuard)
    .input(
      z.object({
        projectId: z.string(),
        freelancerId: z.string(),
        role: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, companyId: ctx.companyId },
      });
      const freelancer = await ctx.prisma.freelancer.findFirst({
        where: { id: input.freelancerId, companyId: ctx.companyId },
      });
      if (!project || !freelancer) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.$transaction(async (transaction) => {
        const assignment = await transaction.projectAssignment.upsert({
          where: {
            projectId_freelancerId: {
              projectId: input.projectId,
              freelancerId: input.freelancerId,
            },
          },
          update: { role: input.role },
          create: {
            companyId: ctx.companyId,
            projectId: input.projectId,
            freelancerId: input.freelancerId,
            role: input.role,
          },
        });
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "PROJECT_FREELANCER_ASSIGNED",
          entity: "ProjectAssignment",
          entityId: assignment.id,
          metadata: {
            projectId: input.projectId,
            freelancerId: input.freelancerId,
          },
        });
        return assignment;
      });
    }),

  unassignFreelancer: protectedProcedure
    .use(roleGuard)
    .input(z.object({ projectId: z.string(), freelancerId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.projectId, companyId: ctx.companyId },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.prisma.$transaction(async (transaction) => {
        const assignment = await transaction.projectAssignment.delete({
          where: {
            projectId_freelancerId: {
              projectId: input.projectId,
              freelancerId: input.freelancerId,
            },
          },
        });
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "PROJECT_FREELANCER_UNASSIGNED",
          entity: "ProjectAssignment",
          entityId: assignment.id,
          metadata: {
            projectId: input.projectId,
            freelancerId: input.freelancerId,
          },
        });
      });
      return { success: true };
    }),

  getBudgetSummary: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const project = await ctx.prisma.project.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!project) throw new TRPCError({ code: "NOT_FOUND" });

      const timesheets = await ctx.prisma.timesheet.findMany({
        where: {
          projectId: input.id,
          companyId: ctx.companyId,
          status: "APPROVED",
        },
      });

      const totalHours = timesheets.reduce((sum, t) => sum + t.hours, 0);
      const contracts = await ctx.prisma.contract.findMany({
        where: { projectId: input.id, companyId: ctx.companyId },
      });
      const rateMap = new Map(
        contracts.map((contract) => [
          contract.id,
          {
            rate: decimalToNumber(contract.ratePerHour),
            currency: contract.currency,
          },
        ]),
      );

      let excludedCurrencyEntries = 0;
      const totalSpent = timesheets.reduce((sum, timesheet) => {
        const contract = rateMap.get(timesheet.contractId ?? "");
        if (!contract || contract.currency !== project.currency) {
          excludedCurrencyEntries += 1;
          return sum;
        }
        return sum + timesheet.hours * contract.rate;
      }, 0);

      return {
        budget: project.budget ? decimalToNumber(project.budget) : 0,
        spent: totalSpent,
        totalHours,
        excludedCurrencyEntries,
        remaining:
          (project.budget ? decimalToNumber(project.budget) : 0) - totalSpent,
        percentUsed: project.budget
          ? Math.min(
              100,
              Math.round((totalSpent / decimalToNumber(project.budget)) * 100),
            )
          : 0,
      };
    }),
});
