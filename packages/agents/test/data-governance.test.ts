import { describe, expect, it } from "vitest";
import { MockProvider } from "../src/providers/mock";
import { GeminiProvider } from "../src/providers/gemini";
import { OllamaProvider } from "../src/providers/ollama";
import { canProcessCompanyDataWithProvider } from "../src/providers/data-governance";

describe("external AI data governance", () => {
  it("allows local and mock providers without an external export opt-in", () => {
    expect(
      canProcessCompanyDataWithProvider("company-1", new MockProvider([]), {}),
    ).toBe(true);
    expect(
      canProcessCompanyDataWithProvider(
        "company-1",
        new OllamaProvider("http://localhost:11434"),
        { OLLAMA_BASE_URL: "http://localhost:11434" },
      ),
    ).toBe(true);
  });

  it("treats a remotely hosted Ollama endpoint as external", () => {
    expect(
      canProcessCompanyDataWithProvider(
        "company-1",
        new OllamaProvider("https://ollama.example.com"),
        { OLLAMA_BASE_URL: "https://ollama.example.com" },
      ),
    ).toBe(false);
  });

  it("blocks external providers by default", () => {
    expect(
      canProcessCompanyDataWithProvider(
        "company-1",
        new GeminiProvider("test-key"),
        {},
      ),
    ).toBe(false);
  });

  it("requires both the global switch and an explicit company allowlist", () => {
    const provider = new GeminiProvider("test-key");
    const environment = {
      AI_EXTERNAL_DATA_PROCESSING: "true",
      AI_EXTERNAL_DATA_COMPANY_ALLOWLIST: "company-1,company-2",
    };

    expect(
      canProcessCompanyDataWithProvider("company-1", provider, environment),
    ).toBe(true);
    expect(
      canProcessCompanyDataWithProvider("company-3", provider, environment),
    ).toBe(false);
  });
});
