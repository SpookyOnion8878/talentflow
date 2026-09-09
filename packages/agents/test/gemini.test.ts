import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildGeminiMessages,
  GeminiProvider,
  parseGeminiResponse,
} from "../src/providers/gemini";
import type { ChatMessage } from "../src/providers/types";

describe("buildGeminiMessages", () => {
  it("maps system and tool messages to the Gemini request format", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "You are an agent" },
      { role: "user", content: "Hello" },
      {
        role: "assistant",
        toolCall: { name: "calcInvoice", arguments: "{}" },
      },
      { role: "tool", name: "calcInvoice", content: '{"ok":true}' },
    ];

    const body = buildGeminiMessages({
      model: "gemini-2.5-flash",
      systemPrompt: "You are an agent",
      messages,
      temperature: 0.2,
    });

    expect((body.systemInstruction as any).parts[0].text).toBe(
      "You are an agent",
    );
    const contents = body.contents as Array<{ role: string; parts: any[] }>;
    expect(contents[0].role).toBe("user");
    expect(contents[1].role).toBe("model");
    expect(contents[1].parts[0].functionCall.name).toBe("calcInvoice");
    expect(contents[2].role).toBe("function");
    expect(contents[2].parts[0].functionResponse.name).toBe("calcInvoice");
    expect((body.generationConfig as any).temperature).toBe(0.2);
  });
});

describe("parseGeminiResponse", () => {
  it("extracts text and token usage", () => {
    const result = parseGeminiResponse(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: "ok" }] } }],
        usageMetadata: { totalTokenCount: 42 },
      }),
    );
    expect(result.content).toBe("ok");
    expect(result.totalTokens).toBe(42);
    expect(result.toolCall).toBeNull();
  });

  it("extracts function calls", () => {
    const result = parseGeminiResponse(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  functionCall: {
                    name: "ticket",
                    args: { id: "1" },
                  },
                },
              ],
            },
          },
        ],
      }),
    );
    expect(result.toolCall).not.toBeNull();
    expect(result.toolCall!.name).toBe("ticket");
    expect(JSON.parse(result.toolCall!.arguments)).toEqual({ id: "1" });
  });

  it("throws when the API returns no candidates", () => {
    expect(() => parseGeminiResponse('{"candidates":[]}')).toThrow();
  });
});

describe("GeminiProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses the documented generateContent endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: "ok" }] } }],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const provider = new GeminiProvider("test-key");
    await provider.chat({
      model: "gemini-test",
      messages: [{ role: "user", content: "Hello" }],
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent",
      expect.any(Object),
    );
  });
});
