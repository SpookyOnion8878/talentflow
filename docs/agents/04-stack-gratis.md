# Stack Teknologi — 100% Gratis untuk Uji Coba, Upgrade Tanpa Rewrite

Prinsip: **trial berjalan $0 hard cost**; semua layanan punya free tier; desain dibuat
agar pindah ke berbayar cukup ganti env/plan — bukan menulis ulang kode.

## 1. Peta Stack

| Layer                        | Tool (uji coba, gratis)                                                                                              | Free Tier                                                 | Upgrade Berbayar (bila perlu)        | Kapan Upgrade                                                  |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| LLM (fast: classify/extract) | **Google Gemini 2.5 Flash** (AI Studio API key)                                                                      | Gratis, quota harian cukup untuk MVP (banyak RPM/DPD)     | Gemini paid / `gpt-4.1-mini`         | Melebihi quota harian atau butuh kecepatan konsisten           |
| LLM (deep: judgment)         | Gemini 2.5 Flash / Pro (sesuai kebutuhan) atau **Groq** (Llama 3.x, Qwen)                                            | Groq free tier: rate limit harian generous (free API key) | Anthropic Claude / GPT-4.1           | Tugas kompleks butuh kualitas maksimum → env `MODEL_DEEP` saja |
| LLM (lokal, dev)             | **Ollama** (Llama 3.1 8B / Qwen 2.5)                                                                                 | 100% gratis, tanpa limit (butuh RAM lokal)                | —                                    | Prototyping cepat & eval offline tanpa internet                |
| Embedding                    | **Gemini text-embedding-004** (free) atau **BGE via Ollama**                                                         | Free (Gemini) / lokal tanpa batas                         | OpenAI embeddings                    | Butuh dimensi & kualitas tertentu                              |
| Vector DB                    | **pgvector** di Supabase Postgres                                                                                    | Free (ikut 500MB DB)                                      | Supabase scale / Vector DB dedicated | Data > free tier                                               |
| Database + Auth + Storage    | **Supabase**                                                                                                         | Free: 500MB DB, 1GB storage, 2 project                    | Supabase Pro ($25/bulan)             | Mulai scale atau butuh lebih besar                             |
| Hosting (Web + API)          | **Vercel** (Hobby)                                                                                                   | Free; cron terbatas (gunakan pg_cron)                     | Vercel Pro ($20/bln)                 | Butuh cron fleksibel / preview lebih banyak                    |
| Cron scheduler               | **pg_cron** (Supabase)                                                                                               | Free                                                      | Supabase Pro / external scheduler    | Frekuensi < menit                                              |
| Email                        | **Resend**                                                                                                           | 3000 email/bulan                                          | $20/bln (50k)                        | Lebih dari quota (chase email ramai)                           |
| Observability                | **DB-native** (`AgentRun`/`AgentAction` + dashboard via tRPC query) + **Langfuse Cloud free tier** (opsional traces) | Langfuse free tier cukup untuk volume MVP                 | Langfuse paid                        | Butuh traces jangka panjang / tim                              |
| CI/CD                        | GitHub Actions                                                                                                       | Free public repo                                          | GitLab/Buildkite                     | Organisasi butuh self-hosted                                   |
| Eval                         | Custom scripts (vitest + golden dataset, diberikan di repo)                                                          | Free                                                      | Promptflow / a/b toolbar             | UI-ancyaan bagi eval                                           |

## 2. Strategi "Gratis Tapi Produksi-Siap"

### 2.1 Model provider = interface (ADR-004)

```
env:
  MODEL_PROVIDER=gemini        # gemini | groq | ollama | openai
  GEMINI_API_KEY=...
  MODEL_FAST=gemini-2.5-flash  # tugas ringan (classify, extract, summarize)
  MODEL_DEEP=gemini-2.5-pro    # judgment kompleks (opsional)
  EMBEDDING_PROVIDER=gemini
```

- `packages/agents/src/providers/` menyediakan implementasi; swap = ubah env.
- Upgrade ke OpenAI/Anthropic = tambah 1 provider file + env, **tanpa sentuh logic engine**.

### 2.2 Batasan & mitigasi di free tier

| Risiko free tier                | Mitigasi                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Gemini quota harian             | Mode local via Ollama untuk dev; caching respons (`AgentRun.steps` replay); kecilkan prompt (hanya konteks relevan, RAG filter metadata) |
| Resend 3000/bln                 | Agregat reminder (1 email berisi beberapa tagihan); batas chase per invoice; test pakai fitur staging/draft                              |
| Vercel serverless timeout (60s) | Worker-chunking: satu run per company ≤ 60 detik; job besar dipecah per freelancer batch                                                 |
| Supabase 500MB                  | Simpan `steps` json (bukan log verbose ke tabel lain); archive embedding lama                                                            |
| Cron Vercel Hobby               | Pilih pg_cron sebagai sumber utama                                                                                                       |

### 2.3 Batas biaya (operator muda)

- `AgentConfig.monthlyTokenBudget` default 100k token/company/bulan → alert admin di
  80% pemakaian.
- Estimasi biaya dihitung lokal (per run: tokepre-coated) & dimasukkan ke dashboard.

## 3. Perbandingan LLM untuk uji coba (indikatif 2026)

| Provider      | Model untuk MVP                       | Kelebihan Uji Coba                                                          | Upgrade berbayar bila         |
| ------------- | ------------------------------------- | --------------------------------------------------------------------------- | ----------------------------- |
| Google Gemini | 2.5 Flash (fast), 2.5 Pro (judgment)  | Free tier murah & murah; punya function calling yang stabil; embedding free | Konsisten SLA & quota besar   |
| Groq          | Llama 3.3 70B / Qwen3                 | Super cepat, free tier cukup, model open                                    | Open models jadi pilihan kuat |
| Ollama        | Llama 3.1/Qwen 2.5 (lokal)            | 100% gratis, ship-to-dev                                                    | untuk uji tanpa koneksi       |
| OpenAI        | gpt-4o family / embeddings (berbayar) | Belum free tier                                                             | — migrasi hanya env           |

_Catalan: angka quota free tier selalu berubah; verifikasi langsung di halaman provider
saat setup. Blueprint ini sengaja tidak mengunci satu vendor._

## 4. Langkah Upgrade ke Berbayar (ketika dibutuhkan, tanpa rewrite)

1. **Dahulu**: create new provider file → `gemini` → `openai`/`anthropic` (satu file, ikuti
   interface `ModelProvider`).
2. **Env**: ganti `MODEL_PROVIDER`, tambah API key; router tugas ringan/berat tetap sama.
3. **Verifikasi**: jalankan eval set (golden dataset) — lewat `packages/agents` test suite.
4. **Bila perlu**: naikkan `monthlyTokenBudget`; cek dashboard observability.
5. **Email/DB/cron**: upgrade tier di dashboard provider bila perlu (Supabase Pro, Resend
   lebih besar) — tidak ada perubahan konfigurasi aplikasi.

## 5. Checklist Instalasi Uji Coba (setup baru)

1. Buat project Supabase gratis, salin `DATABASE_URL` ke `.env`.
2. Generate kunci Gemini API gratis di AI Studio → `GEMINI_API_KEY`.
3. (Opsional) instal Ollama untuk dev lokal: `ollama pull llama3.1:8b`.
4. Jalankan `pnpm db:push; pnpm db:generate; pnpm db:seed`.
5. Jalankan smoke test tools (lihat `04` roadmap & eval pada file berikutnya).
6. Verifikasi di Activity Log: run + action berjalan, audit tercatat — tanpa uang keluar.
