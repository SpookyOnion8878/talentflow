# Arsitektur — AgentOps (AI Agents di TalentFlow)

## 1. Prinsip Arsitektur

| Prinsip                                    | Implementasi                                                                                                                                               |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Reuse-first**                            | Tidak membangun infra baru yang wajib: DB (Prisma/Supabase), tRPC, RBAC, AuditLog, Notification, Resend — semuanya dipakai apa adanya.                     |
| **Gratis-first, upgrade-able**             | Semua komponen pihak ketiga punya free tier yang memadai untuk uji coba; akses model via interface agar bisa diganti tanpa rewrite (`04-stack-gratis.md`). |
| **LLM hanya memutuskan, tidak menghitung** | Semua perhitungan numerik deterministik di kode; LLM menentukan intent & memilih tool + argumen.                                                           |
| **Human-in-the-loop**                      | Tindakan finansial selalu `propose`; `auto` hanya aksi low-risk non-finansial.                                                                             |
| **Idempotency**                            | Setiap aksi punya kunci unik; retry tidak menggandakan efek.                                                                                               |
| **Tenant isolation**                       | Seluruh tool query membawa `companyId` dari konteks run; guard mencegah lintas perusahaan.                                                                 |
| **Observability-native**                   | Setiap run punya jejak lengkap (steps, token, error) di `AgentRun`.                                                                                        |

## 2. Diagram Komponen

```
                    ┌─────────────────────────────────────────────┐
                    │                  CLIENTS                    │
                    │  Dashboard UI  (apps/web/app/(dashboard)/agents)  │
                    │  Approval Queue │ Chat Copilot │ Activity    │
                    └───────────────┬─────────────────────────────┘
                                    │ tRPC (router `agents`)
                                    │
                    ┌───────────────▼─────────────────────────────┐
                    │            ORCHESTRATOR (packages/agents)     │
                    │                                             │
                    │  Trigger ──► Intent Router ──► ReAct Loop    │
                    │  (event/cron/chat)          │ step ≤ 8       │
                    │                             ▼                │
                    │                    Tool Registry             │
                    │   Guard Rails  ◄──(every tool call)          │
                    │   (RBAC │ budget │ state │ idempotency)      │
                    └───────┬──────────────┬──────────────┬────────┘
                            │              │              │
              ┌─────────────▼──┐   ┌────────▼────────┐   ┌─▼──────────────┐
              │  TOOLS (tRPC)  │   │  MODEL PROVIDER │   │  EMAIL (Resend)│
              │  timesheet/    │   │  (interface)    │   │  templates     │
              │  invoice/      │   │  Gemini (free)  │   │  packages/email│
              │  compliance/   │   │  Groq │ Ollama  │   │                │
              │  notification  │   └────────┬────────┘   └────────────────┘
              └───────┬────────┘            │
                      │                     │
              ┌───────▼─────────────────────▼───────┐
              │         DATA (Supabase Postgres)     │
              │  AgentJob │ AgentRun │ AgentAction   │
              │  AgentConfig │ (Prisma existing)     │
              └──────────────────────────────────────┘
```

## 3. Komponen Inti

### 3.1 Trigger Layer → `AgentJob` (antrian berbasis DB)

- **Event sinkron**: mutation tRPC existing (mis. `timesheet.approved`, `invoice.created`)
  menyisipkan baris `AgentJob` (di luar transaction utama, jangan blokir request user).
- **Cron**: Supabase `pg_cron` (gratis, fleksibel) menjadwalkan `CRON_DAILY`/`CRON_WEEKLY`
  → memanggil route worker; Vercel Cron opsional untuk heartbeat.
- **User chat**: langsung dari UI → orchestrator.
- Kenapa DB queue, bukan Redis? Frekuensi MVP kecil (beberapa job/ jam per company),
  Postgres cukup, tanpa biaya & tanpa service tambahan (ADR-002).

### 3.2 Orchestrator (ReAct loop)

```
1. Ambil AgentJob (dengan lock per-company, advisory lock)
2. Intent Router: klasifikasi intent dari event + konteks (rule + LLM fast)
3. Loop (maks 8 langkah):
   a. LLM melihat: intent, konteks (data yang relevan), daftar tools (name+schema+deskripsi)
   b. LLM memilih tool + argumen (JSON ter-validasi Zod)
   c. Guard Rails menilai (lihat 3.3) → lulus / tolak / downgrade ke propose
   d. Tool dieksekusi (idempotent), hasil di-append ke konteks
4. Hasil akhir: AgentAction(s) dalam status auto_executed / pending (approval)
5. Tulis AgentRun lengkap + audit + notification
```

