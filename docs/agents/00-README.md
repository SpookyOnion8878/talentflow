# Blueprint AI Agents for Business Operations — TalentFlow

Dokumen ini adalah **blueprint lengkap** untuk membangun lapisan AI Agents di atas platform
TalentFlow (freelancer & contractor management), berdasarkan ide awal "AI agents for
business operations".

## Keputusan Inti

| Keputusan                | Isi                                                                                                                                                                                                                                            |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pilihan proyek**       | Gabungan **Opsi A (AI Ops Copilot)** + **Opsi D (Orchestrator Engine)**. Opsi B (Billing Agent) dan C (Compliance Agent) menjadi **modul di dalamnya**, bukan proyek terpisah. Opsi E (AI Workforce Platform) adalah destinasi jangka panjang. |
| **Prinsip pengembangan** | Gratis-first: 100% tooling gratis untuk uji coba; desain arsitektur memungkinkan upgrade ke versi berbayar **tanpa rewrite**.                                                                                                                  |
| **Lokasi implementasi**  | Aplikasi di `apps/web` (modul `/agents`), engine di `packages/agents`, data di `packages/db` (Prisma).                                                                                                                                         |
| **Keuntungan kunci**     | Reuse total yang sudah ada: tRPC, Prisma, RBAC, `AuditLog`, `Notification`, Resend email, Supabase.                                                                                                                                            |

## Kenapa Gabungan A + D (Rekap)

1. **D adalah fondasi.** Engine (orchestration, tool registry, guardrails, observability,
   approval queue) dibangun sekali, dipakai semua agent. Agent berikutnya cukup daftarkan
   konfigurasi, bukan write ulang logika.
2. **A adalah validasi.** Data & workflow nyata TalentFlow (timesheet → invoice → payment,
   compliance expiry, budget) menjadi test bed untuk membuktikan engine bekerja di dunia
   nyata, bukan "platform abstrak".
3. **E adalah tujuan.** Setelah engine (D) terbukti dan copilot (A) menambah nilai, engine
   tersebut bisa di-productize jadi platform AI Agent umum untuk segmen baru (SMB akuntan,
   konsultan, e-commerce).

## Daftar Dokumen

| File                                       | Isi                                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| [`01-prd.md`](01-prd.md)                   | Product Requirements Document: masalah, scope MVP, non-goals, FR/NFR, KPI, acceptance criteria |
| [`02-arsitektur.md`](02-arsitektur.md)     | Arsitektur sistem: komponen, alur eksekusi, deployment, ADR (keputusan arsitektur)             |
| [`03-erd.md`](03-erd.md)                   | ERD lanjutan: tabel `AgentRun`, `AgentAction`, `AgentConfig` + relasi ke skema existing        |
| [`04-stack-gratis.md`](04-stack-gratis.md) | Stack 100% gratis untuk uji coba + jalur upgrade berbayar tanpa rewrite                        |
| [`05-roadmap.md`](05-roadmap.md)           | Roadmap 12 minggu: milestone, deliverable, exit criteria, risiko                               |

## Prinsip Pendirian (konvensi)

1. **LLM tidak pernah menghitung.** Perhitungan numerik (jam x rate, total, pajak)
   dilakukan kode deterministik; LLM hanya memutuskan & menyusun.
2. **Tindakan finansial = `propose` dulu.** Auto mode hanya untuk aksi non-financial
   level-rendah (email pengingat, update status monitoring).
3. **Semuanya masuk `AuditLog`.** Setiap aksi agent tercatat sebagai `actorType: AGENT`
   beserta `runId`.
4. **Tenant isolation wajib.** Setiap kueri tool mengemban `companyId` dari konteks run.
5. **Idempotensi.** Setiap aksi membaca & menulis pakai kunci unik; agent retry tidak
   pernah menggandakan invoice/payment.

## Cara Memakai Dokumentasi Ini

1. Baca `04-stack-gratis.md` untuk memahami landasan biaya.
2. Baca `02-arsitektur.md` untuk memahami komponen.
3. Baca `03-erd.md` sebelum menyentuh `packages/db/prisma/schema.prisma`.
4. Implementasi ikuti `05-roadmap.md` milestone demi milestone.

---

_Status: Implemented — engine, agents, RAG (pgvector), hardening, UI, dan cron telah berjalan di repo. Lihat `README.md` root untuk setup lokal._

> **Prasyarat runtime:** PostgreSQL harus dengan ekstensi **pgvector** (mis. image `pgvector/pgvector:pg16`) agar tabel `agent_embeddings` dapat dibuat. Untuk demo end-to-end: `pnpm --filter @repo/agents smoke`.
