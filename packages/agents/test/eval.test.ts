import { describe, it, expect } from "vitest";
import { routeIntent } from "../src/engine/router";

/**
 * Golden set intent routing — 18 skenario nyata (billing/compliance/general).
 * Target akurasi MVP: >= 85% (PRD KPI).
 */
const GOLDEN: Array<[string, string, string]> = [
  // Billing — unpaid
  ["berapa yang belum dibayar bulan ini?", "check_unpaid_invoices", "BILLING"],
  ["invoice apa saja yang masih unpaid?", "check_unpaid_invoices", "BILLING"],
  ["total tagihan belum lunas?", "check_unpaid_invoices", "BILLING"],
  ["ada invoice yang belum dibayar klien?", "check_unpaid_invoices", "BILLING"],
  ["follow up invoice yang belum bayar", "check_unpaid_invoices", "BILLING"],
  // Billing — aging / DSO
  ["buat laporan aging invoice", "aging_report", "BILLING"],
  ["berapakah DSO kita sekarang?", "aging_report", "BILLING"],
  ["invoice mana yang sudah jatuh tempo?", "aging_report", "BILLING"],
  // Billing — draft
  [
    "buat draft invoice untuk freelancer ini",
    "create_invoice_draft",
    "BILLING",
  ],
  ["generate invoice minggu ini", "create_invoice_draft", "BILLING"],
  // Billing — budget
  [
    "berapa yang sudah terpakai dari budget bulan ini?",
    "budget_and_cost",
    "BILLING",
  ],
  ["ringkasan token agent bulan ini", "budget_and_cost", "BILLING"],
  // Compliance
  ["dokumen apa yang mau kadaluarsa?", "compliance_status", "COMPLIANCE"],
  ["visa freelancer mana yang mau expire?", "compliance_status", "COMPLIANCE"],
  ["compliance kerja apa yang expired?", "compliance_status", "COMPLIANCE"],
  [
    "kirim pengingat dokumen yang mau kadaluwarsa",
    "compliance_reminder",
    "COMPLIANCE",
  ],
  [
    "remind aku tentang izin kerja yang mau habis",
    "compliance_reminder",
    "COMPLIANCE",
  ],
  // General
  ["halo, kamu bisa bantu apa?", "general_question", "GENERAL"],
  ["siapa kamu?", "general_question", "GENERAL"],
  ["bagaimana cara masuk ke aplikasi?", "general_question", "GENERAL"],
];

describe("eval: intent router (golden set)", () => {
  it("reaches accuracy >= 85% on 20 golden scenarios", () => {
    let correct = 0;
    for (const [message, expectIntent, expectAgent] of GOLDEN) {
      const d = routeIntent(message);
      if (d.intent === expectIntent && d.agentType === expectAgent) {
        correct++;
      }
    }
    const accuracy = correct / GOLDEN.length;
    expect(accuracy).toBeGreaterThanOrEqual(0.85);
    expect(accuracy).toBe(1); // rule-based deterministik harus sempurna pada golden
  });

  it("falls back to GENERAL for out-of-domain questions", () => {
    const d = routeIntent("tolong review performance dashboard saya");
    expect(d.agentType).toBe("GENERAL");
  });

  it("prioritizes financial intent over compliance on mixed queries", () => {
    const d = routeIntent(
      "invoice belum dibayar dan compliance mau kadaluarsa",
    );
    expect(d.intent).toBe("check_unpaid_invoices");
    expect(d.agentType).toBe("BILLING");
  });
});
