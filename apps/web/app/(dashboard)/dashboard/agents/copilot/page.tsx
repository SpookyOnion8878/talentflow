"use client";

import { useRef, useState, useEffect } from "react";
import { Bot, Send, Sparkles, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@repo/ui/page-header";
import type { StoredCopilotSuggestion } from "@repo/agents";
import { useToast } from "@/components/toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  runId?: string;
  suggestions?: StoredCopilotSuggestion[];
}

const SUGGESTED = [
  "How much is unpaid this month?",
  "Which compliance documents are about to expire?",
  "Budget summary for this month",
];

export default function CopilotPage() {
  const toast = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.agents.chat.useMutation();
  const applyMutation = trpc.agents.applySuggestion.useMutation({
    onSuccess: (res) => {
      toast(
        res.status === "EXECUTED"
          ? "Action executed directly (non-financial/AUTO)."
          : res.status === "PROPOSED"
            ? "Action sent to the Approval Queue for approval."
            : `Rejected by guardrail: ${res.reason}`,
        res.status === "REJECTED" ? "error" : "success",
      );
    },
    onError: (err) => toast(err.message, "error"),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: trimmed }]);
    try {
      const res = await chatMutation.mutateAsync({ message: trimmed });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.answer,
          runId: res.runId,
          suggestions: res.suggestions,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `An error occurred: ${err instanceof Error ? err.message : "unknown"}`,
        },
      ]);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ops Copilot"
        description="Ask about your operational data; the agent suggests actions you can approve"
      />

      <div
        ref={scrollRef}
        className="flex max-h-[60vh] min-h-[320px] flex-col gap-4 overflow-y-auto rounded-xl border border-border bg-surface p-5 shadow-sm"
      >
        {messages.length === 0 && (
          <div className="m-auto text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-gradient">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <p className="mt-3 text-sm text-text-mid">Example questions:</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text-mid transition-colors hover:border-primary-300 hover:bg-soft"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm shadow-sm ${
                m.role === "user"
                  ? "bg-primary-600 text-white"
                  : "border border-border bg-bg text-text-hi"
              }`}
            >
              <p>{m.content}</p>
              {m.suggestions && m.suggestions.length > 0 && (
                <div className="mt-3 space-y-2">
                  {m.suggestions.map((s, j) => (
                    <div
                      key={j}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2"
                    >
                      <p className="text-xs text-text-mid">{s.label}</p>
                      <button
                        type="button"
                        disabled={applyMutation.isPending}
                        onClick={() =>
                          m.runId &&
                          applyMutation.mutate({
                            runId: m.runId,
                            suggestionId: s.id,
                          })
                        }
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-40"
                      >
                        <ArrowRight className="h-3 w-3" />
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {busy && (
          <div className="flex items-center gap-2 text-xs text-text-lo">
            <Bot className="h-4 w-4 animate-pulse" />
            Agent is reading the data…
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a question… e.g. “how much is unpaid?”"
          className="flex-1 rounded-xl border border-border px-4 py-3 text-sm focus:border-primary-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
          Send
        </button>
      </form>
    </div>
  );
}
