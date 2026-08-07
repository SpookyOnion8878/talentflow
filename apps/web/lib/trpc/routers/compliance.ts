import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { complianceSchema } from "@repo/validators";
import { Prisma } from "@repo/db";
import type { ComplianceStatus } from "@repo/db";
import { TRPCError } from "@trpc/server";

const verifierGuard = requireRole("OWNER", "ADMIN", "MANAGER");

export const complianceRouter = router({
  list: protectedProcedure
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
      const freelancer = await ctx.prisma.freelancer.findFirst({
        where: { id: input.freelancerId, companyId: ctx.companyId },
      });
      if (!freelancer)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Freelancer not found",
        });

      const record = await ctx.prisma.complianceRecord.create({
        data: { ...input },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "COMPLIANCE_UPLOADED",
        entity: "ComplianceRecord",
        entityId: record.id,
        metadata: { type: record.type, title: record.title },
      });

      return record;
    }),

  verify: protectedProcedure
    .use(verifierGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const record = await ctx.prisma.complianceRecord.findFirst({
        where: { id: input.id, freelancer: { companyId: ctx.companyId } },
      });
      if (!record)
        throw new TRPCError({ code: "NOT_FOUND", message: "Record not found" });

      const updated = await ctx.prisma.complianceRecord.update({
        where: { id: input.id },
        data: {
          status: "VERIFIED",
          verifiedBy: ctx.userId,
          verifiedAt: new Date(),
        },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "COMPLIANCE_VERIFIED",
        entity: "ComplianceRecord",
        entityId: input.id,
        metadata: { type: record.type },
      });

      return updated;
    }),

  reject: protectedProcedure
    .use(verifierGuard)
    .input(z.object({ id: z.string(), reason: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      const record = await ctx.prisma.complianceRecord.findFirst({
        where: { id: input.id, freelancer: { companyId: ctx.companyId } },
      });
      if (!record) throw new TRPCError({ code: "NOT_FOUND" });

      const updated = await ctx.prisma.complianceRecord.update({
        where: { id: input.id },
        data: {
          status: "REJECTED",
          notes: input.reason,
          verifiedBy: ctx.userId,
          verifiedAt: new Date(),
        },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "COMPLIANCE_REJECTED",
        entity: "ComplianceRecord",
        entityId: input.id,
        metadata: { reason: input.reason },
      });

      return updated;
    }),
});
