import { z } from "zod";
import type { ToolContext, ToolDef } from "../types";
import { sendAgentEmail } from "../email";

/** Document types that must remain active for a freelancer to keep working. */
export const REQUIRED_ACTIVE_TYPES = [
  "WORK_PERMIT",
  "VISA",
  "ID_CARD",
  "TAX_ID",
] as const;

export const complianceTools: ToolDef[] = [
  {
    name: "getComplianceRecords",
    description:
      "Fetches compliance documents (with expiryDate) to monitor validity.",
    inputSchema: z.object({
      horizonDays: z.number().min(0).max(365).optional(),
    }),
    defaultMode: "AUTO",
    permission: ["SYSTEM"],
    readOnly: true,
    execute: async (ctx, input) => {
      const horizonDays =
        (input as { horizonDays?: number }).horizonDays ?? 365;
      const now = new Date();
      const horizon = new Date(now.getTime() + horizonDays * 86400000);
      const rows = await ctx.prisma.complianceRecord.findMany({
        where: {
          freelancer: { companyId: ctx.companyId },
          expiryDate: { not: null },
        },
        select: {
          id: true,
          type: true,
          title: true,
          expiryDate: true,
          status: true,
          freelancer: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });
      const withInfo = rows.map((r) => {
        const daysLeft = r.expiryDate
          ? Math.floor((r.expiryDate.getTime() - now.getTime()) / 86400000)
          : null;
        return {
          id: r.id,
          type: r.type,
          title: r.title,
          status: r.status,
          daysLeft,
          inHorizon:
            daysLeft != null && daysLeft >= 0 && daysLeft <= horizonDays,
          freelancerId: r.freelancer.id,
          freelancer: `${r.freelancer.firstName} ${r.freelancer.lastName}`,
        };
      });
      return {
        count: withInfo.length,
        rows: withInfo.filter((r) => r.inHorizon || r.daysLeft !== null),
      };
    },
  },
  {
    name: "sendComplianceReminder",
    description:
      "Sends a compliance document reminder near expiry (30/7 days). Non-financial, AUTO.",
    inputSchema: z.object({
      recordId: z.string(),
      daysLeft: z.number(),
      stage: z.enum(["30", "15", "7", "0"]),
    }),
    defaultMode: "PROPOSE",
    permission: ["SYSTEM", "OWNER", "ADMIN", "FINANCE"],
    approvalPermission: ["OWNER", "ADMIN"],
    idempotencyKey: (ctx, input) => {
      const i = input as { recordId: string; stage: string };
      return Promise.resolve(
        `${ctx.companyId}:compliance:${i.recordId}:${i.stage}`,
      );
    },
    execute: async (ctx, input) => {
      const i = input as {
        recordId: string;
        daysLeft: number;
        stage: string;
      };
      const record = await ctx.prisma.complianceRecord.findFirst({
        where: {
          id: i.recordId,
          freelancer: { companyId: ctx.companyId },
        },
        include: {
          freelancer: { select: { id: true, firstName: true, lastName: true } },
        },
      });
      if (!record) throw new Error(`Compliance ${i.recordId} not found`);
      const owner = await findMember(ctx, "OWNER");
      if (owner) {
        await ctx.prisma.notification.create({
          data: {
            userId: owner,
            title: `Compliance document expires in ${i.daysLeft} days`,
            message: `${record.title} (${record.type}) expires in ${i.daysLeft} days.`,
            type: "COMPLIANCE",
            metadata: {
              recordId: record.id,
              stage: i.stage,
              actorType: "AGENT",
            },
          },
        });
      }
      const sent = await sendAgentEmail({
        ctx,
        kind: "compliance-warning",
        subject: `Compliance document about to expire — ${record.title}`,
        props: {
          bodyTitle: record.title,
          documentType: record.type,
          daysLeft: i.daysLeft,
          freelancerName: `${record.freelancer.firstName} ${record.freelancer.lastName}`,
          actionUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/dashboard/compliance`,
        },
      });
      return {
        status: "reminded",
        recordId: record.id,
        stage: i.stage,
        email: sent.channel,
      };
    },
  },
  {
    name: "markComplianceExpired",
    description:
      "Marks a compliance document EXPIRED once past its expiry date. Non-financial, AUTO.",
    inputSchema: z.object({ recordId: z.string() }),
    defaultMode: "AUTO",
    permission: ["SYSTEM"],
    approvalPermission: ["OWNER", "ADMIN"],
    idempotencyKey: (ctx, input) => {
      const i = input as { recordId: string };
      return Promise.resolve(
        `${ctx.companyId}:compliance:expired:${i.recordId}`,
      );
    },
    execute: async (ctx, input) => {
      const i = input as { recordId: string };
      const record = await ctx.prisma.complianceRecord.findFirst({
        where: {
          id: i.recordId,
          freelancer: { companyId: ctx.companyId },
        },
      });
      if (!record) throw new Error(`Compliance ${i.recordId} not found`);
      if (record.status === "EXPIRED") {
        return { status: "already_expired" };
      }
      const updated = await ctx.prisma.complianceRecord.update({
        where: { id: i.recordId },
        data: { status: "EXPIRED" },
      });
      return { status: "expired", recordId: updated.id };
    },
  },
  {
    name: "suspendFreelancer",
    description:
      "Suspends (SUSPENDED) a freelancer because required documents expired. Non-auto, AUTO.",
    inputSchema: z.object({
      freelancerId: z.string(),
      reason: z.string().optional(),
    }),
    defaultMode: "AUTO",
    permission: ["SYSTEM"],
    approvalPermission: ["OWNER", "ADMIN"],
    idempotencyKey: (ctx, input) =>
      Promise.resolve(
        `${ctx.companyId}:freelancer:suspend:${(input as { freelancerId: string }).freelancerId}`,
      ),
    execute: async (ctx, input) => {
      const i = input as { freelancerId: string; reason?: string };
      const freelancer = await ctx.prisma.freelancer.findFirst({
        where: { id: i.freelancerId, companyId: ctx.companyId },
      });
      if (!freelancer)
        throw new Error(`Freelancer ${i.freelancerId} not found`);
      if (freelancer.status === "SUSPENDED") {
        return { status: "already_suspended" };
      }
      const updated = await ctx.prisma.freelancer.update({
        where: { id: i.freelancerId },
        data: {
          status: "SUSPENDED",
          notes: i.reason ?? "Agent: compliance document expired",
        },
      });
      return { status: "suspended", freelancerId: updated.id };
    },
  },
];

async function findMember(
  ctx: ToolContext,
  role: "OWNER" | "ADMIN",
): Promise<string | null> {
  const m = await ctx.prisma.membership.findFirst({
    where: { companyId: ctx.companyId, role, status: "ACTIVE" },
    select: { userId: true },
  });
  return m?.userId ?? null;
}
