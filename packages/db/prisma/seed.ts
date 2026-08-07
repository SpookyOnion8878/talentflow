import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@repo/utils";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Users ───
  const admin = await prisma.user.upsert({
    where: { email: "admin@talentflow.dev" },
    update: {},
    create: {
      email: "admin@talentflow.dev",
      name: "Admin User",
      role: "ADMIN",
      password: hashPassword("password123"),
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@talentflow.dev" },
    update: {},
    create: {
      email: "manager@talentflow.dev",
      name: "Manager User",
      role: "MANAGER",
      password: hashPassword("password123"),
    },
  });

  const finance = await prisma.user.upsert({
    where: { email: "finance@talentflow.dev" },
    update: {},
    create: {
      email: "finance@talentflow.dev",
      name: "Finance User",
      role: "FINANCE",
      password: hashPassword("password123"),
    },
  });

  // ─── Company ───
  const company = await prisma.company.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corporation",
      slug: "acme-corp",
      plan: "PRO",
      industry: "Technology",
      website: "https://acme.example.com",
      settings: { timezone: "UTC", taxRate: 11 },
    },
  });

  // ─── Memberships ───
  await prisma.membership.upsert({
    where: { userId_companyId: { userId: admin.id, companyId: company.id } },
    update: {},
    create: {
      userId: admin.id,
      companyId: company.id,
      role: "OWNER",
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });

  await prisma.membership.upsert({
    where: { userId_companyId: { userId: manager.id, companyId: company.id } },
    update: {},
    create: {
      userId: manager.id,
      companyId: company.id,
      role: "MANAGER",
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });

  await prisma.membership.upsert({
    where: { userId_companyId: { userId: finance.id, companyId: company.id } },
    update: {},
    create: {
      userId: finance.id,
      companyId: company.id,
      role: "FINANCE",
      status: "ACTIVE",
      joinedAt: new Date(),
    },
  });

  // ─── Freelancers ───
  const freelancerData = [
    {
      id: "freelancer-1",
      firstName: "Jane",
      lastName: "Doe",
      email: "jane.doe@example.com",
      skills: ["React", "TypeScript", "Node.js"],
      country: "United States",
      currency: "USD",
      rating: 4.8,
    },
    {
      id: "freelancer-2",
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@example.com",
      skills: ["Python", "Django", "PostgreSQL"],
      country: "United Kingdom",
      currency: "GBP",
      rating: 4.5,
    },
    {
      id: "freelancer-3",
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice.j@example.com",
      skills: ["Figma", "UI/UX", "Design Systems"],
      country: "Canada",
      currency: "CAD",
      rating: 4.9,
    },
    {
      id: "freelancer-4",
      firstName: "Bob",
      lastName: "Wilson",
      email: "bob.w@example.com",
      skills: ["DevOps", "AWS", "Kubernetes"],
      country: "Germany",
      currency: "EUR",
      rating: 4.2,
    },
  ];

  const freelancers: Record<string, any> = {};
  for (const f of freelancerData) {
    freelancers[f.id] = await prisma.freelancer.upsert({
      where: { id: f.id },
      update: {},
      create: { ...f, companyId: company.id, status: "ACTIVE" },
    });
  }

  // ─── Projects ───
  const projectData = [
    {
      id: "project-1",
      name: "Website Redesign",
      description: "Complete redesign of the company website",
      budget: 50000,
      currency: "USD",
      status: "ACTIVE",
    },
    {
      id: "project-2",
      name: "Mobile App",
      description: "Cross-platform mobile application",
      budget: 30000,
      currency: "USD",
      status: "ACTIVE",
    },
    {
      id: "project-3",
      name: "API Integration",
      description: "Third-party API integrations",
      budget: 10000,
      currency: "USD",
      status: "ACTIVE",
    },
    {
      id: "project-4",
      name: "Data Migration",
      description: "Migrate legacy database to cloud",
      budget: 25000,
      currency: "USD",
      status: "ON_HOLD",
    },
  ];

  const projects: Record<string, any> = {};
  for (const p of projectData) {
    projects[p.id] = await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: { ...p, companyId: company.id, startDate: new Date() },
    });
  }

  // ─── Project Assignments ───
  await prisma.projectAssignment.upsert({
    where: {
      projectId_freelancerId: {
        projectId: "project-1",
        freelancerId: "freelancer-1",
      },
    },
    update: {},
    create: {
      projectId: "project-1",
      freelancerId: "freelancer-1",
      role: "Frontend Developer",
    },
  });
  await prisma.projectAssignment.upsert({
    where: {
      projectId_freelancerId: {
        projectId: "project-1",
        freelancerId: "freelancer-3",
      },
    },
    update: {},
    create: {
      projectId: "project-1",
      freelancerId: "freelancer-3",
      role: "Product Designer",
    },
  });
  await prisma.projectAssignment.upsert({
    where: {
      projectId_freelancerId: {
        projectId: "project-2",
        freelancerId: "freelancer-2",
      },
    },
    update: {},
    create: {
      projectId: "project-2",
      freelancerId: "freelancer-2",
      role: "Backend Engineer",
    },
  });
  await prisma.projectAssignment.upsert({
    where: {
      projectId_freelancerId: {
        projectId: "project-3",
        freelancerId: "freelancer-4",
      },
    },
    update: {},
    create: {
      projectId: "project-3",
      freelancerId: "freelancer-4",
      role: "DevOps Engineer",
    },
  });

  // ─── Contracts ───
  const [contract1] = await Promise.all([
    prisma.contract.upsert({
      where: { contractNo: "CTR-001" },
      update: {},
      create: {
        contractNo: "CTR-001",
        companyId: company.id,
        freelancerId: "freelancer-1",
        projectId: "project-1",
        title: "Frontend Development Contract",
        ratePerHour: 85,
        currency: "USD",
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 86400000),
        status: "ACTIVE",
        createdBy: admin.id,
        terms: { noticePeriod: 14, paymentTerms: "NET_30" },
      },
    }),
    prisma.contract.upsert({
      where: { contractNo: "CTR-002" },
      update: {},
      create: {
        contractNo: "CTR-002",
        companyId: company.id,
        freelancerId: "freelancer-2",
        projectId: "project-2",
        title: "Backend Engineering Contract",
        ratePerHour: 90,
        currency: "USD",
        startDate: new Date(),
        endDate: new Date(Date.now() + 120 * 86400000),
        status: "SIGNED",
        createdBy: admin.id,
        terms: { noticePeriod: 30, paymentTerms: "NET_30" },
      },
    }),
    prisma.contract.upsert({
      where: { contractNo: "CTR-003" },
      update: {},
      create: {
        contractNo: "CTR-003",
        companyId: company.id,
        freelancerId: "freelancer-3",
        projectId: "project-1",
        title: "Product Design Contract",
        ratePerHour: 75,
        currency: "USD",
        startDate: new Date(),
        endDate: new Date(Date.now() + 60 * 86400000),
        status: "DRAFT",
        createdBy: admin.id,
        terms: { noticePeriod: 14, paymentTerms: "NET_15" },
      },
    }),
  ]);

  // ─── Timesheets (last 2 weeks) ───
  const days = [1, 2, 3, 6, 7, 8, 9, 10, 13, 14];
  for (const dayOffset of days) {
    const date = new Date(Date.now() - dayOffset * 86400000);
    const dateStr = date.toISOString().split("T")[0];
    await prisma.timesheet.upsert({
      where: { freelancerId_date: { freelancerId: "freelancer-1", date } },
      update: {},
      create: {
        freelancerId: "freelancer-1",
        contractId: contract1.id,
        projectId: "project-1",
        submittedById: admin.id,
        date,
        hours: 8,
        description: `Website Redesign work — ${dateStr}`,
        status: dayOffset > 3 ? "APPROVED" : "PENDING",
        ...(dayOffset > 3
          ? {
              approvedBy: manager.id,
              approvedAt: new Date(date.getTime() + 86400000),
            }
          : {}),
      },
    });
  }

  // ─── Invoices ───
  await prisma.invoice.upsert({
    where: { invoiceNo: "INV-2026-001" },
    update: {},
    create: {
      invoiceNo: "INV-2026-001",
      companyId: company.id,
      freelancerId: "freelancer-1",
      contractId: contract1.id,
      amount: 3400,
      taxAmount: 374,
      totalAmount: 3774,
      currency: "USD",
      status: "SENT",
      dueDate: new Date(Date.now() + 14 * 86400000),
      items: [
        {
          description: "Frontend development — 40 hours @ $85",
          quantity: 40,
          rate: 85,
          amount: 3400,
        },
      ],
    },
  });

  await prisma.invoice.upsert({
    where: { invoiceNo: "INV-2026-002" },
    update: {},
    create: {
      invoiceNo: "INV-2026-002",
      companyId: company.id,
      freelancerId: "freelancer-1",
      contractId: contract1.id,
      amount: 3400,
      taxAmount: 374,
      totalAmount: 3774,
      currency: "USD",
      status: "PAID",
      paidAt: new Date(Date.now() - 5 * 86400000),
      dueDate: new Date(Date.now() - 10 * 86400000),
      items: [
        {
          description: "Frontend development — 40 hours @ $85",
          quantity: 40,
          rate: 85,
          amount: 3400,
        },
      ],
    },
  });

  // ─── Payments ───
  await prisma.payment.upsert({
    where: {
      invoiceId: (await prisma.invoice.findUnique({
        where: { invoiceNo: "INV-2026-002" },
      }))!.id,
    },
    update: {},
    create: {
      invoiceId: (await prisma.invoice.findUnique({
        where: { invoiceNo: "INV-2026-002" },
      }))!.id,
      amount: 3774,
      currency: "USD",
      method: "BANK_TRANSFER",
      status: "COMPLETED",
      reference: "TRF-88213",
      processedAt: new Date(Date.now() - 4 * 86400000),
    },
  });

  // ─── Compliance Records ───
  const compliance = [
    {
      id: "comp-1",
      freelancerId: "freelancer-1",
      type: "ID_CARD",
      title: "Passport",
      expiryDate: new Date(Date.now() + 300 * 86400000),
      status: "VERIFIED",
      verifiedBy: admin.id,
    },
    {
      id: "comp-2",
      freelancerId: "freelancer-1",
      type: "TAX_ID",
      title: "US Tax ID (W-9)",
      expiryDate: new Date(Date.now() + 200 * 86400000),
      status: "VERIFIED",
      verifiedBy: admin.id,
    },
    {
      id: "comp-3",
      freelancerId: "freelancer-2",
      type: "WORK_PERMIT",
      title: "UK Work Permit",
      expiryDate: new Date(Date.now() + 25 * 86400000),
      status: "VERIFIED",
      verifiedBy: admin.id,
    },
    {
      id: "comp-4",
      freelancerId: "freelancer-3",
      type: "VISA",
      title: "Canadian Visa",
      expiryDate: new Date(Date.now() - 5 * 86400000),
      status: "EXPIRED",
      verifiedBy: admin.id,
    },
    {
      id: "comp-5",
      freelancerId: "freelancer-4",
      type: "NDA",
      title: "NDA Agreement",
      expiryDate: null,
      status: "PENDING",
    },
    {
      id: "comp-6",
      freelancerId: "freelancer-1",
      type: "CERTIFICATION",
      title: "AWS Certified Developer",
      expiryDate: new Date(Date.now() + 400 * 86400000),
      status: "VERIFIED",
      verifiedBy: admin.id,
    },
  ];

  for (const c of compliance) {
    await prisma.complianceRecord.upsert({
      where: { id: c.id },
      update: {},
      create: c,
    });
  }

  // ─── Audit Logs ───
  await prisma.auditLog.createMany({
    data: [
      {
        companyId: company.id,
        userId: admin.id,
        action: "FREELANCER_CREATED",
        entity: "Freelancer",
        entityId: "freelancer-1",
        metadata: { name: "Jane Doe" },
      },
      {
        companyId: company.id,
        userId: admin.id,
        action: "CONTRACT_SIGNED",
        entity: "Contract",
        entityId: "CTR-002",
        metadata: { title: "Backend Engineering Contract" },
      },
      {
        companyId: company.id,
        userId: manager.id,
        action: "TIMESHEET_APPROVED",
        entity: "Timesheet",
        entityId: "timesheet-1",
        metadata: { hours: 8 },
      },
      {
        companyId: company.id,
        userId: finance.id,
        action: "INVOICE_PAID",
        entity: "Invoice",
        entityId: "INV-2026-002",
        metadata: { amount: 3774 },
      },
      {
        companyId: company.id,
        userId: admin.id,
        action: "COMPLIANCE_VERIFIED",
        entity: "ComplianceRecord",
        entityId: "comp-1",
        metadata: { type: "ID_CARD" },
      },
    ],
    skipDuplicates: true,
  });

  // ─── Notifications ───
  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        title: "Work permit expiring",
        message: "UK Work Permit for John Smith expires in 25 days",
        type: "COMPLIANCE",
        metadata: { entity: "comp-3" },
      },
      {
        userId: admin.id,
        title: "Visa expired",
        message: "Canadian Visa for Alice Johnson has expired",
        type: "COMPLIANCE",
        metadata: { entity: "comp-4" },
      },
      {
        userId: manager.id,
        title: "Timesheets awaiting approval",
        message: "Jane Doe has submitted 4 pending timesheets",
        type: "TIMESHEET",
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed completed.");
  console.log("  Admin login:    admin@talentflow.dev / password123");
  console.log("  Manager login:  manager@talentflow.dev / password123");
  console.log("  Finance login:  finance@talentflow.dev / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
