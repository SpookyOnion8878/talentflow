import type { PrismaClient, AgentRun } from "@repo/db";
import type {
  AgentTrigger,
  AgentType,
  StepRecord,
  ToolContext,
  ToolDef,
} from "../types";
import type { ModelProvider } from "../providers/types";
import type { FunctionDeclaration } from "../providers/types";
import { attachToolAction, checkTokenBudget, endRun, startRun } from "./core";
import { zodToJsonSchema } from "../tools/schema";
import { fetchAgentConfig } from "../config";

export interface LoopOptions {
  companyId: string;
  prisma: PrismaClient;
  agentType: AgentType;
  triggerType: AgentTrigger;
  intent: string;
  systemPrompt: string;
  tools: ToolDef[];
  provider: ModelProvider;
  model?: string;
  maxSteps?: number;
  triggeredById?: string | null;
}

const SYSTEM_RULES = [
  "You are the TalentFlow operations AI agent.",
  "Never calculate money yourself: use the available tools.",
  "If data is insufficient or you are unsure, answer in text; do not guess.",
  "Use one tool per step; check the result before deciding the next step.",
  "Finish with a concise text message to the user.",
].join(" ");

function truncate(value: unknown, maxLen = 4000): unknown {
  const json = JSON.stringify(value);
  if (!json) return undefined;
  return json.length <= maxLen
    ? value
    : { truncated: true, preview: json.slice(0, maxLen) };
}

function toDeclaration(tool: ToolDef): FunctionDeclaration {
  return {
    name: tool.name,
    description: tool.description,
    parameters: zodToJsonSchema(tool.inputSchema),
  };
}

/**
 * Loop ReAct generik: LLM memutuskan tool, guardrails dijalankan tiap
 * langkah, semua jejak disimpan di AgentRun.steps.
 */
export async function runReActLoop(
  opts: LoopOptions,
): Promise<AgentRun | null> {
  const config = await fetchAgentConfig(
    opts.prisma,
    opts.companyId,
    opts.agentType,
  );
  if (!config?.enabled) return null;

  const run = await startRun(opts.prisma, {
    companyId: opts.companyId,
    agentType: opts.agentType,
    triggerType: opts.triggerType,
    intent: opts.intent,
    model: opts.model ?? opts.provider.name,
  });

  const steps: StepRecord[] = [];
  const messages: Array<{
    role: "system" | "user" | "assistant" | "tool";
    content?: string | null;
    toolCall?: { name: string; arguments: string } | null;
    name?: string;
  }> = [{ role: "system", content: `${opts.systemPrompt}\n\n${SYSTEM_RULES}` }];

  let status: "SUCCEEDED" | "FAILED" | "NEEDS_REVIEW" = "SUCCEEDED";
  let totalTokens = 0;
  let error: string | undefined;

  try {
    const maxSteps = opts.maxSteps ?? 8;
    let finished = false;

    for (let i = 0; i < maxSteps && !finished; i++) {
      const budget = await checkTokenBudget(
        opts.prisma,
        opts.companyId,
        opts.agentType,
        config.monthlyTokenBudget,
      );
      if (!budget.ok) {
        steps.push({
          index: i,
          kind: "error",
          output: `Monthly token budget exhausted (${budget.used}/${config.monthlyTokenBudget})`,
        });
        status = "NEEDS_REVIEW";
        break;
      }

      const res = await opts.provider.chat({
        model: opts.model ?? "gemini-2.5-flash",
        systemPrompt: undefined,
        messages,
        tools: opts.tools.map(toDeclaration),
        temperature: 0.2,
      });

      totalTokens += res.totalTokens ?? 0;

      if (!res.toolCall) {
        messages.push({ role: "assistant", content: res.content });
        steps.push({
          index: i,
          kind: "message",
          output: res.content?.slice(0, 500),
        });
        finished = true;
        break;
      }

      const tool = opts.tools.find((t) => t.name === res.toolCall!.name);
      messages.push({
        role: "assistant",
        toolCall: res.toolCall,
      });

      if (!tool) {
        messages.push({
          role: "tool",
          name: res.toolCall!.name,
          content: JSON.stringify({ status: "unknown_tool" }),
        });
        steps.push({
          index: i,
          kind: "invalid",
          tool: res.toolCall!.name,
          output: "unknown tool",
        });
        continue;
      }

      let rawInput: unknown;
      try {
        rawInput = JSON.parse(res.toolCall!.arguments);
      } catch {
        rawInput = {};
      }
      const parsed = tool.inputSchema.safeParse(rawInput);

      if (!parsed.success) {
        messages.push({
          role: "tool",
          name: tool.name,
          content: JSON.stringify({
            status: "invalid_arguments",
            issues: parsed.error.issues,
          }),
        });
        steps.push({
          index: i,
          kind: "invalid",
          tool: tool.name,
          output: parsed.error.issues,
        });
        continue;
      }

      const result = await attachToolAction({
        prisma: opts.prisma,
        runId: run.id,
        companyId: opts.companyId,
        agentType: opts.agentType,
        tool,
        input: parsed.data,
        index: i,
        actorRole: "SYSTEM",
        steps,
      });

      const response = result.deniedReason
        ? { status: "denied", reason: result.deniedReason }
        : {
            status: "ok",
            actionId: result.action?.id,
            mode: result.action?.mode,
          };
      messages.push({
        role: "tool",
        name: tool.name,
        content: JSON.stringify(truncate(response)),
      });
    }

    if (!finished) {
      status = "NEEDS_REVIEW";
      steps.push({
        index: maxSteps,
        kind: "error",
        output: "max steps reached without a final decision",
      });
    }
  } catch (err) {
    status = "FAILED";
    error = err instanceof Error ? err.message : String(err);
    steps.push({ index: 0, kind: "error", output: error });
  }

  return endRun(opts.prisma, run.id, { status, steps, totalTokens, error });
}
