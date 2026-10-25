# INDOSARI Akuntansi 2026 — Web App

Web app multi-cabang + multi-user untuk akuntansi INDOSARI. 9 modul lengkap dengan parser Accurate (paste dari laporan PDF/preview Accurate langsung).

## Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript 5
- **Database**: Prisma 6 (SQLite untuk dev, PostgreSQL untuk production)
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

# 3. Setup database (SQLite, no setup needed)
bun run db:push

# 4. Seed data awal (3 user + 2 cabang + settings + master data dari HTML akuntansi)
bun run db:seed

# 5. Run dev server (auto-start oleh sistem, atau manual)
bun run dev
```

Buka `http://localhost:3000`, login `admin1/admin123`.

---

## Deploy ke Vercel (Production)

### Step 1: Setup Database PostgreSQL

Pilih salah satu (semua free tier):

**Opsi A: Vercel Postgres** (paling mudah, integrasi native)
1. Buka https://vercel.com/dashboard → New Project → pilih repo ini
2. Klik "Storage" tab → "Create Database" → "Postgres" (free, 256 MB)
3. Vercel otomatis set env vars: `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, dll.
4. Gunakan `POSTGRES_PRISMA_URL` sebagai `DATABASE_URL` di Vercel env vars

**Opsi B: Neon Postgres** (recommended untuk Next.js, serverless-friendly)
1. Daftar di https://neon.tech (free 0.5 GB)
2. Create new project → copy connection string
3. Set di Vercel env vars: `DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`
   - Penting: pastikan `?sslmode=require` ada di akhir

**Opsi C: Supabase** (alternatif, free 500 MB)
1. Daftar di https://supabase.com
2. Create new project → Settings → Database → Connection string (URI)
3. Set di Vercel env vars

### Step 2: Set Environment Variables di Vercel

Buka Vercel Project → Settings → Environment Variables, tambah:

| Key | Value | Environment |
|---|---|---|
| `DATABASE_URL` | `postgresql://...?sslmode=require` (dari Neon/Vercel Postgres) | Production + Preview |
| `NEXTAUTH_SECRET` | Random 32-byte base64 string (generate via `openssl rand -base64 32` atau https://generate-secret.vercel.app) | Production + Preview |
| `NEXTAUTH_URL` | `https://nama-project.vercel.app` (URL final Vercel setelah pertama deploy) | Production |

### Step 3: Push ke GitHub

```bash
# Inisialisasi git (kalau belum)
git init
git add .
git commit -m "Initial commit — INDOSARI Akuntansi web app"

# Buat repo baru di GitHub, lalu push
git remote add origin https://github.com/USERNAME/indosari-akuntansi.git
git branch -M main
git push -u origin main
```

### Step 4: Import ke Vercel

1. Buka https://vercel.com/new
2. Import repository GitHub Anda
3. Framework Preset: **Next.js** (auto-detected)
4. Build & Output Settings:
   - Install Command: `bun install` (atau `npm install` bila tidak pakai bun)
   - Build Command: `bun run vercel-build` (sudah otomatis dari `vercel.json`)
5. Klik **Deploy** — tunggu 2-3 menit untuk build pertama

Build process:
1. `bun install` → trigger `postinstall: prisma generate` (generate client dgn schema postgres dari `prisma/schema.postgres.prisma` via flag `--schema` di `vercel-build`)
2. `vercel-build` script: `prisma generate --schema=prisma/schema.postgres.prisma && next build`
3. Deployed!

### Step 5: First-time Database Setup

Setelah deploy pertama sukses, setup database production. Pilih salah satu:

**Opsi 1: Lewat Vercel CLI** (recommended)
```bash
# Install Vercel CLI (one-time)
npm i -g vercel

# Pull env vars dari Vercel ke local .env
vercel env pull .env.production.local

# Run db push ke production (membuat semua tabel)
bun run db:push-prod

# Seed data awal (3 user + 2 cabang + settings)
bun run db:seed-prod
```

**Opsi 2: Lewat Vercel Dashboard console**
1. Buka Vercel Project → Storage → pilih database → "Query Console"
2. Copy SQL dari `prisma/migrations/init.sql` (atau export dari local SQLite via `prisma migrate diff`)
3. Jalankan manual

Setelah seeding, login dengan `admin1/admin123` di URL production Anda.

### Step 6: Update NEXTAUTH_URL

Setelah URL production diketahui (cth: `https://indosari-akuntansi.vercel.app`), update env var:
- Vercel Project → Settings → Environment Variables → `NEXTAUTH_URL` → set value ke URL production Anda.

---

## Postgres Schema Note

Project ini mempunyai 2 file schema Prisma:

- `prisma/schema.prisma` — SQLite (untuk local dev, file `db/custom.db`)
- `prisma/schema.postgres.prisma` — PostgreSQL (untuk Vercel/production)

Keduanya identik kecuali `provider` field. Build Vercel otomatis pakai versi postgres via flag `--schema` di `vercel-build` script.

Local dev tetap pakai SQLite — tidak perlu install PostgreSQL lokal.

---

## Project Structure

```
.
├── prisma/
│   ├── schema.prisma              # SQLite (dev)
│   ├── schema.postgres.prisma     # PostgreSQL (Vercel)
│   └── migrations/                # (opsional, bila pakai prisma migrate)
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
│   │       └── placeholder-view.tsx       # (tidak dipakai lagi, semua modul sudah aktif)
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
│   ├── seed-prod.ts              # Production seed (Postgres)
│   ├── extract_master_for_seed.py # Extract master data dari HTML akuntansi
│   └── data/                     # Akuntansi master export + screenshots
├── public/
├── .env.example                  # Template env var (committed)
├── .env                          # Local env (NOT committed)
├── .gitignore
├── vercel.json                   # Vercel build config
├── package.json
└── README.md
```

---

## Common Issues

### Login gagal di production (401 Unauthorized)

Penyebab: `NEXTAUTH_SECRET` belum di-set di Vercel env vars, atau JWT tidak ter-decrypt.

Fix:
1. Vercel Project → Settings → Environment Variables
2. Tambah `NEXTAUTH_SECRET` (random 32-byte base64, generate via `openssl rand -base64 32`)
3. Redeploy (Vercel Dashboard → Deployments → Redeploy)

### Database connection error di Vercel logs

Penyebab: `DATABASE_URL` salah format atau SSL tidak diaktifkan.

Fix untuk Neon:
- Pastikan URL diakhiri `?sslmode=require`
- Cek di Neon dashboard → connection string sudah benar

Fix untuk Vercel Postgres:
- Gunakan `POSTGRES_PRISMA_URL` (bukan `POSTGRES_URL` — Prisma butuh format khusus)

### Prisma client error "Unknown provider"

Penyebab: client di-generate dgn schema salah (sqlite padahal database postgres).

Fix:
- Pastikan `vercel-build` script berjalan: `prisma generate --schema=prisma/schema.postgres.prisma && next build`
- Cek log Vercel saat build, harus ada "Generated Prisma Client" di step build

### Build fail di Vercel: "cannot find @prisma/client"

Penyebab: postinstall tidak menjalankan `prisma generate`.

Fix:
- Pastikan `package.json` punya `"postinstall": "prisma generate"`
- Vercel auto-runs postinstall after `bun install`

---

## Development Notes

- Dev server: `bun run dev` (auto-start oleh sistem di port 3000)
- Database local: file `db/custom.db` (auto-created saat `bun run db:push`)
- Lint: `bun run lint` (ESLint + Next.js rules)
- Reset database local: `rm db/custom.db && bun run db:push && bun run db:seed`

---

## License

Private — INDOSARI internal use.
