export interface ToolCall {
  name: string;
  arguments: string;
}

/**
 * Normalized internal message roles shared by every provider.
 */
export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content?: string | null;
  toolCall?: ToolCall | null;
  /** Tool name for a message with the tool role. */
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
  /** RAG embedding vector whose dimensions must be consistent across providers. */
  embed(text: string): Promise<number[]>;
}
