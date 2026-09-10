# DESIGN_DIRECTION UI — Modernisasi "Clean & Dense" (Pilot Slice)

**Status:** DRAF — menunggu approval sebelum coding · **Tanggal:** 2026-09-10
**Acuan:** SPS v1.1 Ch.40B (strangler per screen, gates hanya untuk yang disentuh, bukti visual rule 25)

---

## 0. Keputusan yang sudah dikunci (wawancara 2026-09-10)

| Aspek                          | Keputusan                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------- |
| Arah visual                    | **Clean & dense** — gaya Linear/Vercel: netral, ring halus, tipografi tegas, tanpa hiasan |
| Scope pilot                    | **Dashboard + Freelancers (list & form) + Login**                                         |
| Dark mode                      | **Ya, ikut pilot** — dieksekusi lewat semantic tokens (bukan `dark:` per-class)           |
| Elemen fungsional              | **Gabung A+B+C**: primitif headless (dropdown/modal a11y) + sectioning form + chart       |
| Ditolak (alasan tetap berlaku) | shadcn full-swap, glassmorphism, framer-motion, redesign landing marketing                |

## 1. Masalah yang ingin diselesaikan

UI sekarang sudah konsisten tapi "template-generic": border di semua permukaan (noise), tipografi tanpa hierarki numerik, badge blok warna ramai di tabel 30 status, form datar tanpa sectioning, nol visualisasi data, modal tanpa focus-trap. Modernisasi = memperbaiki **hierarki & ketenangan visual**, bukan mengganti selera.

## 2. Sistem token (inti dari paket ini)

### 2.1 Semantic CSS variables — di `apps/web/app/globals.css`

```
:root (light)              .dark
--bg        #f8fafc        --bg        #0b1220   /* slate-950-ish, bukan hitam pekat */
--surface   #ffffff        --surface   #151e2e
--surface-2 #f1f5f9        --surface-2 #1c2839   /* header tabel, well form */
--border    rgba(15,23,42;.08) --border rgba(255,255,255;.10)
--text-hi   #0f172a        --text-hi   #f1f5f9
--text-mid  #475569        --text-mid  #94a3b8
--text-lo   #94a3b8        --text-lo   #64748b
--accent    #4f46e5        --accent    #6366f1   /* primary tetap indigo, disesuaikan kontrasnya */
--ring      rgba(15,23,42;.05) --ring rgba(255,255,255;.10)
```

**Kenapa variables, bukan `dark:` per-class:** komponen menulis `bg-surface text-text-mid` dst — satu sumber kebenaran, dark mode gratis di semua screen (termasuk yang TIDAK disentuh pilot). Ini prasyarat agar item "dark mode menyeluruh" tidak jadi 5.000 suntingan manual. Konsekuensi: `sidebar` saat ini hard-dark — dipertahankan hard-dark di kedua tema (daerah netral).

### 2.2 Tailwind mapping — `apps/web/tailwind.config.ts`

`colors: { bg, surface, surface2, border, "text-hi", "text-mid", "text-lo", accent: {...primary scale} }`, `boxShadow.card` dihaluskan (ring via variable, bukan border class), font scale:

- Angka hero: `text-3xl font-semibold tracking-tight` (sekarang 28px biasa)
- Judul halaman: `text-xl font-semibold` (turun dari bold 2xl — clean&dense=lebih tenang, bukan lebih teriak)
- Label tabel: `text-[11px] uppercase tracking-wide text-text-lo` (gaya Linear)

### 2.3 Mekanisme dark

- `<html class="">` di set dari cookie `tf_theme` (server-readable, tanpa flash). Toggle di header app-shell (ikon sun/moon, `aria-label`, keyboard-accessible via Radix-free button sederhana).
- `color-scheme` di set per tema → scrollbar & input native ikut.

## 3. Perubahan per komponen (`@repo/ui` — hasil Phase 3)

| Komponen               | Sebelum              | Sesudah                                                                                                                       |
| ---------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `stat-card.tsx`        | border + shadow-card | `bg-surface ring-1 ring-border rounded-xl`; value `text-3xl tracking-tight`; label `text-[13px] text-text-mid`                |
| `status-badge.tsx`     | blok pastel penuh    | **dot 6px berwarna + label `text-text-mid`** di `bg-surface-2` pill; warna dot per grup status (hijau/amber/merah/biru/abuan) |
| `page-header.tsx`      | h2 bold              | `text-xl font-semibold tracking-tight` + description `text-sm text-text-mid`                                                  |
| `empty-state.tsx`      | border-dashed        | surface-2 halus, ikon di dalam ring                                                                                           |
| `table` (dipakai list) | border-b slate-200   | `ring` tipis antar baris, header `text-[11px] uppercase`, hover `bg-surface-2`                                                |
| `auth-shell.tsx`       | gradient kanan       | dipertahankan (branding publik), panel form di-token                                                                          |
| app-shell (web)        | hardcode slate       | sidebar tetap gelap; topbar → token; dropdown user → Radix Menu                                                               |

