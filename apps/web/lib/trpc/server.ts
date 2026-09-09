import {
  initTRPC,
  TRPCError,
  experimental_standaloneMiddleware,
} from "@trpc/server";
import superjson from "superjson";
import type { Session } from "next-auth";
import { prisma, Prisma } from "@repo/db";
import type { PrismaClient, Membership, MembershipRole } from "@repo/db";

type Context = {
  session: Session | null;
};

type ProtectedCtx = {
  session: Session;
  prisma: PrismaClient;
  userId: string;
  companyId: string;
  membership: Membership;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const isAuthed = experimental_standaloneMiddleware<{ ctx: Context }>().create(
  async ({ ctx, next }) => {
    if (!ctx.session?.user?.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in",
      });
    }

    const membership = await prisma.membership.findFirst({
      where: { userId: ctx.session.user.id, status: "ACTIVE" },
      orderBy: { joinedAt: "asc" },
    });

    if (!membership) {
      throw new TRPCError({ code: "FORBIDDEN", message: "No company access" });
    }

    return next({
      ctx: {
        session: ctx.session,
        prisma,
        userId: ctx.session.user.id,
        companyId: membership.companyId,
        membership,
      } satisfies ProtectedCtx,
    });
  },
);

export const protectedProcedure = t.procedure.use(isAuthed);

export const requireRole = (...roles: MembershipRole[]) =>
  experimental_standaloneMiddleware<{ ctx: ProtectedCtx }>().create(
    ({ ctx, next }) => {
      if (!roles.includes(ctx.membership.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Insufficient permissions",
        });
      }
      return next({ ctx });
    },
  );

export const audit = async (
  prisma: PrismaClient | Prisma.TransactionClient,
  params: {
    companyId: string;
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
) => {
  await prisma.auditLog.create({
    data: {
      companyId: params.companyId,
      userId: params.userId ?? null,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId ?? null,
      metadata: params.metadata as Prisma.InputJsonValue | undefined,
    },
  });
};

export const createCaller = t.createCallerFactory;
