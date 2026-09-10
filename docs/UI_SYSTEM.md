# UI_SYSTEM — TalentFlow (hasil audit komponen aktual)

**Status:** VERIFIED-BY-CODE · di-update 2026-09-10 pasca modernisasi "Clean & Dense"
**Acuan arah:** `docs/DESIGN_DIRECTION_UI.md` (disetujui user 2026-09-10)

## 1. Token tema (satu-satunya sumber warna permukaan/teks)

Didefinisikan di `apps/web/app/globals.css` sebagai CSS channel-variables;
dipetakan di `apps/web/tailwind.config.ts`. **Aturan: komponen tidak boleh
memakai warna `slate-*` langsung untuk permukaan/teks — pakai token.**

| Token                   | Light                  | Dark                    | Pakai untuk                               |
| ----------------------- | ---------------------- | ----------------------- | ----------------------------------------- |
| `bg-bg`                 | slate-50               | slate-950               | body, halaman                             |
| `bg-surface`            | white                  | slate-900               | kartu, topbar, dialog, popover            |
| `bg-surface-2`          | slate-100              | slate-800               | well, header kolom, hover row, chip badge |
| `border-border`         | slate-200              | slate-700               | garis tepi, divider (juga DEFAULT border) |
| `text-text-hi`          | slate-900              | slate-100               | judul, angka, body utama                  |
| `text-text-mid`         | slate-600              | slate-400               | label, sekunder                           |
| `text-text-lo`          | slate-400              | slate-500               | meta, timestamp, placeholder              |
| `bg-soft` / `text-link` | indigo-50 / indigo-600 | indigo-950 / indigo-400 | chip aksen, link                          |

Aksen status (emerald/amber/red/blue/violet) tetap warna palette literal
tetapi **selama format `bg-<color>-500/10` + `text-<color>-600`** agar
berfungsi dua tema. Sidebar memang hard-dark `#0b1220` di kedua tema
(keputusan desain, bukan kelalaian).

## 2. Mekanisme dark mode

- Kelas `.dark` dipasang **server-side** di `<html>` dari cookie `tf_theme`
  (`app/layout.tsx`) → tanpa flash.
- Toggle: `components/theme-toggle.tsx` (ikon Sun/Moon, aria-label, persist
  cookie 1 tahun).
- `color-scheme` diset per tema → scrollbar & form control native ikut.

## 3. Tipografi & angka

- Font tunggal: Inter (variable `--font-sans`).
- Heading halaman: `text-xl font-semibold tracking-tight` (BUKAN bold 2xl).
- Angka statistik: `text-[30px] font-semibold tabular-nums`; hero dashboard `text-4xl`.
- Label tabel kecil: `text-[11px] uppercase tracking-wide` untuk header kolom.

## 4. Inventory komponen (`packages/ui` = sumber kebenaran; dipakai via `@repo/ui/<nama>`)

| Komponen         | Kontrak                                                      | Catatan                                                                                                            |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `page-header`    | title, description?, action?                                 | heading semibold calm                                                                                              |
| `stat-card`      | label, value, hint?, color?                                  | value 30px semibold tabular                                                                                        |
| `status-badge`   | status (enum string)                                         | **dot + label pill** — dot per grup (hijau=selesai aktif, biru=menengah, amber=pending, merah=rusak, abuan=netral) |
| `empty-state`    | title, description?                                          | icon dalam ring, surface-2                                                                                         |
| `auth-shell`     | children                                                     | halaman login/register (panel branding)                                                                            |
| `confirm-dialog` | open, title, description?, destructive?, pending?, onConfirm | Radix Dialog: focus-trap, Escape, scroll-lock                                                                      |
| `status-select`  | value, onChange, options[], ariaLabel                        | Radix Select: popup ikut tema                                                                                      |
| `section-card`   | title, hint?, restricted?, children                          | form section; badge "Owner/Admin only"                                                                             |

**Komponen app-specific (tetap di `apps/web/components`):** `app-shell`
(navigasi), `notification-center` (polling tRPC), `toast` (provider state),
`theme-toggle`, `charts` (Recharts wrappers — butuh deps web).

## 5. Data viz

`components/charts.tsx`: `MonthlySpendChart` (stacked bar paid/outstanding),
`InvoiceAgingChart` (donut lifecycle). Palet mid-tone aman dua tema; tooltip
berborder token; `role="img"` + aria-label. Dipakai di `/dashboard/reports`
saja saat ini; pola siap dipakai screen lain.

## 6. State UI (standar yang harus dipertahankan screen baru)

loading: skeleton `animate-pulse` / `isLoading` state · empty: `EmptyState` ·
error: `app/error.tsx` global + inline per-mutasi via `toast` · 404:
`app/not-found.tsx` · feedback mutasi: toast (BUKAN `alert()` — nol pemakaian
`alert` di app) · konfirmasi destruktif: `ConfirmDialog`.

## 7. Status screen (adopted / pending / exception — Ch.40B rule 4)

| Screen                                                                               | Status                                                                                                                           |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| /login, /register                                                                    | **adopted** (pilot)                                                                                                              |
| /dashboard (overview)                                                                | **adopted** (pilot)                                                                                                              |
| /dashboard/freelancers + /new                                                        | **adopted** (pilot)                                                                                                              |
| /dashboard/reports                                                                   | **adopted** (chart + token)                                                                                                      |
| projects, contracts, timesheets, invoices, payments, compliance, settings, agents/\* | **pending** — sudah ikut token sweep (aman dua tema) tapi belum lewat gerbang visual 20B; akan diadopsi per screen saat disentuh |
| app/page.tsx (landing marketing)                                                     | **exception** — di luar sistem token by design (halaman publik), alasan: prioritas rendah, tidak dipakai user harian             |

## 8. Konsistensi & gerbang

- Gate 20B visual (rule 25): screenshot `docs/ui-audit/<name>/{mobile-375,desktop-1280}.png`
  light + dark via `node scripts/shot-auth.mjs` (auth + tema).
- Rule praktis: komponen baru wajib masuk `packages/ui` bila dipakai >1 screen;
  screen baru tidak boleh memperkenalkan warna literal selain token + aksen
  status format alpha.
