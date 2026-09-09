import type { ModelProvider } from "./types";

function isLoopbackOllama(
  provider: ModelProvider,
  environment: Record<string, string | undefined>,
): boolean {
  if (provider.name.toLowerCase() !== "ollama") return false;
  try {
    const hostname = new URL(
      environment.OLLAMA_BASE_URL ?? "http://localhost:11434",
    ).hostname;
    return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
  } catch {
    return false;
  }
}

export function isExternalModelProvider(
  provider: ModelProvider,
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return (
    provider.name.toLowerCase() !== "mock" &&
    !isLoopbackOllama(provider, environment)
  );
}

export function canProcessCompanyDataWithProvider(
  companyId: string,
  provider: ModelProvider,
  environment: Record<string, string | undefined> = process.env,
): boolean {
  if (!isExternalModelProvider(provider, environment)) return true;
  if (environment.AI_EXTERNAL_DATA_PROCESSING !== "true") return false;

  const allowedCompanies = new Set(
    (environment.AI_EXTERNAL_DATA_COMPANY_ALLOWLIST ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  return allowedCompanies.has(companyId);
}
