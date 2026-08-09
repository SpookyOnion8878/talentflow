import type { ModelProvider } from "./types";
import { GeminiProvider } from "./gemini";
import { OllamaProvider } from "./ollama";
import { MockProvider } from "./mock";

/** Mengambil provider dari env. Default: gemini (gratis). */
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

/** Nama model per tier tugas. Default gemini-2.5-flash (fast) untuk hemat kuota. */
export function getModelFor(tier: "fast" | "deep" = "fast"): string {
  return (
    process.env[tier === "fast" ? "MODEL_FAST" : "MODEL_DEEP"] ??
    "gemini-2.5-flash"
  );
}

/**
 * Provider untuk embedding RAG. Bisa dijalankan tanpa API key ($0):
 * pakai Gemini bila ada GEMINI_API_KEY, kalau tidak jatuh ke MockProvider
 * (deterministik, cocok untuk dev/demo/test).
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
