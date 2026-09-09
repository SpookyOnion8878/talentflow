import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { complianceSchema } from "@repo/validators";
import { Prisma } from "@repo/db";
import type { ComplianceStatus } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { enqueueAgentJob } from "@repo/agents";

const verifierGuard = requireRole("OWNER", "ADMIN", "MANAGER", "FINANCE");

export const complianceRouter = router({
  list: protectedProcedure
    .use(verifierGuard)
    .input(
      z.object({
        status: z.string().optional(),
        freelancerId: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const where: Prisma.ComplianceRecordWhereInput = {
        freelancer: { companyId: ctx.companyId },
      };
      if (input.status && input.status !== "ALL")
        where.status = input.status as ComplianceStatus;
      if (input.freelancerId) where.freelancerId = input.freelancerId;

      const [data, total] = await Promise.all([
        ctx.prisma.complianceRecord.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            freelancer: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            verifier: { select: { id: true, name: true } },
          },
        }),
        ctx.prisma.complianceRecord.count({ where }),
      ]);

      // Expiry awareness: flag records expiring within 30 days
      const in30Days = new Date(Date.now() + 30 * 86400000);
      const flagged = data.map((record) => ({
        ...record,
        expiringSoon:
          !!record.expiryDate &&
          record.expiryDate <= in30Days &&
          record.status === "VERIFIED",
      }));

      return {
        data: flagged,
        meta: { total },
        summary: {
          total,
          pending: data.filter((r) => r.status === "PENDING").length,
          verified: data.filter((r) => r.status === "VERIFIED").length,
          expired: data.filter((r) => r.status === "EXPIRED").length,
          expiringSoon: flagged.filter((r) => r.expiringSoon).length,
        },
      };
    }),

  create: protectedProcedure
    .use(verifierGuard)
    .input(complianceSchema)
    .mutation(async ({ input, ctx }) => {
      const record = await ctx.prisma.$transaction(async (transaction) => {
        const freelancer = await transaction.freelancer.findFirst({
          where: { id: input.freelancerId, companyId: ctx.companyId },
        });
        if (!freelancer) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Freelancer not found",
          });
        }

        const created = await transaction.complianceRecord.create({
          data: { ...input },
        });
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "COMPLIANCE_UPLOADED",
          entity: "ComplianceRecord",
          entityId: created.id,
          metadata: { type: created.type, title: created.title },
        });
        return created;
      });

      try {
        await enqueueAgentJob(ctx.prisma, {
          companyId: ctx.companyId,
          agentType: "COMPLIANCE",
          triggerType: "COMPLIANCE_UPDATED",
        });
      } catch (error) {
        console.error("[agents] failed to enqueue COMPLIANCE_UPDATED", error);
      }

      return record;
    }),

  verify: protectedProcedure
    .use(verifierGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.$transaction(async (transaction) => {
        const record = await transaction.complianceRecord.findFirst({
          where: { id: input.id, freelancer: { companyId: ctx.companyId } },
        });
        if (!record) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Record not found",
          });
        }
        if (record.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `A ${record.status.toLowerCase()} record cannot be verified`,
          });
        }

        const claimed = await transaction.complianceRecord.updateMany({
          where: { id: input.id, status: "PENDING" },
          data: {
            status: "VERIFIED",
            verifiedBy: ctx.userId,
            verifiedAt: new Date(),
          },
        });
        if (claimed.count !== 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Compliance status changed during verification",
          });
        }
        const updated = await transaction.complianceRecord.findUniqueOrThrow({
          where: { id: input.id },
        });
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "COMPLIANCE_VERIFIED",
          entity: "ComplianceRecord",
          entityId: input.id,
          metadata: { type: record.type },
        });
        return updated;
      });
    }),

  reject: protectedProcedure
    .use(verifierGuard)
    .input(z.object({ id: z.string(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      return ctx.prisma.$transaction(async (transaction) => {
        const record = await transaction.complianceRecord.findFirst({
          where: { id: input.id, freelancer: { companyId: ctx.companyId } },
        });
        if (!record) throw new TRPCError({ code: "NOT_FOUND" });
        if (record.status !== "PENDING") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `A ${record.status.toLowerCase()} record cannot be rejected`,
          });
        }

        const claimed = await transaction.complianceRecord.updateMany({
          where: { id: input.id, status: "PENDING" },
          data: {
            status: "REJECTED",
            notes: input.reason,
            verifiedBy: ctx.userId,
            verifiedAt: new Date(),
          },
        });
        if (claimed.count !== 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Compliance status changed during rejection",
          });
        }
        const updated = await transaction.complianceRecord.findUniqueOrThrow({
          where: { id: input.id },
        });
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "COMPLIANCE_REJECTED",
          entity: "ComplianceRecord",
          entityId: input.id,
          metadata: { reason: input.reason },
        });
        return updated;
      });
    }),
});
