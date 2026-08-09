# PRD — AI Ops Agents (AI Billing, AI Compliance, Ops Copilot)

## 1. Ringkasan Eksekutif

TalentFlow saat ini adalah platform **record-keeping**: data tersimpan rapi (freelancer,
contract, timesheet, invoice, compliance) namun semua proses bergantung manusia.
Lapisan AI Agents menambahkan **execution & judgment layer**: sistem yang mengamati
peristiwa operasional, memutuskan tindakan, mengusulkan/menjalankannya, dan melaporkan
kejadian — dengan manusia tetap berada di atas siklus untuk semua hal finansial.

**Nilai yang dijanjikan:** invoice cycle time dari jam ke menit, 0 dokumentasi compliance
terlewat, dan manajer mendapatkan "asisten ops" yang menjawab pertanyaan bisnis dalam
hitungan detik.

## 2. Masalah yang Dipecahkan

| Masalah Saat Ini                                                             | Dampak                                  | Agent yang Menangani              |
| ---------------------------------------------------------------------------- | --------------------------------------- | --------------------------------- |
| Timesheet disetujui tapi invoice dibuat manual beberapa hari kemudian        | Arus kas lambat, DSO tinggi             | Billing Agent                     |
| Invoice tidak di-chase; pembayaran terlambat tanpa follow-up                 | Cashflow buruk, freelancer complaints   | Billing Agent                     |
| Dokumen compliance kedaluwarsa tanpa ada yang tahu                           | Risiko legal & di-block pihak ketiga    | Compliance Agent                  |
| Manajer harus membuka banyak halaman untuk tahu "berapa yang belum dibayar?" | Waktu terbuang, keputusan lambat        | Ops Copilot                       |
| Tidak ada jejak otomatis mengapa/mengapa tidak aksi admin dilakukan          | Audit tipis, tidak ada perbaikan proses | (semua — melalui run log & audit) |

## 3. Tujuan Tahap Ini (MVP)

Membangun engine + tiga modul pertama, siap demo dengan data riil:

1. **Billing Agent** — auto-generate invoice dari approved timesheets (mode `propose`),
   chase email bertingkat untuk invoice unpaid (mode `auto`), laporan DSO mingguan.
2. **Compliance Agent** — pantau expiry dokumen (30/7/0 hari), kirim pengingat (auto),
   blokir submit timesheet untuk freelancer dengan dokumen EXPIRED (auto, dengan audit).
3. **Ops Copilot** — chat dalam dashboard yang menjawab pertanyaan konteks perusahaan
   (RAG) dan menyarankan aksi (contoh: "Jadikan draft invoice ini?") lewat action proposal.
4. **Approval Queue + Activity Log** — UI tempat semua usulan agent (propose) disetujui/
   ditolak, dan riwayat semua run agent dicatat.

## 4. Pengguna & Peran

| Actor            | Peran                          | Kebutuhan utama                                                   |
| ---------------- | ------------------------------ | ----------------------------------------------------------------- |
| **Owner/Admin**  | Mengatur seluruh operasi       | Melihat ringkasan agent, mengubah mode auto/propose, budget token |
| **Finance**      | Memproses pembayaran & invoice | Approval queue untuk draft invoice agent; laporan DSO             |
| **Manager**      | Approve timesheet              | Diberi konteks oleh agent; menolak proposal dengan alasan         |
| **System/Agent** | Menjalankan pekerjaan otomatis | Akses ke tools melalui engine, tercatat di audit                  |

RBAC existing (`MemberRole`) dipakai: hanya `OWNER`/`ADMIN` yang dapat **mengubah
konfigurasi agent**; approval aksi finansial = `OWNER`/`ADMIN`/`FINANCE`; approval email
reminder = `OWNER`/`ADMIN`.

## 5. Functional Requirements (MVP)

| ID    | Modul          | Pemicu                                              | Tindakan Agen                                                                                                                   | Mode                                               | Tool yang dipakai                                                                 |
| ----- | -------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| FR-01 | Billing        | Event `timesheet.approved` (pemicu akhir siklus)    | Kumpulkan timesheet approved perusahaan dlm periode, hitung deterministik, buat draft invoice per freelancer                    | `propose`                                          | `getApprovedTimesheets`, `calcInvoice` (math deterministik), `createDraftInvoice` |
| FR-02 | Billing        | Cron harian + `invoice.status = SENT/VIEWED` unpaid | Kirim chase email bertingkat (7, 14, 30 hari overdue), daring template `invoice-reminder`                                       | `auto`                                             | `getUnpaidInvoices`, `sendEmail`, `updateStatus(REMINDED)`                        |
| FR-03 | Billing        | Cron mingguan                                       | Ringkasan DSO & aging invoice → berita ke Finance                                                                               | `auto`                                             | `getAgingReport`, `sendSummary`                                                   |
| FR-04 | Compliance     | Event `compliance.updated` + cron harian            | Scan expiry; kirim reminder 30/7/0 hari sebelum; tandai EXPIRED saat lewat; set freelancer SUSPENDED bila dokumen wajib expired | reminder: `auto`; status: `auto` (bukan finansial) | `getComplianceRecords`, `sendReminder`, `markExpired`                             |
| FR-05 | Compliance     | Event `compliance.upload`                           | Usulkan re-upload dokumen: draft email "dokumen X mendekati kedaluwarsa" hanya bila status `PROPOSE` di config                  | `propose` (opsional)                               | `draftEmail`                                                                      |
| FR-06 | Ops Copilot    | Chat user                                           | Pertanyaan konteks (rag): "berapa yang belum dibayar?", "siapa yang mendekati limit budget?"; jawab + tawarkan aksi konversi    | `propose` (semua saran aksi)                       | `embeddingSearch`, `contextFetch`, `summary`                                      |
| FR-07 | Approval Queue | Aksi `propose` muncul                               | Ketibakan aksi; user approve/reject + alasan                                                                                    | —                                                  | tRPC router baru `agents`                                                         |
| FR-08 | Activity Log   | Semua run                                           | Lihat semua run (status, step, token, error) per perusahaan                                                                     | —                                                  | query `AgentRun`                                                                  |
| FR-09 | Config UI      | Owner/Admin                                         | Enable/disable agent; set mode per agent (AUTO/PROPOSE); daftar tool override; monthly token budget                             | —                                                  | tRPC `agents.config`                                                              |
| FR-10 | Guard & Cap    | Setiap run                                          | Token budget perusahaan (cap mingguan/ bulanan), rate limit, timeout loop, RBAC tool                                            | engine core                                        | `policy engine`                                                                   |

