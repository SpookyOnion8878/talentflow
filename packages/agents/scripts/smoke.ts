/**
 * Smoke test end-to-end (router tRPC tidak diperlukan):
 * 1) Billing cycle → draft invoice PROPOSE di approval queue
 * 2) Compliance scan → reminder/expired/suspend
 * 3) Copilot chat → jawaban berbasis data nyata + saran aksi
 *
 * Jalankan: pnpm --filter @repo/agents smoke
 */
import { PrismaClient } from "@repo/db";
import {
  routeIntent,
  runBillingCycle,
  runComplianceScan,
  runCopilotChat,
  processAvailableJobs,
  expireStaleActions,
  ingestCompanyData,
  searchEmbeddings,
  getEmbeddingProvider,
} from "../src/index";

async function main() {
  const prisma = new PrismaClient();

  const company = await prisma.company.findFirst({ select: { id: true } });
  if (!company) {
    console.log("Tidak ada company — jalankan db:seed dulu.");
    return;
  }
  console.log("Company:", company.id);

  const expired = await expireStaleActions(prisma);
  console.log("Aksi stale yang di-EXPIRED:", expired);

  const runB = await runBillingCycle(prisma, company.id, "CRON_WEEKLY");
  console.log("\n[Billing] run:", runB?.id, "| status:", runB?.status);
  const pendingB = await prisma.agentAction.count({
    where: { run: { companyId: company.id }, status: "PENDING" },
  });
  console.log("  Pending actions:", pendingB);

  const runC = await runComplianceScan(prisma, company.id, "CRON_DAILY");
  console.log("\n[Compliance] run:", runC?.id, "| status:", runC?.status);

  const embedProvider = getEmbeddingProvider();
  const ingest = await ingestCompanyData(prisma, company.id, embedProvider);
  console.log(
    "\n[RAG] indexed:",
    ingest.indexed,
    "| deleted:",
    ingest.deleted,
    "| provider:",
    embedProvider.name,
  );
  const hits = await searchEmbeddings(
    prisma,
    company.id,
    "insurance document expiring soon",
    embedProvider,
    3,
  );
  console.log('[RAG] top hits for "insurance document expiring soon":');
  for (const h of hits) {
    console.log(
      `  ${h.similarity.toFixed(3)} ${h.entityType}:${h.entityId} — ${h.content}`,
    );
  }

  const decision = routeIntent("berapa yang belum dibayar bulan ini?");
  const chat = await runCopilotChat(prisma, company.id, decision);
  console.log("\n[Copilot] intent:", decision.intent);
  console.log("Answer:\n" + chat.answer);
  console.log("Suggestions:", chat.suggestions.length);
  for (const s of chat.suggestions) {
    console.log("  •", s.label, "→", s.tool, JSON.stringify(s.params));
  }

  const recent = await prisma.agentRun.findMany({
    where: { companyId: company.id },
    orderBy: { startedAt: "desc" },
    take: 6,
    select: {
      id: true,
      agentType: true,
      status: true,
      intent: true,
      model: true,
      totalTokens: true,
    },
  });
  console.log("\nRuns terbaru:", recent.length);
  for (const r of recent) {
    console.log(
      `  ${r.agentType.padEnd(12)} ${r.status.padEnd(12)} ${(r.intent ?? "").padEnd(24)} ${r.model} (${r.totalTokens} token)`,
    );
  }

  const jobs = await processAvailableJobs(prisma, { limit: 5 });
  console.log("\nJobs diproses:", jobs.processed);

  const actions = await prisma.agentAction.findMany({
    where: { run: { companyId: company.id } },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      tool: true,
      status: true,
      mode: true,
      input: true,
      error: true,
      executedAt: true,
    },
  });
  console.log("\nAksi terbaru di Approval Queue:", actions.length);
  for (const a of actions) {
    console.log(
      `  • ${a.tool.padEnd(24)} ${a.status.padEnd(10)} ${a.mode ?? ""} ${JSON.stringify(a.input)}${a.executedAt ? " ✅" : ""}${a.error ? ` ⛔ ${a.error.slice(0, 140)}` : ""}`,
    );
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
