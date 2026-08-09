import type { AgentType } from "../types";

export interface IntentDecision {
  intent: string;
  agentType: AgentType;
  matchedRules: string[];
}

interface Rule {
  intent: string;
  agentType: AgentType;
  keywords: RegExp;
}

/**
 * Rule-based intent router (deterministic, $0, no LLM).
 * Supports both English and Indonesian keywords.
 */
const RULES: Rule[] = [
  {
    intent: "check_unpaid_invoices",
    agentType: "BILLING",
    keywords:
      /unpaid|outstanding|not paid|unsettled|payment.*pending|belum bayar|belum dibayar|menunggak|belum terbayar|lunas|piutang|follow.?up/i,
  },
  {
    intent: "create_invoice_draft",
    agentType: "BILLING",
    keywords:
      /create.*(invoice|draft)|generate.*(invoice|draft)|new invoice|draft.*invoice|buat.*(invoice|invois|tagihan)|generate.*(invoice|invois|tagihan)|invoice.*baru/i,
  },
  {
    intent: "aging_report",
    agentType: "BILLING",
    keywords:
      /aging|dso|overdue|late payment|days outstanding|jatuh tempo|terlambat|umur.*(invoice|invois)|lebih.?dari 30/i,
  },
  {
    intent: "compliance_status",
    agentType: "COMPLIANCE",
    keywords:
      /compliance|expiry|expired|expires?|documents?|visa|work.?permit|license|kadaluarsa|kadaluwarsa|dokumen|izin kerja|masa berlaku|mendekati/i,
  },
  {
    intent: "compliance_reminder",
    agentType: "COMPLIANCE",
    keywords:
      /(remind|reminder|pengingat|ingatkan).*(compliance|document|dokumen|izin|visa|permit)|re.?upload|upload.*new/i,
  },
  {
    intent: "budget_and_cost",
    agentType: "BILLING",
    keywords:
      /budget|cost|spend|spending|expense|biaya|token|pengeluaran|belanja bulan/i,
  },
];

const DEFAULT: { intent: string; agentType: AgentType } = {
  intent: "general_question",
  agentType: "GENERAL",
};

export function routeIntent(message: string): {
  intent: string;
  agentType: AgentType;
  matchedRules: string[];
} {
  const matched: string[] = [];
  for (const rule of RULES) {
    if (rule.keywords.test(message)) {
      matched.push(rule.intent);
    }
  }

  if (matched.length === 0) {
    return { ...DEFAULT, matchedRules: [] };
  }

  // Priority: financial intents (aging > unpaid > budget > draft), then compliance.
  const priority = [
    "aging_report",
    "check_unpaid_invoices",
    "budget_and_cost",
    "create_invoice_draft",
    "compliance_reminder",
    "compliance_status",
  ];
  const chosen = priority.find((p) => matched.includes(p))!;
  const rule = RULES.find((r) => r.intent === chosen)!;
  return {
    intent: rule.intent,
    agentType: rule.agentType,
    matchedRules: matched,
  };
}