Failure handling: retry backoff 3x, kemudian `FAILED` + notify admin; finansial yang gagal
selalu berakhir `NEEDS_REVIEW` — tidak pernah gagal diam-diam.

### 3.3 Tool Registry & Guard Rails

Definisi tool (struktur data, bukan method):

```
Tool {
  name: "createDraftInvoice",
  description: "Membuat draft invoice dari timesheet approved...",
  schema: z.object({ freelancerId, period, ... }),   // zod
  permission: ["OWNER","ADMIN","FINANCE","SYSTEM"],
  mode: "PROPOSE",                                    // default; bisa di-override config
  idempotencyKey: (input, companyId) => `inv:${companyId}:${period}:${freelancerId}`,
  pure: true | false,                                 // true = deterministik, tanpa LLM
}
```

Guard pipeline (dievaluasi berurutan, gagal satu → tolak):

1. **RBAC** — role pemicu/konteks boleh memanggil tool ini?
2. **Entitlement** — plan & `AgentConfig.enabled` untuk agentType.
3. **Budget guard** — nilai aksi tidak melebihi threshold config (mis. invoice > $10k →
   paksa `propose` meski config `auto`); token budget perusahaan belum habis.
4. **State guard** — freelancer ACTIVE? contract ACTIVE? compliance OK? periode valid?
5. **Idempotency** — kunci unik belum pernah dipakai.

### 3.4 Model Provider (interface)

```
interface ModelProvider {
  chat(messages, opts): Promise<ChatResult>   // {content, usage}
  embed(text): Promise<number[]>
  supportsToolCalling: boolean
}
```

- Implementasi yang disediakan di MVP: `GeminiProvider` (free tier API key), `GroqProvider`
  (free tier Llama/Qwen), `OllamaProvider` (lokal, tak terbatas untuk dev).
- Pemilihan provider & model via env (`MODEL_PROVIDER`, `MODEL_FAST`, `MODEL_DEEP`).
- **Model routing**: tugas ringan (classify intent, extract, summarize) → `MODEL_FAST`
  (Gemini Flash / Llama), tugas judgment kompleks → `MODEL_DEEP` (2.5 Pro / llama-70b).
- Embedding → `pgvector` (Supabase extension) — `embeddings` table + index `ivfflat/hnsw`.

### 3.5 Approval & Execution

- Aksi `propose` → row `AgentAction` status `PENDING` → UI queue.
- Approve → eksekusi tool **ulang dengan konteks asli** (bukan hasil lama — guardrails
  di jalankan lagi pada saat eksekusi; jika kondisi berubah, reject otomatis "stale").
- Reject → `AgentAction.status = REJECTED` + reason → ditulis ke `AgentRun.steps`.
- Auto-expire proposal > 7 hari → status `EXPIRED` + notif.

### 3.6 Observability & Cost Tracking

- `AgentRun`: intent, trigger, model, totalTokens, status, steps (json), error.
- `AgentAction`: tool, input/output, mode, status, approver, executedAt.
- Statistik agregat (query): token/hari/company, biaya estimasi, override rate, success rate.
- (Opsional, phase lanjut) export trace ke Langfuse free tier — format sudah siap karena
  `steps` json mengikuti spek otel/trace.

## 4. Alur Eksekusi Contoh (Billing Cycle)

```
[T-1] cron pg_cron 01:00 setiap Minggu → AgentJob(company, CRON_WEEKLY, "BILLING")
[T-2] Worker ambil job (advisory lock company)
[T-3] Intent Router → "generate_invoices_for_last_week"
[T-4] LLM fast (classify) → butuh data: tool getApprovedTimesheets(companyId, period)
[T-5] Guard: companyId cocok; token budget ok → eksekusi
[T-6] kode deterministik: calcInvoice (jam x rate; pajak)  ← TIDAK lewat LLM
[T-7] LLM (fast) memilih: untuk setiap freelancer → createDraftInvoice(input)
       → guard: budget > $10k? → mode force PROPOSE; mode umum = PROPOSE
[T-8] AgentAction PENDING × N → UI Approval Queue
[T-9] Finance approve 1 → re-run guard → eksekusi createDraftInvoice (idempotency key)
       → AuditLog(actorType: AGENT, runId) → Notification ke Finance + email template
[T-10] AgentRun SUCCEEDED, steps lengkap, token tercatat
```

