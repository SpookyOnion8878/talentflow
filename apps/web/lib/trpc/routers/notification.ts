import { z } from "zod";
import { router, protectedProcedure } from "../server";

export const notificationRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(20) }))
    .query(async ({ input, ctx }) => {
      const [data, unreadCount] = await Promise.all([
        ctx.prisma.notification.findMany({
          where: { userId: ctx.userId },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        }),
        ctx.prisma.notification.count({
          where: { userId: ctx.userId, read: false },
        }),
      ]);

      return { data, unreadCount };
    }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.prisma.notification.updateMany({
        where: { id: input.id, userId: ctx.userId },
        data: { read: true },
      });
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.notification.updateMany({
      where: { userId: ctx.userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }),
});
