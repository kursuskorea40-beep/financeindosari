# INDOSARI Akuntansi 2026 — Web App

Web app multi-cabang + multi-user untuk akuntansi INDOSARI. 9 modul lengkap dengan parser Accurate (paste dari laporan PDF/preview Accurate langsung).

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Database**: Prisma 6 (SQLite untuk dev, PostgreSQL via Supabase untuk production)
- **Hosting**: Netlify (free tier)
- **Auth**: NextAuth.js v4 (Credentials provider, JWT session)
- **UI**: Tailwind CSS 4 + shadcn/ui (New York)
- **State**: TanStack Query (server), React useState (client)
- **Password hash**: bcryptjs

## Modul (9 aktif penuh)

1. **Dashboard** — KPI cards + bar chart 12 bulan
2. **Laba Rugi** — Format Accurate Standar per bulan, editable, paste Accurate
3. **Penjualan** — Transaksi per bulan, NB/NT badge, paste Rincian Penjualan per Barang
4. **Pembelian** — Transaksi per bulan, Giro/Tempo/Lunas detection, paste Rincian Pembelian per Barang
5. **Persediaan** — Kartu stok per bulan, snapshot/mutasi format, paste Daftar Nilai Persediaan
6. **Piutang** — Saldo bulanan + faktur dgn jatuh tempo + umur dinamis, paste Daftar Piutang Usaha
7. **Hutang** — Mirror Piutang untuk supplier, paste Daftar Utang Usaha
8. **Neraca** — Format Accurate Standar per bulan, auto-cek "Seimbang", paste Neraca Standar
9. **Master Data** — CRUD barang/supplier/pelanggan + import JSON dari file HTML akuntansi

## Akun Demo

| Username | Password | Role | Cabang |
|---|---|---|---|
| admin1 | admin123 | ADMIN | Jakarta |
| finance1 | finance123 | FINANCE | Jakarta |
| gudang1 | gudang123 | GUDANG | Surabaya |

---

## Quick Start (Local Dev)

```bash
# 1. Install dependencies
bun install

# 2. Setup env (salin template)
cp .env.example .env

# 3. Setup database (SQLite, no setup needed — file: db/custom.db)
bun run db:push

# 4. Seed data awal (3 user + 2 cabang + settings + master data dari HTML akuntansi)
bun run db:seed

# 5. Run dev server
bun run dev
```

Buka `http://localhost:3000`, login `admin1/admin123`.

---

## Deploy ke Netlify + Supabase (Production)

### Step 1: Setup Supabase (Database PostgreSQL)

1. Buka https://supabase.com → daftar akun gratis (Google/GitHub)
2. Klik **New Project** → isi:
   - **Name**: `indosari-akuntansi`
   - **Database Password**: buat password kuat (CATAT — tidak bisa di-reset tanpa ini!)
   - **Region**: Singapore (paling dekat dari Indonesia)
   - **Plan**: Free
3. Tunggu 2 menit sampai project jadi
4. Buka project → klik tombol **"Connect"** di pojok kanan atas dashboard
5. Di modal popup, pilih tab **"ORMs"** → pilih **"Prisma"**
6. Supabase akan generate 2 connection string (copy keduanya):
   ```
   DATABASE_URL="postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
   DIRECT_URL="postgresql://postgres.[project-ref]:[PASSWORD]@aws-0-[region].pooler.supabase.com:5432/postgres"
   ```
7. Ganti `[PASSWORD]` di kedua URL dengan password database yang Anda buat di Step 2 di atas
8. Simpan kedua URL — ini jadi nilai `DATABASE_URL` dan `DIRECT_URL` di Netlify nanti

**Kenapa 2 URL?**
- `DATABASE_URL` (port 6543, transaction pooler, `?pgbouncer=true`) → untuk **runtime app** (query cepat, serverless-friendly)
- `DIRECT_URL` (port 5432, session pooler) → untuk **migrations / db push** (pgbouncer tidak support beberapa operasi)

**Catatan Supabase free:**
- 500 MB database (cukup untuk bertahun-tahun data INDOSARI)
- Project **paused otomatis setelah 1 minggu tidak ada aktivitas** — login ke dashboard Supabase untuk reactivate (gratis, 1 klik)
- 50k monthly active users (auth) — Anda pakai 3 user, jauh dari limit

### Step 2: Push Project ke GitHub

```bash
# Inisialisasi git
git init
git add .
git commit -m "Initial commit — INDOSARI Akuntansi web app (Netlify + Supabase)"

# Buat repo baru di GitHub (buka https://github.com/new), lalu push
git remote add origin https://github.com/USERNAME/indosari-akuntansi.git
git branch -M main
git push -u origin main
```