## 4. Elemen fungsional yang ikut (keputusan A+B+C)

### 4a. Primitif headless — deps baru: `@radix-ui/react-dialog` + `@radix-ui/react-popover` + `@radix-ui/react-select`

- **Modal** (konfirmasi delete freelancer, reject reason): ganti dari markup manual → Dialog Radix = focus-trap + Escape + aria (menutup gap a11y yang tercatat di audit).
- **Select filter** di tabel list: `<select>` native → Popover/Select Radix yang di-style token (keyboard + dark native-dropdown jelek).
- Dipakai di screen pilot; pola siap dipakai screen lain saat disentuh.

### 4b. Sectioning form — `freelancers/new/page.tsx` (340 LOC form datar)

- Grup jadi kartu section: **Identity / Contact & Location / Financial** (bagian financial diberi badge "restricted — Owner/Admin only", selaras aturan redaksi server).
- Field grid 2-kolom di ≥lg. Komponen `Field`, `SectionCard` baru di `@repo/ui`.

### 4c. Chart — deps: pasang ulang `recharts` (kini legitimate-used, ironi dari audit dicatat)

- **Hanya di halaman Reports** (bukan dashboard pilot, agar pilot tetap murni token): spend 6 bulan per currency (bar), invoice aging (stacked), utilization. Wrapper `ChartCard` di `@repo/ui` membaca warna dari CSS variables → chart ikut dark otomatis.
- Query tRPC yang ada dipakai apa adanya (tidak ada kontrak baru).

## 5. Screen pilot — definisi selesai

1. **`/login`** — tokenized, focus-visible ring konsisten.
2. **`/dashboard`** — hierarki baru: 1 hero card (Outstanding) + 3 stat sekunder, Budget Overview & activity dengan ring/token, dark toggle terlihat.
3. **`/dashboard/freelancers`** — tabel padat clean&dense, badge dot, filter select Radix, delete-dialog Radix.
4. **`/dashboard/freelancers/new`** — form sectioning.
5. **`/dashboard/reports`** — ChartCard (setelah 1–4 selesai; tetap dalam paket).

**Di luar pilot (tidak disentuh, akan ikut terlihat lebih baik karena token):** projects, contracts, timesheets, invoices, compliance, agents screens. Screen legacy = exception tercatat, bukan kegagalan (Ch.40B rule 4).

## 6. Konsekuensi & risiko

| Risiko                                                                                                  | Mitigasi                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Warna lama hardcode (slate-200, dsb.) masih di screen non-pilot → di dark mode bisa "putih menyilaukan" | Variabel fallback didefinisikan supaya screen lama tetap valid di dark (body bg gelap, teks gelap→terang lewat `body` token); screen lama yang belum di-sweep di-review per screen berikutnya. **Atau** toggle dark disembunyikan sampai sweep penuh — dikompromikan: pilot ON, karena semua area utama sudah bertoken. |
| Recharts vs CSS variables (library minta warna literal)                                                 | Resolve `getComputedStyle` sekali saat mount; tema-toggle = re-render. Divalidasi oleh screenshot.                                                                                                                                                                                                                      |
| Radix = +3 deps (~30KB)                                                                                 | Hanya primitif (tanpa styling bawaan); menghapus kode modal manual, netral-maintainable.                                                                                                                                                                                                                                |
| 3 layar berubah gaya sementara sisanya gaya lama                                                        | Konsistensi diukur terhadap screen adopted (rule 4); sisanya tercatat pending.                                                                                                                                                                                                                                          |

## 7. Urutan commit (masing-masing hijau sendiri)

1. `feat(theme)`: token variables + tailwind mapping + dark toggle + globals (semua layar ikut berubah halus)
2. `refactor(ui)`: stat-card, status-badge dot, page-header, empty-state, table styling
3. `feat(ui)`: Radix primitives (Dialog modal, Select filter) + pemakaian di freelancers list
4. `feat(ui)`: form sectioning freelancers/new (Field/SectionCard di @repo/ui)
5. `feat(ui)`: dashboard hierarchy (hero + secondary)
6. `feat(charts)`: recharts + ChartCard + reports screens
7. `docs`: UI_SYSTEM.md aktual hasil implementasi + screenshot bukti (375/1280 × light/dark) di `docs/screenshots/`

Setiap commit: `check-types` + `test` + `build` hijau. Step 7 = gerbang visual evidence (rule 25) — tanpa screenshot = tidak boleh klaim PASS.

## 8. Estimasi

Steps 1–6: ~4–6 sesi kerja part-time (effort M–L total, didominasi sweep class). Step 7: S. Tidak ada perubahan kontrak tRPC/DB → 114 test existing harus tetap hijau tanpa modifikasi (kecuali snapshot gaya di test UI — saat ini tidak ada, jadi nol).

---

**Persetujuan yang dibutuhkan:** boleh eksekusi urutan 1–7 di atas apa ada bagian yang mau diubah/dicoret dulu?
