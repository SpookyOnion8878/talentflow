import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { contractSchema, paginationSchema } from "@repo/validators";
import { Prisma } from "@repo/db";
import type { ContractStatus } from "@repo/db";
import { TRPCError } from "@trpc/server";
import { generateContractNumber } from "@repo/utils";

const managerGuard = requireRole("OWNER", "ADMIN", "MANAGER");

export const contractRouter = router({
  list: protectedProcedure
    .input(paginationSchema.extend({ status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const skip = (input.page - 1) * input.limit;
      const where: Prisma.ContractWhereInput = { companyId: ctx.companyId };
      if (input.status && input.status !== "ALL")
        where.status = input.status as ContractStatus;

      const [data, total] = await Promise.all([
        ctx.prisma.contract.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            freelancer: true,
            project: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } },
            signer: { select: { id: true, name: true } },
          },
        }),
        ctx.prisma.contract.count({ where }),
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

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const contract = await ctx.prisma.contract.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
        include: {
          freelancer: true,
          project: true,
          creator: { select: { id: true, name: true } },
          signer: { select: { id: true, name: true } },
        },
      });
      if (!contract)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contract not found",
        });
      return contract;
    }),

  create: protectedProcedure
    .use(managerGuard)
    .input(contractSchema)
    .mutation(async ({ input, ctx }) => {
      const freelancer = await ctx.prisma.freelancer.findFirst({
        where: { id: input.freelancerId, companyId: ctx.companyId },
      });
      if (!freelancer)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Freelancer not found",
        });

      const contract = await ctx.prisma.contract.create({
        data: {
          ...input,
          terms: input.terms as Prisma.InputJsonValue,
          contractNo: generateContractNumber(),
          companyId: ctx.companyId,
          createdBy: ctx.userId,
        },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "CONTRACT_CREATED",
        entity: "Contract",
        entityId: contract.id,
        metadata: { contractNo: contract.contractNo, title: contract.title },
      });

      return contract;
    }),

  sign: protectedProcedure
    .use(managerGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const contract = await ctx.prisma.contract.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!contract)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Contract not found",
        });
      if (contract.status !== "DRAFT" && contract.status !== "SENT") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only draft or sent contracts can be signed",
        });
      }

      const signed = await ctx.prisma.contract.update({
        where: { id: input.id },
        data: { status: "SIGNED", signedBy: ctx.userId, signedAt: new Date() },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "CONTRACT_SIGNED",
        entity: "Contract",
        entityId: contract.id,
        metadata: { contractNo: contract.contractNo },
      });

      return signed;
    }),

  send: protectedProcedure
    .use(managerGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const contract = await ctx.prisma.contract.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!contract) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.prisma.contract.update({
        where: { id: input.id },
        data: { status: "SENT" },
      });
    }),

  terminate: protectedProcedure
    .use(managerGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const contract = await ctx.prisma.contract.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!contract) throw new TRPCError({ code: "NOT_FOUND" });

      const terminated = await ctx.prisma.contract.update({
        where: { id: input.id },
        data: { status: "TERMINATED", endDate: new Date() },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "CONTRACT_TERMINATED",
        entity: "Contract",
        entityId: contract.id,
        metadata: { contractNo: contract.contractNo },
      });

      return terminated;
    }),
});
