import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { contractSchema, paginationSchema } from "@repo/validators";
import {
  Prisma,
  canTransition,
  contractTransitions,
  decimalToNumber,
  ContractStatus,
} from "@repo/db";
import { TRPCError } from "@trpc/server";
import { generateContractNumber } from "@repo/utils";
import { freelancerPublicSelect } from "../../freelancer-access";

const managerGuard = requireRole("OWNER", "ADMIN", "MANAGER");

function requireContractTransition(from: string, to: string): void {
  if (!canTransition(contractTransitions, from, to)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Contract cannot transition from ${from} to ${to}`,
    });
  }
}

function serializeContractMoney<T extends { ratePerHour: Prisma.Decimal }>(
  contract: T,
) {
  return { ...contract, ratePerHour: decimalToNumber(contract.ratePerHour) };
}

export const contractRouter = router({
  list: protectedProcedure
    .input(paginationSchema.extend({ status: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const skip = (input.page - 1) * input.limit;
      const where: Prisma.ContractWhereInput = { companyId: ctx.companyId };
      if (input.status && input.status !== "ALL") {
        const parsed = z.nativeEnum(ContractStatus).safeParse(input.status);
        if (!parsed.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid $ContractStatus filter`,
          });
        }
        where.status = parsed.data;
      }

      const [data, total] = await Promise.all([
        ctx.prisma.contract.findMany({
          where,
          skip,
          take: input.limit,
          orderBy: { createdAt: "desc" },
          include: {
            freelancer: { select: freelancerPublicSelect },
            project: { select: { id: true, name: true } },
            creator: { select: { id: true, name: true } },
            signer: { select: { id: true, name: true } },
          },
        }),
        ctx.prisma.contract.count({ where }),
      ]);

      return {
        data: data.map(serializeContractMoney),
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
          freelancer: { select: freelancerPublicSelect },
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
      return serializeContractMoney(contract);
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

      if (input.projectId) {
        const project = await ctx.prisma.project.findFirst({
          where: { id: input.projectId, companyId: ctx.companyId },
          select: { id: true },
        });
        if (!project) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Project not found",
          });
        }
      }

      const contract = await ctx.prisma.$transaction(async (transaction) => {
        const created = await transaction.contract.create({
          data: {
            ...input,
            terms: input.terms as Prisma.InputJsonValue,
            contractNo: generateContractNumber(),
            companyId: ctx.companyId,
            createdBy: ctx.userId,
          },
        });
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "CONTRACT_CREATED",
          entity: "Contract",
          entityId: created.id,
          metadata: { contractNo: created.contractNo, title: created.title },
        });
        return created;
      });

      return serializeContractMoney(contract);
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
      requireContractTransition(contract.status, "SIGNED");

      const signed = await ctx.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.contract.updateMany({
          where: {
            id: input.id,
            companyId: ctx.companyId,
            status: contract.status,
          },
          data: {
            status: "SIGNED",
            signedBy: ctx.userId,
            signedAt: new Date(),
          },
        });
        if (claimed.count !== 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Contract status changed during this request",
          });
        }
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "CONTRACT_SIGNED",
          entity: "Contract",
          entityId: contract.id,
          metadata: { contractNo: contract.contractNo },
        });
        return transaction.contract.findUniqueOrThrow({
          where: { id: input.id },
        });
      });

      return serializeContractMoney(signed);
    }),

  send: protectedProcedure
    .use(managerGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const contract = await ctx.prisma.contract.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!contract) throw new TRPCError({ code: "NOT_FOUND" });
      requireContractTransition(contract.status, "SENT");

      const sent = await ctx.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.contract.updateMany({
          where: {
            id: input.id,
            companyId: ctx.companyId,
            status: contract.status,
          },
          data: { status: "SENT" },
        });
        if (claimed.count !== 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Contract status changed during this request",
          });
        }
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "CONTRACT_SENT",
          entity: "Contract",
          entityId: contract.id,
          metadata: { contractNo: contract.contractNo },
        });
        return transaction.contract.findUniqueOrThrow({
          where: { id: input.id },
        });
      });
      return serializeContractMoney(sent);
    }),

  terminate: protectedProcedure
    .use(managerGuard)
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const contract = await ctx.prisma.contract.findFirst({
        where: { id: input.id, companyId: ctx.companyId },
      });
      if (!contract) throw new TRPCError({ code: "NOT_FOUND" });
      requireContractTransition(contract.status, "TERMINATED");

      const terminated = await ctx.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.contract.updateMany({
          where: {
            id: input.id,
            companyId: ctx.companyId,
            status: contract.status,
          },
          data: { status: "TERMINATED", endDate: new Date() },
        });
        if (claimed.count !== 1) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Contract status changed during this request",
          });
        }
        await audit(transaction, {
          companyId: ctx.companyId,
          userId: ctx.userId,
          action: "CONTRACT_TERMINATED",
          entity: "Contract",
          entityId: contract.id,
          metadata: { contractNo: contract.contractNo },
        });
        return transaction.contract.findUniqueOrThrow({
          where: { id: input.id },
        });
      });

      return serializeContractMoney(terminated);
    }),
});
