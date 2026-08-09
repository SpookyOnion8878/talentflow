import type {
  ChatMessage,
  ChatOptions,
  ChatResult,
  ModelProvider,
} from "./types";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const EMBEDDING_MODEL = "text-embedding-004";
export const EMBEDDING_DIM = 768;

function parseJsonSafe(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

/**
 * Menerjemahkan pesan engine ke body REST Gemini (murni, bisa di-test
 * tanpa jaringan).
 */
export function buildGeminiMessages(
  options: ChatOptions,
): Record<string, unknown> {
  const contents: Array<{ role: string; parts: Record<string, unknown>[] }> =
    [];

  for (const msg of options.messages) {
    if (msg.role === "system") continue;

    if (msg.role === "assistant") {
      const parts: Record<string, unknown>[] = [];
      if (msg.content) parts.push({ text: msg.content });
      if (msg.toolCall)
        parts.push({
          functionCall: {
            name: msg.toolCall.name,
            arguments: parseJsonSafe(msg.toolCall.arguments),
          },
        });
      contents.push({ role: "model", parts });
    } else if (msg.role === "tool") {
      contents.push({
        role: "function",
        parts: [
          {
            functionResponse: {
              name: msg.name,
              response: parseJsonSafe(msg.content ?? "{}"),
            },
          },
        ],
      });
    } else {
      contents.push({ role: "user", parts: [{ text: msg.content ?? "" }] });
    }
  }

  const body: Record<string, unknown> = { contents };

  if (options.systemPrompt) {
    body.systemInstruction = { parts: [{ text: options.systemPrompt }] };
  }
  if (options.tools?.length) {
    body.tools = [{ functionDeclarations: options.tools }];
  }
  if (options.temperature != null || options.maxTokens != null) {
    body.generationConfig = {
      ...(options.temperature != null
        ? { temperature: options.temperature }
        : {}),
      ...(options.maxTokens != null
        ? { maxOutputTokens: options.maxTokens }
        : {}),
    };
  }

  return body;
}

export function parseGeminiResponse(raw: string): ChatResult {
  const data = JSON.parse(raw) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string; functionCall?: any }> };
    }>;
    usageMetadata?: { totalTokenCount?: number };
  };

  const candidate = data.candidates?.[0];
  if (!candidate?.content) {
    throw new Error("Gemini returned no candidates");
  }

  const parts = candidate.content.parts ?? [];
  const text =
    parts
      .filter((p) => typeof p.text === "string")
      .map((p) => p.text)
      .join("") || null;
  const fn = parts.find((p) => p.functionCall);

  return {
    content: text,
    toolCall: fn
      ? {
          name: fn.functionCall!.name,
          arguments: JSON.stringify(fn.functionCall!.args ?? {}),
        }
      : null,
    totalTokens: data.usageMetadata?.totalTokenCount ?? 0,
  };
}

function assertApiKey(apiKey: string): void {
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is empty. Set it in .env, or use MODEL_PROVIDER=ollama for local dev.",
    );
  }
}

export class GeminiProvider implements ModelProvider {
  readonly name = "gemini";

  constructor(private readonly apiKey: string) {
    assertApiKey(apiKey);
  }

  async chat(options: ChatOptions): Promise<ChatResult> {
    const body = buildGeminiMessages(options);
    const res = await fetch(
      `${API_BASE}/models/${options.model}/:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 500);
      throw new Error(`Gemini API error ${res.status}: ${detail}`);
    }

    return parseGeminiResponse(await res.text());
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(
      `${API_BASE}/models/${EMBEDDING_MODEL}:embedContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": this.apiKey,
        },
        body: JSON.stringify({ content: { parts: [{ text }] } }),
      },
    );

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 500);
      throw new Error(`Gemini embed error ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as {
      embedding?: { values?: number[] };
    };
    const values = data.embedding?.values;
    if (!values?.length) {
      throw new Error("Gemini returned empty embedding");
    }
    return values;
  }
}
