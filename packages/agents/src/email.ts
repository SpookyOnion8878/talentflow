import type { PrismaClient } from "@repo/db";
import { renderAgentEmail, sendEmail } from "@repo/email";
import type { ToolContext } from "./types";

/** Lists active owner, administrator, and finance email recipients. */
export async function emailRecipients(
  prisma: PrismaClient,
  companyId: string,
): Promise<string[]> {
  const members = await prisma.membership.findMany({
    where: {
      companyId,
      role: { in: ["OWNER", "ADMIN", "FINANCE"] },
      status: "ACTIVE",
    },
    select: { user: { select: { email: true } } },
  });
  return [...new Set(members.map((m) => m.user.email).filter(Boolean))];
}

interface SendAgentEmailParams {
  ctx: Pick<ToolContext, "prisma" | "companyId">;
  kind: "invoice-reminder" | "compliance-warning" | "weekly-summary";
  subject: string;
  props: unknown;
}

/** Renders an email template and sends it to the relevant company recipients. */
export async function sendAgentEmail(
  params: SendAgentEmailParams,
): Promise<{ channel: "resend" | "console" | "skip"; to: string[] }> {
  const to = await emailRecipients(params.ctx.prisma, params.ctx.companyId);
  if (to.length === 0) {
    console.log(`[email:skip] no recipient for ${params.kind}`);
    return { channel: "skip", to: [] };
  }

  const html = renderAgentEmail(params.kind, params.props);
  const channels: Array<"resend" | "console"> = [];
  for (const addr of to) {
    const result = await sendEmail({ to: addr, subject: params.subject, html });
    channels.push(result.channel);
  }
  return { channel: channels[0] ?? "console", to };
}
