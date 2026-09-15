# 🧺 LAUNDRY.DASH — Aplikasi Laundry

Sistem manajemen pesanan laundry: input pesanan, tarif otomatis per layanan,
alur status (Antri → Diproses → Selesai → Diambil), dan notifikasi WhatsApp.

**Stack:** Next.js 16 (App Router + React Compiler) · React 19 · Tailwind CSS v4 · TypeScript strict.

## Database? Tidak perlu — di Netlify data disimpan di Netlify Blobs

Aplikasi ini **tidak memerlukan database eksternal**. Lapisan penyimpanan
(`src/lib/store.ts`) otomatis memilih driver:

| Lingkungan | Penyimpanan | Persisten? |
| --- | --- | --- |
| Deploy di Netlify (production/preview) | [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/) — storage bawaan Netlify, gratis, tanpa setup | ✅ Ya, lintas deploy |
| `npm run dev` di laptop | In-memory | ❌ Tidak (hilang saat restart) |
| `netlify dev` di laptop | Netlify Blobs (disimulasikan di `.netlify/blobs`) | ✅ Ya secara lokal |

> Kenapa tidak SQLite file di repo? Filesystem fungsi serverless Netlify
> read-only/ephemeral — file DB tidak bisa ditulis dan hilang antar invocation.
> Karena itu dipakai Blobs (atau ganti ke database managed bila butuh relasional).

## Menjalankan lokal

```bash
npm install
npm run dev        # http://localhost:3000 — langsung jalan, tanpa env apa pun
```

## Deploy ke Netlify

1. Push repo ini ke GitHub, lalu **Import project** di Netlify — runtime Next.js
   terdeteksi otomatis (`netlify.toml` sudah disiapkan, termasuk
   `@netlify/plugin-nextjs`).
2. Selesai. Tidak ada variabel environment yang wajib.
3. Data pertama kali tersimpan otomatis di Netlify Blobs (store `laundry-orders`).

**Opsional — kunci API tulis (POST/PATCH/DELETE):** tambahkan env `ADMIN_KEY`
di Netlify. UI akan meminta *access key* saat menyimpan/mengubah/menghapus data
(disimpan di localStorage browser). GET tetap publik. Ini penghalang sederhana,
bukan sistem autentikasi penuh — untuk multi-user sungguhan, pakai Netlify
Identity atau auth provider.

**Opsional — pindah ke database relasional:** bila data laundry bertambah
besar (paket, detail transaksi, user, laporan), ganti `src/lib/store.ts` ke
Prisma + **Netlify Database / Prisma Postgres** (keduanya tersedia sebagai
fitur/ekstensi bawaan Netlify) — API route tidak perlu berubah karena semua
akses data sudah melalui satu modul store.

## Struktur

```
src/
  app/
    page.tsx              # dashboard (client component, bertipe)
    layout.tsx            # metadata global
    api/
      orders/route.ts     # GET POST PATCH DELETE — validasi di server
      storage/route.ts    # info driver penyimpanan utk badge UI
  lib/
    catalog.ts            # layanan, tarif/kg, status & transisi, tipe Order
    validation.ts         # validasi input + normalisasi nomor WA + hitung total
    store.ts              # Netlify Blobs ↔ fallback in-memory
prisma → (dihapus)        # riwayat lama memakai MySQL/Prisma ada di git history
```

## Aturan bisnis

- `totalPrice` **selalu dihitung server** (`berat × tarif/kg`), nilai kiriman
  klien diabaikan.
- Berat 0,1–100 kg; nama maks 80 karakter; nomor WA dinormalisasi ke
  `62xxxx` (hanya digit) atau ditolak.
- Status hanya menerima salah satu dari: `Antri, Diproses, Selesai, Diambil`.
- Uang disimpan sebagai **rupiah integer** (bukan float) untuk hindari
  galat pembulatan.

## Skrip

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Produksi build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Pemeriksaan tipe TypeScript |
