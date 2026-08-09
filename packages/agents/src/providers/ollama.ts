import type { ChatOptions, ChatResult, ModelProvider } from "./types";

/** Provider lokal 100% gratis via Ollama (OpenAI-compatible endpoint). */
export class OllamaProvider implements ModelProvider {
  readonly name = "ollama";

  constructor(private readonly baseUrl = "http://localhost:11434") {}
  async chat(options: ChatOptions): Promise<ChatResult> {
    const messages = options.messages.map((m) => {
      if (m.role === "tool") {
        return { role: "tool", content: m.content ?? "", name: m.name };
      }
      return {
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content ?? "",
        ...(m.toolCall
          ? {
              tool_calls: [
                {
                  id: `call_${m.toolCall.name}`,
                  type: "function",
                  function: {
                    name: m.toolCall.name,
                    arguments: m.toolCall.arguments,
                  },
                },
              ],
            }
          : {}),
      };
    });

    const body = {
      model: options.model,
      messages,
      stream: false,
      ...(options.tools?.length
        ? {
            tools: options.tools.map((f) => ({
              type: "function",
              function: f,
            })),
          }
        : {}),
    };

    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(
        `Ollama error ${res.status}: ${(await res.text()).slice(0, 500)}`,
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null;
          tool_calls?: Array<{
            function?: { name: string; arguments: string | object };
          }>;
        };
      }>;
      usage?: { total_tokens?: number };
    };

    const message = data.choices?.[0]?.message;
    const call = message?.tool_calls?.[0]?.function;

    return {
      content: message?.content ?? null,
      toolCall: call
        ? {
            name: call.name,
            arguments:
              typeof call.arguments === "string"
                ? call.arguments
                : JSON.stringify(call.arguments),
          }
        : null,
      totalTokens: data.usage?.total_tokens ?? 0,
    };
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", input: text }),
    });

    if (!res.ok) {
      throw new Error(
        `Ollama embed error ${res.status}: ${(await res.text()).slice(0, 500)}`,
      );
    }

    const data = (await res.json()) as {
      embeddings?: number[][];
    };
    const values = data.embeddings?.[0];
    if (!values?.length) {
      throw new Error(
        "Ollama returned empty embedding (pull nomic-embed-text first)",
      );
    }
    return values;
  }
}