## 6. Non-Goals (sengaja TIDAK dikerjakan di MVP)

- Membiarkan agen menandatangani kontrak, mengubah payment method, atau me-review
  timesheet (keputusan sangat kontekstual) — tetap manusia.
- Integrasi email eksternal (Gmail/Outlook) — hanya email internal melalui Resend.
- Multi-provider LLM + routing otomatis — cukup router manual via env (`04-stack`).
- Auto execute semua mode — seluruh aksi finansial selalu butuh persetujuan.
- Proses keputusan agen di luar jalur engine (plugin pilardesastar) — emergent ability
  di luar tool yang terdaftar.

## 7. Non-Functional Requirements

| NFR            | Requirement                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Keamanan       | Setiap tool call membawa `companyId` dari context; hanya `OWNER/ADMIN` boleh edit konfigurasi; tidak ada data dari company lain di context agent |
| Audit          | Setiap aksi agent → `AuditLog` dengan `actorType: AGENT` + `runId`; chat log di simpan                                                           |
| Idempotensi    | Eksekusi aksi key bersifat idempotent; retry tidak pernah membuat duplikat invoice/payment                                                       |
| Performa       | Latensi jawaban chat copilot < 10 detik; run agent < 60 detik per cycle                                                                          |
| Observability  | Semua run/aksi tercatat di DB; trace step di `AgentRun.steps`                                                                                    |
| Biaya          | Tetap dalam batas free tier (target `$0` di MVP); daily token cap per perusahaan                                                                 |
| Keandalan      | Worker retry dengan backoff; DLQ `FAILED` untuk inspeksi manusia                                                                                 |
| Upgradeability | Provider model bisa diganti melalui env tanpa perubahan kode bisnis                                                                              |

## 8. KPI & Target

| KPI                                          | Target MVP                              |
| -------------------------------------------- | --------------------------------------- |
| Invoice ter-generate tanpa intervensi manual | > 80%                                   |
| Approval rate proposal finansial             | > 70% (tanda konfidensi agen)           |
| Cycle invoice approve → terkirim             | < 5 menit                               |
| Override rate (reject + alasan belum bisa)   | < 10%                                   |
| Dokumen compliance kedaluwarsa mengejutkan   | 0 kejadian                              |
| Keberhasilan run agent                       | > 90%                                   |
| Biaya operasi agent                          | $0 (dalam free tier)                    |
| Total token / perusahaan / minggu            | < budget yang ditetapkan (default 100k) |

## 9. Acceptance Criteria untuk Exit MVP

1. Demo 1: Finance approves 1 batch timesheets, Billing Agent membuat draft invoice
   benar (angka cocok dgn kalkulasi manual) → Approve di queue → invoice terkirim.
2. Demo 2: Dokumen compliance disetel near-expiry → reminder terkirim 30/7/0 hari;
   saat EXPIRED → freelancer terblokir submit timesheet (ada di audit).
3. Demo 3: Chat "berapa invoice yang belum dibayar bulan ini?" menjawab benar + suggestion
   aksinya berupa proposal di queue.
4. Semua run dan aksi terlihat di Activity Log; setiap aksi punya jejak audit menuju run.
5. Total hard-cost menjalankan MVP = Rp0 (cuma token gratis).

## 10. Ketergantungan terhadap Produk Existing

- Router tRPC existing: `timesheet.list/approve`, `invoice.list/create/markAsPaid`,
  `compliance.*` — dipakai sebagai basis **tool definitions** (wrapped, bukan akses langsung).
- Package `packages/email` — template `invoice-reminder`, `compliance-warning`.
- `AuditLog` & `Notification` — semua event aksi.
- Primary database seeding company demo data (untuk eval & demo).

## 11. Pertanyaan Terbuka (untuk diselesaikan saat fase sosialisasi)

1. Template email chase: 3 tingkatan (7/14/30 hari) — konten mana yang baku vs LLM?
2. Batasan `setUpgrade` pada freelancer SUSPENDED karena compliance: otomatis, atau perlu
   approve karena berdampak operasional? (default MVP: auto, tanpa finansial)
3. Apakah Copilot Chat boleh menyarankan aksi yang ontuh `FINANCE` role (lihat & buat → via proposal) — ya, karena semua di approval queue.

## 12. Perubahan (Changelog)

- v1 (draft): dokumen awal dibuat.