### Step 3: Import ke Netlify

1. Buka https://app.netlify.com/start → login (Google/GitHub)
2. Klik **Add new site** → **Import an existing project**
3. Pilih repo GitHub `indosari-akuntansi`
4. Build settings (auto-detected dari `netlify.toml`, jangan diubah):
   - Base directory: (kosong)
   - Build command: `bun run netlify-build`
   - Publish directory: `.next`
5. Klik **Deploy site** — tunggu 3-5 menit untuk build pertama
6. Setelah selesai, akan dapat URL sementara: `https://indosari-akuntansi-[hash].netlify.app`

### Step 4: Set Environment Variables di Netlify

1. Buka site Netlify Anda → **Site settings** → **Environment variables**
2. Tambah 4 variabel (klik **Add a variable** → **All environments** untuk masing-masing):

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true` | Dari Supabase Connect → Prisma (transaction pooler, port 6543) |
| `DIRECT_URL` | `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres` | Dari Supabase Connect → Prisma (session pooler, port 5432). Tanpa `?pgbouncer=true` |
| `NEXTAUTH_SECRET` | Random 32-byte base64 string | Generate via `openssl rand -base64 32` di terminal, atau https://generate-secret.vercel.app/32 |
| `NEXTAUTH_URL` | `https://indosari-akuntansi-[hash].netlify.app` | URL final Netlify Anda (ganti dgn domain asli) |

3. Setelah 4 variabel ter-set, **Trigger redeploy**: Site overview → Production: klik tombol ke-3 (deploy list) → **Trigger rebuild**

### Step 5: First-time Database Setup

Setelah redeploy sukses, setup database Supabase dengan tabel + seed data:

**Opsi A (recommended): Pakai Vercel CLI** — wait, kita pakai Netlify. Pakai Netlify CLI:

```bash
# Install Netlify CLI (one-time)
npm i -g netlify-cli

# Login (browser akan muncul)
netlify login

# Link ke site Anda
netlify link  # pilih dari list

# Pull env vars ke local .env.production.local
netlify env:export --file .env.production.local

# Run db:push-prod (membuat semua tabel di Supabase)
bun run db:push-prod

# Seed data awal (3 user + 2 cabang + 4 settings)
bun run db:seed-prod

# Hapus file env temporary (security)
rm .env.production.local
```

**Opsi B (manual via Supabase SQL Editor)**:
1. Buka Supabase Dashboard → SQL Editor (kiri)
2. Copy SQL hasil `prisma migrate diff` (jalankan lokal untuk generate):
   ```bash
   bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.postgres.prisma --script
   ```
3. Paste ke SQL Editor → Run
4. Untuk seed: jalankan scripts/seed-prod.ts locally dgn DATABASE_URL=Supabase URL

### Step 6: Update NEXTAUTH_URL

Setelah punya domain final (Netlify akan generate `*.netlify.app`), update:
- Netlify → Site settings → Environment variables → `NEXTAUTH_URL` → set ke URL final Anda
- (Optional) Pasang custom domain di Netlify → Site settings → Domain management → Add domain

---

## Local Dev vs Production Schema

Project ini mempunyai 2 file schema Prisma:

- `prisma/schema.prisma` — SQLite (untuk local dev, file `db/custom.db`)
- `prisma/schema.postgres.prisma` — PostgreSQL (untuk Netlify/production via Supabase)

Build Netlify otomatis pakai versi postgres via flag `--schema` di `netlify-build` script (lihat `package.json`).

Local dev tetap pakai SQLite — tidak perlu install PostgreSQL lokal. Kode aplikasi sama, cuma connection string yg beda.

---

## Project Structure

