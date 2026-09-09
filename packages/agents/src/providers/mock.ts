import type { ChatResult, ModelProvider } from "./types";
import { EMBEDDING_DIM } from "./gemini";

/** Creates a deterministic hash for each mock-embedding word token. */
function hashWord(word: string): number {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) {
    h ^= word.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Network-free provider for unit tests and local smoke tests.
 * Each scripted tool response is executed before the provider returns final text.
 */
export class MockProvider implements ModelProvider {
  readonly name = "mock";

  constructor(private readonly script: Array<ChatResult>) {}

  async chat(): Promise<ChatResult> {
    const next = this.script.shift();
    if (!next) {
      throw new Error("MockProvider: scripted responses are exhausted");
    }
    return next;
  }

  async embed(text: string): Promise<number[]> {
    const vec = new Array<number>(EMBEDDING_DIM).fill(0);
    const bump = (key: string, weight: number) => {
      const idx = hashWord(key) % EMBEDDING_DIM;
      vec[idx] = (vec[idx] ?? 0) + weight;
    };
    for (const word of text
      .toLowerCase()
      .split(/\W+/)
      .filter((w): w is string => w.length > 0)) {
      bump(word, 1);
      bump(word.slice(0, 3), 0.5);
      bump(word.slice(-3), 0.5);
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
    return vec.map((v) => v / norm);
  }
}
