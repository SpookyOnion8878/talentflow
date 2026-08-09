import type { PrismaClient } from "@repo/db";

export interface EmbeddingChunk {
  entityType: "FREELANCER" | "PROJECT" | "INVOICE" | "COMPLIANCE";
  entityId: string;
  content: string;
}

/**
 * Ambil semua entitas perusahaan yang diindeks RAG lalu susun teks chunk
 * per entitas (satu chunk per baris data). Teks sengaja berbentuk kalimat
 * sederhana agar embedding model kecil tetap bermakna.
 */
export async function buildChunks(
  prisma: PrismaClient,
  companyId: string,
): Promise<EmbeddingChunk[]> {
  const [freelancers, projects, invoices, compliance] = await Promise.all([
    prisma.freelancer.findMany({
      where: { companyId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        skills: true,
        country: true,
        currency: true,
        status: true,
        notes: true,
      },
    }),
    prisma.project.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        budget: true,
        currency: true,
      },
    }),
    prisma.invoice.findMany({
      where: { companyId },
      select: {
        id: true,
        invoiceNo: true,
        amount: true,
        totalAmount: true,
        currency: true,
        status: true,
        dueDate: true,
        notes: true,
        freelancer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.complianceRecord.findMany({
      where: { freelancer: { companyId } },
      select: {
        id: true,
        type: true,
        title: true,
        status: true,
        expiryDate: true,
        freelancer: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const chunks: EmbeddingChunk[] = [];

  for (const f of freelancers) {
    chunks.push({
      entityType: "FREELANCER",
      entityId: f.id,
      content: [
        `Freelancer ${f.firstName} ${f.lastName}`,
        f.status ? `status: ${f.status}` : null,
        f.skills.length ? `skills: ${f.skills.join(", ")}` : null,
        f.country ? `country: ${f.country}` : null,
        f.currency ? `currency: ${f.currency}` : null,
        f.notes ?? null,
      ]
        .filter(Boolean)
        .join(", "),
    });
  }

  for (const p of projects) {
    chunks.push({
      entityType: "PROJECT",
      entityId: p.id,
      content: [
        `Project ${p.name}`,
        `status: ${p.status}`,
        p.budget != null ? `budget: ${p.budget} ${p.currency}` : null,
        p.description ?? null,
      ]
        .filter(Boolean)
        .join(", "),
    });
  }

  for (const i of invoices) {
    chunks.push({
      entityType: "INVOICE",
      entityId: i.id,
      content: [
        `Invoice ${i.invoiceNo}`,
        `for ${i.freelancer.firstName} ${i.freelancer.lastName}`,
        `status: ${i.status}`,
        `amount: ${i.amount} ${i.currency}`,
        i.dueDate ? `due: ${i.dueDate.toISOString().slice(0, 10)}` : null,
        i.notes ?? null,
      ]
        .filter(Boolean)
        .join(", "),
    });
  }

  for (const c of compliance) {
    chunks.push({
      entityType: "COMPLIANCE",
      entityId: c.id,
      content: [
        `Compliance document ${c.type}`,
        `for ${c.freelancer.firstName} ${c.freelancer.lastName}`,
        `title: ${c.title}`,
        `status: ${c.status}`,
        c.expiryDate
          ? `expires: ${c.expiryDate.toISOString().slice(0, 10)}`
          : null,
      ]
        .filter(Boolean)
        .join(", "),
    });
  }

  return chunks;
}