```
.
├── prisma/
│   ├── schema.prisma              # SQLite (dev)
│   ├── schema.postgres.prisma     # PostgreSQL (Netlify/Supabase)
│   └── migrations/                # (opsional)
├── src/
│   ├── app/
│   │   ├── api/                   # API routes (Next.js App Router)
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── cabang/route.ts
│   │   │   ├── dashboard/route.ts
│   │   │   ├── import-master/route.ts
│   │   │   ├── setting/route.ts
│   │   │   ├── master/{barang,supplier,pelanggan}/route.ts
│   │   │   ├── penjualan/{route.ts, paste/route.ts}
│   │   │   ├── pembelian/{route.ts, paste/route.ts}
│   │   │   ├── persediaan/{route.ts, paste/route.ts}
│   │   │   ├── piutang/route.ts        # saldo + faktur + paste
│   │   │   ├── hutang/route.ts        # mirror piutang
│   │   │   ├── laba-rugi/route.ts     # FR format + paste
│   │   │   └── neraca/route.ts        # mirror laba-rugi
│   │   ├── globals.css            # Tema maroon
│   │   ├── layout.tsx            # Wrap dgn Providers + Toaster
│   │   └── page.tsx              # Single-page app dgn view switching
│   ├── components/
│   │   ├── providers.tsx         # SessionProvider + QueryClientProvider
│   │   ├── ui/                   # shadcn/ui components
│   │   └── views/
│   │       ├── dashboard-view.tsx
│   │       ├── master-data-view.tsx
│   │       ├── transaction-view.tsx        # Generic untuk Penjualan + Pembelian
│   │       ├── persediaan-view.tsx
│   │       ├── piutang-hutang-view.tsx     # Generic untuk Piutang + Hutang
│   │       ├── fr-view.tsx                 # Generic untuk Laba Rugi + Neraca
│   │       └── placeholder-view.tsx       # (tidak dipakai lagi)
│   └── lib/
│       ├── accurate-parser.ts             # Parser Penjualan + Pembelian
│       ├── accurate-persediaan.ts          # Parser Persediaan
│       ├── accurate-piutang-hutang.ts      # Parser Piutang + Hutang
│       ├── accurate-fr.ts                  # Parser Laba Rugi + Neraca
│       ├── auth.ts                        # NextAuth config (Credentials + JWT)
│       ├── db.ts                          # Prisma client
│       └── utils.ts                       # shadcn helpers
├── scripts/
│   ├── seed.ts                   # Local seed (SQLite)
│   ├── seed-prod.ts              # Production seed (Supabase/Postgres)
│   ├── extract_master_for_seed.py # Extract master data dari HTML akuntansi
│   └── data/                     # Master export JSON + screenshots
├── public/
├── .env.example                  # Template env var (committed)
├── .env                          # Local env (NOT committed)
├── .gitignore
├── netlify.toml                  # Netlify build config
├── vercel.json                   # (legacy, untuk backward-compat bila pindah ke Vercel)
├── package.json
└── README.md
```

---

## Common Issues

### Login gagal di production (401 Unauthorized)

**Penyebab**: `NEXTAUTH_SECRET` belum di-set di Netlify env vars, atau value beda antara build dan runtime.

**Fix**:
1. Netlify → Site settings → Environment variables → tambah `NEXTAUTH_SECRET` (random 32-byte base64)
2. Trigger redeploy

### Database connection error: "connection refused" / "TLS error"

**Penyebab**: Connection string Supabase salah format, atau `?pgbouncer=true` kurang.

**Fix**:
- Pastikan URL format: `postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres?pgbouncer=true`
- Cek di Supabase Dashboard → Settings → Database → Connection string → pilih "Transaction" pooler (bukan "Session")

### Supabase project paused (akses tiba-tiba 500/error)

**Penyebab**: Supabase free auto-pause setelah 1 minggu tidak ada aktivitas database.

**Fix**:
1. Buka Supabase Dashboard → login
2. Pilih project Anda → klik **Restore project** (1 klik, gratis, ~30 detik)
3. Setelah restore, app langsung jalan lagi

**Tip**: Setup cron job gratis (Upstash QStash / cron-job.org) untuk hit endpoint `/api/dashboard` setiap 5 hari → project tidak pernah paused.

### Prisma client error "Unknown provider"

**Penyebab**: Client di-generate dgn schema salah.

**Fix**: Pastikan `netlify-build` script berjalan: `prisma generate --schema=prisma/schema.postgres.prisma && next build`. Lihat di Netlify deploy log, harus ada "Generated Prisma Client" di step build.

### Build fail: "Function timeout exceeded" (paste 800+ transaksi)

**Penyebab**: Netlify free function timeout = 10 detik. Bulk paste 868 transaksi loop-create bisa lebih dari 10s.

**Fix**: Sudah dioptimasi di kode — pakai `createMany` (batch insert). Bila masih timeout:
- Split paste jadi batch kecil (per grup produk)
- Atau upgrade Netlify Pro ($19/bln, timeout 26 detik)

---

## Development Notes

- Dev server: `bun run dev` (port 3000)
- Database local: file `db/custom.db` (auto-created saat `bun run db:push`)
- Lint: `bun run lint` (ESLint + Next.js rules)
- Reset database local: `rm db/custom.db && bun run db:push && bun run db:seed`

---

## License

Private — INDOSARI internal use.
