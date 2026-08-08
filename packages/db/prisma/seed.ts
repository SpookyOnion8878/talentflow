import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@repo/utils";

const prisma = new PrismaClient();

const DAY = 86400000;

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

  const viewer = await prisma.user.upsert({
    where: { email: "viewer@talentflow.dev" },
    update: {},
    create: {
      email: "viewer@talentflow.dev",
      name: "Viewer User",
      role: "VIEWER",
      password: hashPassword("password123"),
    },
  });

  const demoUserIds = [admin.id, manager.id, finance.id, viewer.id];

  // ─── Company (reset demo data, seat idempotent) ───
  await prisma.notification.deleteMany({
    where: { userId: { in: demoUserIds } },
  });
  await prisma.company.deleteMany({ where: { slug: "acme-corp" } });

  const company = await prisma.company.create({
    data: {
      id: "acme-corp",
      name: "Acme Corporation",
      slug: "acme-corp",
      plan: "PRO",
      industry: "Technology",
      website: "https://acme.example.com",
      settings: { timezone: "UTC", taxRate: 11 },
    },
  });

  // ─── Memberships ───
  await prisma.membership.createMany({
    data: [
      {
        userId: admin.id,
        companyId: company.id,
        role: "OWNER",
        status: "ACTIVE",
        joinedAt: new Date(Date.now() - 400 * DAY),
      },
      {
        userId: manager.id,
        companyId: company.id,
        role: "MANAGER",
        status: "ACTIVE",
        joinedAt: new Date(Date.now() - 350 * DAY),
      },
      {
        userId: finance.id,
        companyId: company.id,
        role: "FINANCE",
        status: "ACTIVE",
        joinedAt: new Date(Date.now() - 300 * DAY),
      },
      {
        userId: viewer.id,
        companyId: company.id,
        role: "VIEWER",
        status: "ACTIVE",
        joinedAt: new Date(Date.now() - 200 * DAY),
      },
    ],
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
      city: "Austin, TX",
      timezone: "America/Chicago",
      currency: "USD",
      phone: "+1-512-555-0141",
      taxId: "US-W9-009128",
      bankName: "Chase",
      bankAccount: "****1123",
      bankRouting: "021000021",
      status: "ACTIVE",
      rating: 4.8,
    },
    {
      id: "freelancer-2",
      firstName: "John",
      lastName: "Smith",
      email: "john.smith@example.com",
      skills: ["Python", "Django", "PostgreSQL"],
      country: "United Kingdom",
      city: "London",
      timezone: "Europe/London",
      currency: "GBP",
      phone: "+44 20 7946 0958",
      taxId: "UK-UTR-449182",
      bankName: "Barclays",
      bankAccount: "****778899",
      status: "ACTIVE",
      rating: 4.5,
    },
    {
      id: "freelancer-3",
      firstName: "Alice",
      lastName: "Johnson",
      email: "alice.j@example.com",
      skills: ["Figma", "UI/UX", "Design Systems"],
      country: "Canada",
      city: "Toronto",
      timezone: "America/Toronto",
      currency: "CAD",
      phone: "+1 (416) 555-0133",
      status: "ACTIVE",
      rating: 4.9,
    },
    {
      id: "freelancer-4",
      firstName: "Bob",
      lastName: "Wilson",
      email: "bob.w@example.com",
      skills: ["DevOps", "AWS", "Kubernetes"],
      country: "Germany",
      city: "Berlin",
      timezone: "Europe/Berlin",
      currency: "EUR",
      phone: "+49 30 901820",
      status: "ACTIVE",
      rating: 4.2,
    },
    {
      id: "freelancer-5",
      firstName: "Maria",
      lastName: "Garcia",
      email: "maria.g@example.com",
      skills: ["React Native", "Mobile", "Firebase"],
      country: "Spain",
      city: "Barcelona",
      timezone: "Europe/Madrid",
      currency: "EUR",
      phone: "+34 93 555 01 02",
      status: "ACTIVE",
      rating: 4.6,
    },
    {
      id: "freelancer-6",
      firstName: "Carlos",
      lastName: "Wei",
      email: "carlos.w@example.com",
      skills: ["Go", "Redis", "Microservices"],
      country: "Singapore",
      city: "Singapore",
      timezone: "Asia/Singapore",
      currency: "SGD",
      phone: "+65 6123 4567",
      status: "ACTIVE",
      rating: 4.7,
    },
    {
      id: "freelancer-7",
      firstName: "David",
      lastName: "Brown",
      email: "david.b@example.com",
      skills: ["Data Engineering", "Spark", "SQL"],
      country: "Australia",
      city: "Sydney",
      timezone: "Australia/Sydney",
      currency: "AUD",
      phone: "+61 2 5550 0147",
      status: "INACTIVE",
      rating: 4.1,
    },
    {
      id: "freelancer-8",
      firstName: "Elena",
      lastName: "Torres",
      email: "elena.t@example.com",
      skills: ["Cybersecurity", "Penetration Testing", "OWASP"],
      country: "Mexico",
      city: "Mexico City",
      timezone: "America/Mexico_City",
      currency: "MXN",
      phone: "+52 55 5555 0100",
      status: "ACTIVE",
      rating: 3.9,
    },
  ];

  await prisma.freelancer.createMany({
    data: freelancerData.map((f) => ({ ...f, companyId: company.id })),
  });

  // ─── Projects ───
  const now = Date.now();
  const projectData = [
    {
      id: "project-1",
      name: "Website Redesign",
      description:
        "Complete redesign of the company website and marketing pages",
      status: "ACTIVE",
      budget: 50000,
      currency: "USD",
      startDate: new Date(now - 120 * DAY),
      endDate: new Date(now + 90 * DAY),
    },
    {
      id: "project-2",
      name: "Mobile App",
      description: "Cross-platform mobile application for field teams",
      status: "ACTIVE",
      budget: 30000,
      currency: "USD",
      startDate: new Date(now - 60 * DAY),
      endDate: new Date(now + 120 * DAY),
    },
    {
      id: "project-3",
      name: "API Integration",
      description: "Third-party API integrations (Stripe, Slack, HubSpot)",
      status: "ON_HOLD",
      budget: 10000,
      currency: "USD",
      startDate: new Date(now - 30 * DAY),
      endDate: new Date(now + 30 * DAY),
    },
    {
      id: "project-4",
      name: "Data Migration",
      description: "Migrate legacy database to cloud data warehouse",
      status: "COMPLETED",
      budget: 25000,
      currency: "USD",
      startDate: new Date(now - 300 * DAY),
      endDate: new Date(now - 40 * DAY),
    },
    {
      id: "project-5",
      name: "Internal Tooling",
      description: "Admin dashboard and internal tooling",
      status: "ACTIVE",
      budget: 15000,
      currency: "USD",
      startDate: new Date(now - 15 * DAY),
    },
    {
      id: "project-6",
      name: "Security Audit",
      description: "Annual security assessment and hardening",
      status: "COMPLETED",
      budget: 12000,
      currency: "EUR",
      startDate: new Date(now - 200 * DAY),
      endDate: new Date(now - 20 * DAY),
    },
  ];

  await prisma.project.createMany({
    data: projectData.map((p) => ({ ...p, companyId: company.id })),
  });

  // ─── Project Assignments ───
  await prisma.projectAssignment.createMany({
    data: [
      {
        projectId: "project-1",
        freelancerId: "freelancer-1",
        role: "Frontend Developer",
        startDate: new Date(now - 120 * DAY),
      },
      {
        projectId: "project-1",
        freelancerId: "freelancer-3",
        role: "Product Designer",
        startDate: new Date(now - 115 * DAY),
      },
      {
        projectId: "project-2",
        freelancerId: "freelancer-2",
        role: "Backend Engineer",
        startDate: new Date(now - 60 * DAY),
      },
      {
        projectId: "project-2",
        freelancerId: "freelancer-5",
        role: "Mobile Developer",
        startDate: new Date(now - 55 * DAY),
      },
      {
        projectId: "project-3",
        freelancerId: "freelancer-4",
        role: "DevOps Engineer",
        startDate: new Date(now - 30 * DAY),
      },
      {
        projectId: "project-4",
        freelancerId: "freelancer-6",
        role: "Data Engineer",
        startDate: new Date(now - 300 * DAY),
        endDate: new Date(now - 40 * DAY),
      },
      {
        projectId: "project-4",
        freelancerId: "freelancer-7",
        role: "Data Analyst",
        startDate: new Date(now - 300 * DAY),
        endDate: new Date(now - 40 * DAY),
      },
      {
        projectId: "project-5",
        freelancerId: "freelancer-8",
        role: "Security Engineer",
        startDate: new Date(now - 15 * DAY),
      },
      {
        projectId: "project-6",
        freelancerId: "freelancer-8",
        role: "Security Auditor",
        startDate: new Date(now - 200 * DAY),
        endDate: new Date(now - 20 * DAY),
      },
    ],
  });

  // ─── Contracts ───
  const contracts = [
    {
      contractNo: "CTR-001",
      freelancerId: "freelancer-1",
      projectId: "project-1",
      title: "Frontend Development Contract",
      ratePerHour: 85,
      currency: "USD",
      startDate: new Date(now - 120 * DAY),
      endDate: new Date(now + 90 * DAY),
      status: "ACTIVE",
      signedBy: admin.id,
      signedAt: new Date(now - 118 * DAY),
      terms: { noticePeriod: 14, paymentTerms: "NET_30" },
      description: "Ongoing frontend work on the website redesign.",
    },
    {
      contractNo: "CTR-002",
      freelancerId: "freelancer-5",
      projectId: "project-2",
      title: "Mobile Development Contract",
      ratePerHour: 80,
      currency: "USD",
      startDate: new Date(now - 55 * DAY),
      endDate: new Date(now + 120 * DAY),
      status: "ACTIVE",
      signedBy: admin.id,
      signedAt: new Date(now - 53 * DAY),
      terms: { noticePeriod: 30, paymentTerms: "NET_30" },
      description: "React Native app development.",
    },
    {
      contractNo: "CTR-003",
      freelancerId: "freelancer-3",
      projectId: "project-1",
      title: "Product Design Contract",
      ratePerHour: 75,
      currency: "USD",
      startDate: new Date(now - 110 * DAY),
      endDate: new Date(now + 60 * DAY),
      status: "DRAFT",
      terms: { noticePeriod: 14, paymentTerms: "NET_15" },
      description: "Design systems and UI/UX support.",
    },
    {
      contractNo: "CTR-004",
      freelancerId: "freelancer-2",
      projectId: "project-2",
      title: "Backend Engineering Contract",
      ratePerHour: 90,
      currency: "USD",
      startDate: new Date(now - 60 * DAY),
      endDate: new Date(now + 120 * DAY),
      status: "SENT",
      terms: { noticePeriod: 30, paymentTerms: "NET_30" },
      description: "Backend APIs for the mobile platform.",
    },
    {
      contractNo: "CTR-005",
      freelancerId: "freelancer-6",
      projectId: "project-4",
      title: "Data Migration Contract",
      ratePerHour: 70,
      currency: "USD",
      startDate: new Date(now - 300 * DAY),
      endDate: new Date(now - 40 * DAY),
      status: "COMPLETED",
      signedBy: admin.id,
      signedAt: new Date(now - 298 * DAY),
      terms: { noticePeriod: 14, paymentTerms: "NET_30" },
      description: "Legacy to cloud migration.",
    },
    {
      contractNo: "CTR-006",
      freelancerId: "freelancer-4",
      projectId: "project-3",
      title: "DevOps & Cloud Contract",
      ratePerHour: 95,
      currency: "EUR",
      startDate: new Date(now - 30 * DAY),
      endDate: new Date(now + 30 * DAY),
      status: "SIGNED",
      signedBy: admin.id,
      signedAt: new Date(now - 28 * DAY),
      terms: { noticePeriod: 14, paymentTerms: "NET_15" },
      description: "CI/CD and cloud infrastructure.",
    },
    {
      contractNo: "CTR-007",
      freelancerId: "freelancer-7",
      projectId: "project-4",
      title: "Data Analysis Contract",
      ratePerHour: 60,
      currency: "AUD",
      startDate: new Date(now - 300 * DAY),
      endDate: new Date(now - 100 * DAY),
      status: "TERMINATED",
      signedBy: admin.id,
      signedAt: new Date(now - 298 * DAY),
      terms: { noticePeriod: 14, paymentTerms: "NET_30" },
      description: "Reporting and analysis support.",
    },
    {
      contractNo: "CTR-008",
      freelancerId: "freelancer-8",
      projectId: "project-5",
      title: "Security Engineering Contract",
      ratePerHour: 88,
      currency: "USD",
      startDate: new Date(now - 15 * DAY),
      status: "ACTIVE",
      signedBy: admin.id,
      signedAt: new Date(now - 13 * DAY),
      terms: { noticePeriod: 30, paymentTerms: "NET_30" },
      description: "Security hardening of internal tooling.",
    },
  ];

  await prisma.contract.createMany({
    data: contracts.map((c) => ({
      ...c,
      companyId: company.id,
      createdBy: admin.id,
    })),
  });

  const contractIds: Record<string, string> = {};
  for (const c of await prisma.contract.findMany({
    where: { companyId: company.id },
  })) {
    contractIds[c.contractNo] = c.id;
  }

  // ─── Timesheets (mixed statuses, last 2 weeks) ───
  const sheets: Array<{
    freelancerId: string;
    contractNo: string;
    projectId: string;
    date: Date;
    hours: number;
    description: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "REVISED";
    approvedBy?: string;
    approvedAt?: Date;
    rejectReason?: string;
  }> = [];

  const sheetDefs: Array<[string, string, string, number, number]> = [
    ["freelancer-1", "CTR-001", "project-1", 1, 8],
    ["freelancer-1", "CTR-001", "project-1", 2, 8],
    ["freelancer-1", "CTR-001", "project-1", 8, 8],
    ["freelancer-1", "CTR-001", "project-1", 9, 8],
    ["freelancer-5", "CTR-002", "project-2", 1, 6],
    ["freelancer-5", "CTR-002", "project-2", 2, 7],
    ["freelancer-5", "CTR-002", "project-2", 10, 7],
    ["freelancer-3", "CTR-003", "project-1", 3, 5],
    ["freelancer-3", "CTR-003", "project-1", 11, 5],
    ["freelancer-2", "CTR-004", "project-2", 1, 8],
    ["freelancer-2", "CTR-004", "project-2", 2, 8],
    ["freelancer-2", "CTR-004", "project-2", 9, 8],
    ["freelancer-6", "CTR-005", "project-4", -45, 8],
    ["freelancer-6", "CTR-005", "project-4", -44, 8],
    ["freelancer-4", "CTR-006", "project-3", 4, 6],
    ["freelancer-4", "CTR-006", "project-3", 5, 6],
    ["freelancer-8", "CTR-008", "project-5", 1, 8],
    ["freelancer-8", "CTR-008", "project-5", 2, 8],
    ["freelancer-8", "CTR-008", "project-5", 3, 8],
  ];

  for (const [
    freelancerId,
    contractNo,
    projectId,
    dayOffset,
    hours,
  ] of sheetDefs) {
    const date = new Date(now + dayOffset * DAY);
    const dateStr = date.toISOString().split("T")[0];
    const pending = dayOffset >= 0 && dayOffset <= 3;
    const rejected = freelancerId === "freelancer-2" && dayOffset === 9;
    const revised = freelancerId === "freelancer-3" && dayOffset === 11;
    const sheetsRow: (typeof sheets)[number] = {
      freelancerId,
      contractNo,
      projectId,
      date: new Date(date.toISOString().split("T")[0]),
      hours,
      description: `Work on ${projectId} — ${dateStr}`,
      status: revised
        ? "REVISED"
        : rejected
          ? "REJECTED"
          : pending
            ? "PENDING"
            : "APPROVED",
      ...(revised
        ? { rejectReason: "Please add the hours breakdown per task." }
        : {}),
      ...(rejected ? { rejectReason: "Duplicated entry, resubmit." } : {}),
      ...(pending || revised || rejected
        ? {}
        : {
            approvedBy: manager.id,
            approvedAt: new Date(date.getTime() + DAY),
          }),
    };
    sheets.push(sheetsRow);
  }

  await prisma.timesheet.createMany({
    data: sheets.map((s) => ({
      freelancerId: s.freelancerId,
      contractId: contractIds[s.contractNo],
      projectId: s.projectId,
      submittedById: admin.id,
      date: s.date,
      hours: s.hours,
      description: s.description,
      status: s.status,
      ...(s.approvedBy
        ? { approvedBy: s.approvedBy, approvedAt: s.approvedAt }
        : {}),
      ...(s.rejectReason ? { rejectReason: s.rejectReason } : {}),
    })),
  });

  // ─── Invoices ───
  const invoices = [
    {
      invoiceNo: "INV-2026-001",
      freelancerId: "freelancer-1",
      contractNo: "CTR-001",
      amount: 3400,
      taxRate: 0.11,
      currency: "USD",
      status: "SENT",
      dueDate: new Date(now + 14 * DAY),
      items: [
        {
          description: "Frontend development — 40 hours @ $85",
          quantity: 40,
          rate: 85,
          amount: 3400,
        },
      ],
    },
    {
      invoiceNo: "INV-2026-002",
      freelancerId: "freelancer-1",
      contractNo: "CTR-001",
      amount: 3400,
      taxRate: 0.11,
      currency: "USD",
      status: "PAID",
      paidAt: new Date(now - 120 * DAY),
      dueDate: new Date(now - 106 * DAY),
      items: [
        {
          description: "Frontend development — 40 hours @ $85",
          quantity: 40,
          rate: 85,
          amount: 3400,
        },
      ],
    },
    {
      invoiceNo: "INV-2026-003",
      freelancerId: "freelancer-5",
      contractNo: "CTR-002",
      amount: 2600,
      taxRate: 0.11,
      currency: "USD",
      status: "DRAFT",
      dueDate: new Date(now + 20 * DAY),
      items: [
        {
          description: "Mobile development — 30 hours @ $80",
          quantity: 30,
          rate: 80,
          amount: 2400,
        },
        {
          description: "Design sync — 4 hours @ $50",
          quantity: 4,
          rate: 50,
          amount: 200,
        },
      ],
    },
    {
      invoiceNo: "INV-2026-004",
      freelancerId: "freelancer-2",
      contractNo: "CTR-004",
      amount: 3600,
      taxRate: 0.2,
      currency: "GBP",
      status: "SENT",
      dueDate: new Date(now + 10 * DAY),
      items: [
        {
          description: "Backend APIs — 40 hours @ £90",
          quantity: 40,
          rate: 90,
          amount: 3600,
        },
      ],
    },
    {
      invoiceNo: "INV-2026-005",
      freelancerId: "freelancer-4",
      contractNo: "CTR-006",
      amount: 1900,
      taxRate: 0.19,
      currency: "EUR",
      status: "OVERDUE",
      dueDate: new Date(now - 12 * DAY),
      items: [
        {
          description: "CI/CD setup — 20 hours @ €95",
          quantity: 20,
          rate: 95,
          amount: 1900,
        },
      ],
    },
    {
      invoiceNo: "INV-2026-006",
      freelancerId: "freelancer-6",
      contractNo: "CTR-005",
      amount: 2800,
      taxRate: 0,
      currency: "USD",
      status: "PAID",
      paidAt: new Date(now - 30 * DAY),
      dueDate: new Date(now - 20 * DAY),
      items: [
        {
          description: "Data migration — 40 hours @ $70",
          quantity: 40,
          rate: 70,
          amount: 2800,
        },
      ],
    },
    {
      invoiceNo: "INV-2026-007",
      freelancerId: "freelancer-3",
      contractNo: "CTR-003",
      amount: 1500,
      taxRate: 0.13,
      currency: "CAD",
      status: "VIEWED",
      dueDate: new Date(now + 30 * DAY),
      items: [
        {
          description: "Design system — 20 hours @ C$75",
          quantity: 20,
          rate: 75,
          amount: 1500,
        },
      ],
    },
    {
      invoiceNo: "INV-2026-008",
      freelancerId: "freelancer-7",
      contractNo: "CTR-007",
      amount: 900,
      taxRate: 0.1,
      currency: "AUD",
      status: "CANCELLED",
      dueDate: new Date(now - 100 * DAY),
      items: [
        {
          description: "Reporting — 15 hours @ A$60",
          quantity: 15,
          rate: 60,
          amount: 900,
        },
      ],
    },
  ];

  const invoiceIds: Record<string, string> = {};
  for (const inv of invoices) {
    const created = await prisma.invoice.create({
      data: {
        invoiceNo: inv.invoiceNo,
        companyId: company.id,
        freelancerId: inv.freelancerId,
        contractId: contractIds[inv.contractNo],
        amount: inv.amount,
        taxAmount: Math.round(inv.amount * inv.taxRate),
        totalAmount: Math.round(inv.amount * (1 + inv.taxRate)),
        currency: inv.currency,
        status: inv.status,
        ...(inv.paidAt ? { paidAt: inv.paidAt } : {}),
        dueDate: inv.dueDate,
        items: inv.items,
      },
    });
    invoiceIds[inv.invoiceNo] = created.id;
  }

  // ─── Payments ───
  await prisma.payment.createMany({
    data: [
      {
        invoiceId: invoiceIds["INV-2026-002"],
        amount: 3774,
        currency: "USD",
        method: "BANK_TRANSFER",
        status: "COMPLETED",
        reference: "TRF-88213",
        processedAt: new Date(now - 119 * DAY),
      },
      {
        invoiceId: invoiceIds["INV-2026-006"],
        amount: 2800,
        currency: "USD",
        method: "STRIPE",
        status: "COMPLETED",
        reference: "STRIPE-PY-44901",
        processedAt: new Date(now - 29 * DAY),
      },
    ],
  });

  // ─── Compliance Records ───
  const compliance = [
    {
      id: "comp-1",
      freelancerId: "freelancer-1",
      type: "ID_CARD",
      title: "Passport",
      expiryDate: new Date(now + 300 * DAY),
      status: "VERIFIED",
      verifiedBy: admin.id,
      verifiedAt: new Date(now - 100 * DAY),
    },
    {
      id: "comp-2",
      freelancerId: "freelancer-1",
      type: "TAX_ID",
      title: "US Tax ID (W-9)",
      expiryDate: new Date(now + 200 * DAY),
      status: "VERIFIED",
      verifiedBy: admin.id,
      verifiedAt: new Date(now - 90 * DAY),
    },
    {
      id: "comp-3",
      freelancerId: "freelancer-2",
      type: "WORK_PERMIT",
      title: "UK Work Permit",
      expiryDate: new Date(now + 25 * DAY),
      status: "VERIFIED",
      verifiedBy: admin.id,
      verifiedAt: new Date(now - 80 * DAY),
    },
    {
      id: "comp-4",
      freelancerId: "freelancer-3",
      type: "VISA",
      title: "Canadian Visa",
      expiryDate: new Date(now - 5 * DAY),
      status: "EXPIRED",
      verifiedBy: admin.id,
      verifiedAt: new Date(now - 300 * DAY),
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
      expiryDate: new Date(now + 400 * DAY),
      status: "VERIFIED",
      verifiedBy: admin.id,
      verifiedAt: new Date(now - 50 * DAY),
    },
    {
      id: "comp-7",
      freelancerId: "freelancer-5",
      type: "INSURANCE",
      title: "Professional Liability Insurance",
      expiryDate: new Date(now + 10 * DAY),
      status: "VERIFIED",
      verifiedBy: admin.id,
      verifiedAt: new Date(now - 20 * DAY),
    },
    {
      id: "comp-8",
      freelancerId: "freelancer-6",
      type: "WORK_PERMIT",
      title: "Singapore Employment Pass",
      expiryDate: new Date(now + 150 * DAY),
      status: "VERIFIED",
      verifiedBy: admin.id,
      verifiedAt: new Date(now - 30 * DAY),
    },
    {
      id: "comp-9",
      freelancerId: "freelancer-8",
      type: "CERTIFICATION",
      title: "CISSP Certification",
      expiryDate: new Date(now + 600 * DAY),
      status: "VERIFIED",
      verifiedBy: admin.id,
      verifiedAt: new Date(now - 10 * DAY),
    },
    {
      id: "comp-10",
      freelancerId: "freelancer-7",
      type: "TAX_ID",
      title: "Australian Business Number",
      expiryDate: null,
      status: "PENDING",
    },
    {
      id: "comp-11",
      freelancerId: "freelancer-2",
      type: "CONTRACT_COPY",
      title: "Directorship Agreement",
      expiryDate: null,
      status: "REJECTED",
      notes: "Outdated template, please re-upload.",
    },
  ];

  await prisma.complianceRecord.createMany({ data: compliance });

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
        entityId: "CTR-001",
        metadata: { title: "Frontend Development Contract" },
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
      {
        companyId: company.id,
        userId: admin.id,
        action: "PROJECT_CREATED",
        entity: "Project",
        entityId: "project-1",
        metadata: { name: "Website Redesign" },
      },
      {
        companyId: company.id,
        userId: manager.id,
        action: "TIMESHEET_REJECTED",
        entity: "Timesheet",
        entityId: "timesheet-14",
        metadata: { reason: "Duplicated review" },
      },
      {
        companyId: company.id,
        userId: finance.id,
        action: "PAYMENT_RECORDED",
        entity: "Payment",
        entityId: "INV-2026-006",
        metadata: { amount: 2800 },
      },
      {
        companyId: company.id,
        userId: admin.id,
        action: "COMPLIANCE_REJECTED",
        entity: "ComplianceRecord",
        entityId: "comp-11",
        metadata: { reason: "Outdated template" },
      },
      {
        companyId: company.id,
        userId: admin.id,
        action: "COMPANY_SETTINGS_UPDATED",
        entity: "Company",
        entityId: company.id,
        metadata: { taxRate: 11 },
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
        read: false,
      },
      {
        userId: admin.id,
        title: "Insurance expiring",
        message:
          "Professional liability insurance for Maria Garcia expires in 10 days",
        type: "COMPLIANCE",
        metadata: { entity: "comp-7" },
      },
      {
        userId: manager.id,
        title: "Timesheets awaiting approval",
        message: "Jane Doe has submitted pending timesheets",
        type: "TIMESHEET",
        read: false,
      },
      {
        userId: manager.id,
        title: "Rejected timesheet",
        message: "John Smith's timesheet was rejected, awaiting resubmission",
        type: "TIMESHEET",
      },
      {
        userId: finance.id,
        title: "Invoice overdue",
        message: "INV-2026-005 from Bob Wilson is overdue",
        type: "INVOICE",
        metadata: { entity: "INV-2026-005" },
        read: false,
      },
      {
        userId: finance.id,
        title: "Payment completed",
        message: "INV-2026-006 payment of $2,800 recorded",
        type: "PAYMENT",
        read: true,
      },
      {
        userId: manager.id,
        title: "New contract in draft",
        message: "Product Design Contract (CTR-003) awaits review",
        type: "CONTRACT",
      },
      {
        userId: admin.id,
        title: "Security audit done",
        message: "Security Audit project completed",
        type: "PROJECT",
        read: true,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed completed.");
  console.log("  Admin login:    admin@talentflow.dev  / password123  (OWNER)");
  console.log(
    "  Manager login:  manager@talentflow.dev / password123  (MANAGER)",
  );
  console.log(
    "  Finance login:  finance@talentflow.dev / password123  (FINANCE)",
  );
  console.log(
    "  Viewer login:   viewer@talentflow.dev  / password123  (VIEWER)",
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
