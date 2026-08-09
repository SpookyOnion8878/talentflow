export interface ToolCall {
  name: string;
  arguments: string;
}

/**
 * Rol pesan internal engine (normalisasi antar provider):
 * - system / user → text
 * - assistant → text dan/atau suatu panggilan tool
 * - tool → hasil eksekusi tool (ganjil ke-1)
 */
export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content?: string | null;
  toolCall?: ToolCall | null;
  /** nama tool untuk pesan role "tool" */
  name?: string;
}

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ChatOptions {
  model: string;
  systemPrompt?: string;
  messages: ChatMessage[];
  tools?: FunctionDeclaration[];
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  content: string | null;
  toolCall?: ToolCall | null;
  totalTokens?: number;
}

export interface ModelProvider {
  readonly name: string;
  chat(options: ChatOptions): Promise<ChatResult>;
  /** Vektor embedding untuk RAG (dim harus konsisten antar provider). */
  embed(text: string): Promise<number[]>;
}
