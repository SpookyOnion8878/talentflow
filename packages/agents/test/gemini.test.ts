import { describe, expect, it } from "vitest";
import {
  buildGeminiMessages,
  parseGeminiResponse,
} from "../src/providers/gemini";
import type { ChatMessage } from "../src/providers/types";

describe("buildGeminiMessages", () => {
  it("memetakan system → systemInstruction dan tool result → functionResponse", () => {
    const messages: ChatMessage[] = [
      { role: "system", content: "kamu agent" },
      { role: "user", content: "halo" },
      {
        role: "assistant",
        toolCall: { name: "calcInvoice", arguments: "{}" },
      },
      { role: "tool", name: "calcInvoice", content: '{"ok":true}' },
    ];

    const body = buildGeminiMessages({
      model: "gemini-2.5-flash",
      systemPrompt: "kamu agent",
      messages,
      temperature: 0.2,
    });

    expect((body.systemInstruction as any).parts[0].text).toBe("kamu agent");
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
  it("mengambil teks & token", () => {
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

  it("mengambil functionCall", () => {
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

  it("melempar error bila tidak ada kandidat", () => {
    expect(() => parseGeminiResponse('{"candidates":[]}')).toThrow();
  });
});
