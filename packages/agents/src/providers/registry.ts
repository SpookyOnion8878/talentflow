import type { ModelProvider } from "./types";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import { MockProvider } from "./mock";

/** Selects the provider from the environment, defaulting to Gemini. */
export function getProvider(): ModelProvider {
  const provider = (process.env.MODEL_PROVIDER ?? "gemini").toLowerCase();

  switch (provider) {
    case "ollama":
      return new OllamaProvider(process.env.OLLAMA_BASE_URL ?? undefined);
    case "mock":
      return new MockProvider([]);
    default:
      return new GeminiProvider(process.env.GEMINI_API_KEY ?? "");
  }
}

/** Selects the model for a task tier, defaulting to the efficient fast model. */
export function getModelFor(tier: "fast" | "deep" = "fast"): string {
  return (
    process.env[tier === "fast" ? "MODEL_FAST" : "MODEL_DEEP"] ??
    "gemini-2.5-flash"
  );
}

/**
 * Selects the RAG embedding provider. Gemini is used when its API key exists;
 * otherwise the deterministic mock provider supports development and tests.
 */
export function getEmbeddingProvider(): ModelProvider {
  const provider = (process.env.MODEL_PROVIDER ?? "gemini").toLowerCase();
  if (provider === "ollama") {
    return new OllamaProvider(process.env.OLLAMA_BASE_URL ?? undefined);
  }
  if (process.env.GEMINI_API_KEY) {
    return new GeminiProvider(process.env.GEMINI_API_KEY);
  }
  return new MockProvider([]);
}
