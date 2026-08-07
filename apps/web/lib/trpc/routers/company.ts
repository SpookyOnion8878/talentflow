import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { Prisma } from "@repo/db";
import { TRPCError } from "@trpc/server";

const ownerGuard = requireRole("OWNER", "ADMIN");

export const companyRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const company = await ctx.prisma.company.findUnique({
      where: { id: ctx.companyId },
      include: {
        _count: {
          select: {
            freelancers: true,
            projects: true,
            contracts: true,
            invoices: true,
          },
        },
      },
    });
    if (!company) throw new TRPCError({ code: "NOT_FOUND" });
    return company;
  }),

  update: protectedProcedure
    .use(ownerGuard)
    .input(
      z.object({
        name: z.string().min(2).max(100).optional(),
        website: z.string().url().optional().or(z.literal("")),
        industry: z.string().max(50).optional(),
        settings: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const company = await ctx.prisma.company.update({
        where: { id: ctx.companyId },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.website !== undefined ? { website: input.website } : {}),
          ...(input.industry !== undefined ? { industry: input.industry } : {}),
          ...(input.settings !== undefined
            ? { settings: input.settings as Prisma.InputJsonValue }
            : {}),
        },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "COMPANY_UPDATED",
        entity: "Company",
        entityId: company.id,
      });

      return company;
    }),
});
