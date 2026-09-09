import { router, protectedProcedure } from "../server";
import { decimalToNumber } from "@repo/db";
import type { PrismaClient } from "@repo/db";

export const dashboardRouter = router({
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const companyId = ctx.companyId;
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const [
      freelancerCount,
      activeFreelancerCount,
      projectCount,
      activeProjectCount,
      pendingTimesheets,
      pendingInvoices,
      invoiceSummary,
      monthTimesheets,
      compliancePending,
      complianceExpired,
    ] = await Promise.all([
      ctx.prisma.freelancer.count({ where: { companyId } }),
      ctx.prisma.freelancer.count({ where: { companyId, status: "ACTIVE" } }),
      ctx.prisma.project.count({ where: { companyId } }),
      ctx.prisma.project.count({ where: { companyId, status: "ACTIVE" } }),
      ctx.prisma.timesheet.count({
        where: { status: "PENDING", companyId },
      }),
      ctx.prisma.invoice.count({
        where: {
          companyId,
          status: { in: ["DRAFT", "SENT", "VIEWED", "OVERDUE"] },
        },
      }),
      ctx.prisma.invoice.groupBy({
        by: ["currency", "status"],
        where: { companyId },
        _sum: { totalAmount: true },
      }),
      ctx.prisma.timesheet.findMany({
        where: {
          status: "APPROVED",
          date: { gte: startOfMonth },
          companyId,
        },
        select: {
          hours: true,
          contract: { select: { ratePerHour: true, currency: true } },
        },
      }),
      ctx.prisma.complianceRecord.count({
        where: { status: "PENDING", freelancer: { companyId } },
      }),
      ctx.prisma.complianceRecord.count({
        where: { status: "EXPIRED", freelancer: { companyId } },
      }),
    ]);

    const financialByCurrency: Record<
      string,
      { monthlySpend: number; outstanding: number; paid: number }
    > = {};
    const getFinancialSummary = (currency: string) =>
      (financialByCurrency[currency] ??= {
        monthlySpend: 0,
        outstanding: 0,
        paid: 0,
      });

    for (const timesheet of monthTimesheets) {
      if (!timesheet.contract) continue;
      getFinancialSummary(timesheet.contract.currency).monthlySpend +=
        timesheet.hours * decimalToNumber(timesheet.contract.ratePerHour);
    }
    for (const group of invoiceSummary) {
      const amount = decimalToNumber(group._sum.totalAmount ?? 0);
      const summary = getFinancialSummary(group.currency);
      if (["SENT", "VIEWED", "OVERDUE"].includes(group.status)) {
        summary.outstanding += amount;
      }
      if (group.status === "PAID") summary.paid += amount;
    }

    return {
      stats: {
        freelancers: freelancerCount,
        activeFreelancers: activeFreelancerCount,
        projects: projectCount,
        activeProjects: activeProjectCount,
        pendingTimesheets,
        pendingInvoices,
        financialByCurrency,
        compliancePending,
        complianceExpired,
      },
      budgetOverview: await getBudgetOverview(ctx),
    };
  }),

  getRecentActivity: protectedProcedure.query(async ({ ctx }) => {
    const logs = await ctx.prisma.auditLog.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    const actionLabels: Record<string, { label: string; type: string }> = {
      FREELANCER_CREATED: {
        label: "New freelancer onboarded",
        type: "freelancer",
      },
      FREELANCER_UPDATED: {
        label: "Freelancer profile updated",
        type: "freelancer",
      },
      FREELANCER_DELETED: { label: "Freelancer removed", type: "freelancer" },
      PROJECT_CREATED: { label: "Project created", type: "project" },
      PROJECT_UPDATED: { label: "Project updated", type: "project" },
      CONTRACT_CREATED: { label: "Contract generated", type: "contract" },
      CONTRACT_SIGNED: { label: "Contract signed", type: "contract" },
      CONTRACT_SENT: { label: "Contract sent", type: "contract" },
      CONTRACT_TERMINATED: { label: "Contract terminated", type: "contract" },
      TIMESHEET_SUBMITTED: { label: "Timesheet submitted", type: "timesheet" },
      TIMESHEET_APPROVED: { label: "Timesheet approved", type: "timesheet" },
      TIMESHEET_REJECTED: { label: "Timesheet rejected", type: "timesheet" },
      INVOICE_CREATED: { label: "Invoice created", type: "invoice" },
      INVOICE_SENT: { label: "Invoice sent", type: "invoice" },
      INVOICE_PAID: { label: "Invoice paid", type: "payment" },
      PAYMENT_RECORDED: { label: "Payment recorded", type: "payment" },
      COMPLIANCE_UPLOADED: {
        label: "Compliance document uploaded",
        type: "compliance",
      },
      COMPLIANCE_VERIFIED: {
        label: "Compliance document verified",
        type: "compliance",
      },
      COMPLIANCE_REJECTED: {
        label: "Compliance document rejected",
        type: "compliance",
      },
      COMPANY_UPDATED: { label: "Company settings updated", type: "company" },
    };

    return logs.map((log) => {
      const meta = actionLabels[log.action] ?? {
        label: log.action.replace(/_/g, " ").toLowerCase(),
        type: "system",
      };
      return {
        id: log.id,
        action: meta.label,
        type: meta.type,
        user: log.user?.name ?? "System",
        entity: log.entity,
        createdAt: log.createdAt,
        metadata: log.metadata,
      };
    });
  }),
});

async function getBudgetOverview(ctx: {
  prisma: PrismaClient;
  companyId: string;
}) {
  const projects = await ctx.prisma.project.findMany({
    where: { companyId: ctx.companyId, status: { in: ["ACTIVE", "ON_HOLD"] } },
    include: { _count: { select: { timesheets: true } } },
    take: 6,
  });

  const contracts = await ctx.prisma.contract.findMany({
    where: { companyId: ctx.companyId },
  });
  const rateMap = new Map(
    contracts.map((contract) => [
      contract.id,
      {
        rate: decimalToNumber(contract.ratePerHour),
        currency: contract.currency,
      },
    ]),
  );

  const result = [];
  for (const project of projects) {
    const timesheets = await ctx.prisma.timesheet.findMany({
      where: {
        projectId: project.id,
        companyId: ctx.companyId,
        status: "APPROVED",
      },
    });
    let excludedCurrencyEntries = 0;
    const spent = timesheets.reduce((sum, timesheet) => {
      const contract = rateMap.get(timesheet.contractId ?? "");
      if (!contract || contract.currency !== project.currency) {
        excludedCurrencyEntries += 1;
        return sum;
      }
      return sum + timesheet.hours * contract.rate;
    }, 0);
    const budget = project.budget ? decimalToNumber(project.budget) : 0;
    result.push({
      id: project.id,
      name: project.name,
      currency: project.currency,
      budget,
      spent,
      excludedCurrencyEntries,
      percentUsed:
        budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0,
    });
  }

  return result;
}
