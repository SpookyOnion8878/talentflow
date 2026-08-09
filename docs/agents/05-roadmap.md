# Roadmap 12 Minggu — MVP AgentOps di TalentFlow

Fokus: membangun **engine (Opsi D)** sambil **memanfaatkan data nyata TalentFlow (Opsi A)**.
Semua milestone selesai dengan: code + test + dokumentasi dilewati di review.

## Peta Besar (Executive View)

```
M1–M2  Fondasi         : engine + skema DB + trigger
M3–M5  Billing Agent   : alur invoice end-to-end (valido) + queue UI
M6–M7  Compliance Agent: modul keduadi (bukti engine reusable)
M8–M10 Ops Copilot     : RAG chat + action suggestion
M11–12 Hardening & Dem : eval set, guard-proofing, showcase
```

## Minggu 1–2 — Fondasi (Engine + Data)

| Deliverable                                                                                                   | Kriteria Selesai (Exit)                                                 |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Prisma: `AgentJob`, `AgentRun`, `AgentAction`, `AgentConfig` + migration + seed config default                | `pnpm db:push` sukses; studio merender tabel; company demo punya config |
| `packages/agents` init (engine): loop, intent router, step runner, retry/backoff                              | unit test loop dengan mock provider pass                                |
| ModelProvider interface + `GeminiProvider` (+ `OllamaProvider` dev)                                           | smoke: chat call 1 run di terminal, token tercatat                      |
| Trigger: hook di mutation tRPC `timesheet.approve`, `invoice.create`, `compliance.update` → insert `AgentJob` | approoval timesheet → AgentJob muncul (test e2e kecil)                  |
| pg_cron: job harian & mingguan (`CRON_DAILY`)                                                                 | tabel AgentJob mendapat baris cron saat run manual                      |

## Minggu 3–5 — Billing Agent (Core)

| Deliverable                                                                                                                                                 | Exit                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Tool set billing: `getApprovedTimesheets`, `calcInvoice` (deterministik), `createDraftInvoice`, `getUnpaidInvoice`, `sendInvoiceReminder`, `getAgingReport` | tool-registry: 6 tool registered, zod-validated, di-guard                       |
| Alur: summary billing cycle → pending actions                                                                                                               | tanpa LLM input untuk math: angka draft = angka excel (test deterministik pass) |
| Approval Queue UI (`apps/web/(dashboard)/agents/queue`)                                                                                                     | approve → invoice dibuat + audit + notif; stale → EXPIRED                       |
| Activity Log page (filter company/agent/status)                                                                                                             | tampil run + step + token                                                       |
| Template email `invoice-reminder` di `packages/email` (3 tier)                                                                                              | email test terkirim via Resend (draft)                                          |

**Demo M5**: Batch timesheets → queue berisi draft invoice → approve 1 → invoice status
terkirim + email terkirim + audit terdaftar.

## Minggu 6–7 — Compliance Agent (bukti engine reusable)

| Deliverable                                                                                                                  | Exit                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Tool batch: `getComplianceRecords`, `markExpired`, `suspendFreelancer` (non-finansial, auto), `draftReUploadEmail` (propose) | seluruhnya jalan tanpa perubahan engine (hanya register tool + prompt) |
| Alur: cron harian → scan → reminder 30/7/0 (auto) → EXPIRED → SUSPENDED freelancer                                           | simulasi tanggal dekat = verifikasi di sesi test                       |
| UI: badge "Compliance Agent aktif" + events di Activity                                                                      | terlihat status di dashboard compliance                                |
| Eval set pertama: 20 golden scenario (update: status, reminder timing)                                                       | semua pass                                                             |

**Demo M2**: Dokumen expired → freelancer otomatis di-suspend, email reminder terkirim,
audit punya jejak.

## Minggu 8–9 — Ops Copilot (RAG + Action)

| Deliverable                                                                 | Exit                                    |
| --------------------------------------------------------------------------- | --------------------------------------- |
| `AgentEmbedding` + ingestion: freelancer/invoice/compliance text → pgvector | index berfungsi, query semantic test OK |
| Copilot chat UI (sidebar page) + tRPC `agents.chat`                         | menjawab 3 pertanyaan demo akurat       |
| Action suggestion: intent user → candidate tools (propose hanya)            | usulan mengutip data nyata (< 10s)      |

**Demo M3**: "berapa yang belum dibayar bulan ini?" → list invoice unpaid + button
"kirim reminder" = proposal di queue.

## Minggu 11–12 — Hardening, Eval, Showcase

| Deliverable                                                                               | Exit                                                      |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Eval suite (vitest + golden set, 20–30 kasus) di `packages/agents`                        | regression pass; skor intent-accuracy > 85%               |
| Guard policy: restrict (RBAC, budget force-propose, state guard, idempotency) stress test | tidak ada duplikat invoice dalam 100 iterasi (test sifat) |
| Cost dashboard: token/company/minggu + alert 80%                                          | query & UI siap                                           |
| README + demo script (dkm ke Vercel)                                                      | 3 demo ter-recall repeatable                              |
| Code review + lint/check-types hijau + CI pass                                            | pipeline clean                                            |

## Risiko Utama & Mitigasi

| Risiko                                          | Mitigasi                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------- |
| Quota Gemini habis di tengah                    | Ollama lokal dev; caching; provider routing env cepat                 |
| LLM salah paham intent (billing vs compliance?) | Intent routing hybrid (rule dulu, LLM cadangan); eval intent-accuracy |
| Approval queue penuh (banyak action)            | Batching; prioritas finansial; auto-expire                            |
| Loop tak konvergen (endless loop)               | max step 8 + timeout; fail → NEEDS_REVIEW                             |
| Biaya tak terduga                               | `AgentConfig.monthlyTokenBudget` + cap per-aksi; dashboard cost       |

## Definisi "Selesai" Global

- 3 demo (M1–M3) bisa dijalankan ulang tanpa kode-perubahan.
- Semua aksi agent masuk audit; override rate dan success rate terekam.
- Proyek bisa dijalankan **$0** (tanpa kartu kredit), dan siap naik kelas dengan
  perubahan env-only.

## Fase Lanjutan (Setelah 12 Minggu — "E atau D productized")

1. **Agent Marketplace/General**: agent baru (mis. procurement, finance ops) lewat
   konfigurasi baru — 1–2 minggu per agent baru.
2. **Productize engine**: pakai engine untuk domain lain dengan connectors Gmail/Slack/
   storage → jual sebagai internal tooling / SaaS.
3. **Pricing**: add-on "Copilot" di plan Pro (paket retributo), Enterprise unlimited
   - SLA (mode AUTO kerja) — hitung berdasarkan token spec di `AgentRun`.
