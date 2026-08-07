import { z } from "zod";
import { router, protectedProcedure, requireRole, audit } from "../server";
import { TRPCError } from "@trpc/server";

const ownerGuard = requireRole("OWNER");
const teamGuard = requireRole("OWNER", "ADMIN");

export const membershipRouter = router({
  list: protectedProcedure.use(teamGuard).query(async ({ ctx }) => {
    return ctx.prisma.membership.findMany({
      where: { companyId: ctx.companyId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
  }),

  invite: protectedProcedure
    .use(ownerGuard)
    .input(
      z.object({
        email: z.string().email(),
        role: z.enum(["ADMIN", "MANAGER", "FINANCE", "VIEWER"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No user found with that email",
        });
      }

      const existing = await ctx.prisma.membership.findUnique({
        where: {
          userId_companyId: { userId: user.id, companyId: ctx.companyId },
        },
      });
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is already a member",
        });
      }

      const membership = await ctx.prisma.membership.create({
        data: {
          userId: user.id,
          companyId: ctx.companyId,
          role: input.role,
          status: "PENDING",
        },
      });

      await audit(ctx.prisma, {
        companyId: ctx.companyId,
        userId: ctx.userId,
        action: "MEMBER_INVITED",
        entity: "Membership",
        entityId: membership.id,
        metadata: { email: input.email, role: input.role },
      });

      return membership;
    }),

  updateRole: protectedProcedure
    .use(ownerGuard)
    .input(
      z.object({
        membershipId: z.string(),
        role: z.enum(["ADMIN", "MANAGER", "FINANCE", "VIEWER"]),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const membership = await ctx.prisma.membership.findFirst({
        where: { id: input.membershipId, companyId: ctx.companyId },
      });
      if (!membership) throw new TRPCError({ code: "NOT_FOUND" });
      if (membership.role === "OWNER") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot change the owner role",
        });
      }

      return ctx.prisma.membership.update({
        where: { id: input.membershipId },
        data: { role: input.role },
      });
    }),

  remove: protectedProcedure
    .use(ownerGuard)
    .input(z.object({ membershipId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const membership = await ctx.prisma.membership.findFirst({
        where: { id: input.membershipId, companyId: ctx.companyId },
      });
      if (!membership) throw new TRPCError({ code: "NOT_FOUND" });
      if (membership.role === "OWNER") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot remove the owner",
        });
      }

      await ctx.prisma.membership.delete({ where: { id: input.membershipId } });
      return { success: true };
    }),
});