## 5. Multi-Tenant & Keamanan

- `companyId` selalu diambil dari konteks run (AgentJob), bukan dari input LLM.
- Guard RBAC menolak tool yang melewati batas role; tool tRPC existing tetap butuh sesi
  user — untuk agent dipakai **service token** terpisah (bukan akun user) dengan scope
  terbatas (hanya tools terdaftar).
- Prompt injection: tool output ditandai (role=function), panjang konteks dibatasi,
  instruksi sistem tidak menyebutkan cara melewati guard.
- Secret: API keys di `.env` / Vercel env; jangan pernah di log.

## 6. Deployment (Free-Tier First)

| Bagian                 | Target                                    | Catatan                                                                      |
| ---------------------- | ----------------------------------------- | ---------------------------------------------------------------------------- |
| Web + tRPC             | Vercel (Hobby)                            | route worker serverless; timeouts dijaga < 60s (jika run panjang → chunking) |
| DB + storage + pg_cron | Supabase Free                             | 500 MB DB; index pgvector                                                    |
| Email                  | Resend Free (3000/bln)                    | sudah di stack                                                               |
| Worker                 | Serverless function + queue DB            | tidak perlu service terpisah di MVP                                          |
| Observability          | DB-native; (opsional) Langfuse Cloud free | export trace                                                                 |

### Konkurensi

- Advisory lock per `companyId` → satu run per perusahaan pada satu waktu.
- Global parallelism dibatasi (mis. 3) lewat `SELECT ... FOR UPDATE SKIP LOCKED` pada
  `AgentJob` — cukup untuk MVP, mencegah thundering herd cron.

## 7. Keputusan Arsitektur (ADR)

| ADR     | Keputusan                                                                                                  | Alasan                                                                                                                                |
| ------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| ADR-001 | **Tidak memakai framework agent eksternal** (LangChain dkk). Engine ditulis sendiri (~300-500 baris inti). | Kontrol penuh atas guardrails & audit; dependency minimal; biaya onboarding rendah; jika butuh, interface tetap kompatibel (adapter). |
| ADR-002 | **Queue berbasis DB**, bukan Redis/Kafka.                                                                  | Gratis, tanpa infra tambahan; throughput MVP rendah; mudah transisi nanti.                                                            |
| ADR-003 | **Perhitungan finansial deterministik di kode.**                                                           | Menghilangkan risiko hallucination pada uang.                                                                                         |
| ADR-004 | **Provider model lewat env** (`MODEL_PROVIDER`, `MODEL_FAST/DEEP`).                                        | Gratis tier sekarang (Gemini), upgrade ke berbayar (OpenAI/Anthropic) tanpa rewrite.                                                  |
| ADR-005 | **Mode default `PROPOSE` untuk semua mutasi; `AUTO` hanya non-finansial.**                                 | Kepercayaan pengguna & keamanan pada tahap awal.                                                                                      |
| ADR-006 | **Cron via pg_cron Supabase** (+ heartbeat Vercel Cron opsional).                                          | Gratis, fleksibel; Vercel Hobby terbatas frekuensi cron.                                                                              |

## 8. Struktur Folder Target

```
packages/agents/
├── src/
│   ├── engine/            # loop, intent router, step runner
│   ├── tools/             # definisi tool + adapter tRPC
│   ├── guards/            # policy pipeline (rbac, budget, state, idempotency)
│   ├── providers/         # ModelProvider: gemini | groq | ollama
│   ├── jobs/              # AgentJob consumer, advisory lock, retry
│   └── types.ts           # skema bersama (zod)
apps/web/app/(dashboard)/agents/
├── page.tsx               # ringkasan: aktivitas terbaru, status agent
├── queue/page.tsx         # approval queue
├── activity/page.tsx      # activity log
└── chat/page.tsx          # copilot chat
apps/web/lib/trpc/routers/agents.ts   # tRPC: config, queue, activity, chat
```
