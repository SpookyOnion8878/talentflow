export * from "./types";
export * from "./providers/types";
export {
  getProvider,
  getModelFor,
  getEmbeddingProvider,
} from "./providers/registry";
export { GeminiProvider } from "./providers/gemini";
export { OllamaProvider } from "./providers/ollama";
export { MockProvider } from "./providers/mock";
export { zodToJsonSchema } from "./tools/schema";
export { calcInvoice, buildInvoiceNo, billingTools } from "./tools/billing";
export { complianceTools, REQUIRED_ACTIVE_TYPES } from "./tools/compliance";
export { toolRegistry, getTool } from "./tools/registry";
export { evaluateGuard } from "./guards/pipeline";
export { fetchAgentConfig } from "./config";
export { sendAgentEmail, emailRecipients } from "./email";
export * from "./engine/core";
export * from "./engine/actions";
export { runReActLoop } from "./engine/loop";
export { runBillingCycle, runWeeklySummary } from "./engine/billingCycle";
export { runComplianceScan } from "./engine/complianceScan";
export { routeIntent } from "./engine/router";
export {
  runCopilotChat,
  buildCopilotContext,
  buildCopilotResponse,
} from "./engine/copilot";
export type { CopilotContext, CopilotSuggestion } from "./engine/copilot";
export {
  enqueueAgentJob,
  claimPendingJobs,
  dispatchJob,
  processAvailableJobs,
} from "./jobs/queue";
export {
  ingestCompanyData,
  upsertEmbedding,
  deleteCompanyEmbeddings,
  searchEmbeddings,
} from "./rag";
export type { SearchHit, EmbeddingChunk } from "./rag";
