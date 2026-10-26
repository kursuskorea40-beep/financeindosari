// Seed for PRODUCTION (Vercel + PostgreSQL)
// Run after first deploy: bun run db:seed-prod
// (set DATABASE_URL env var to your Neon/Vercel Postgres connection string first)
//
// Differences vs seed.ts:
//   - Auto-generates NEXTAUTH_SECRET bila tidak di-set (langkah cepat bila lupa)
//   - Skip import master data (kosong di production, user import manual lewat UI)
//   - Same 3 users (admin1/finance1/gudang1) + 2 cabang (JKT/SBY) + settings default

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";

const db = new PrismaClient();

async function main() {
  console.log("=== Seeding INDOSARI Akuntansi Web App (PRODUCTION) ===\n");

  // 1. Cabang
  console.log("1. Seed cabang...");
  await db.cabang.upsert({
    where: { kode: "JKT" },
    update: { nama: "Jakarta Pusat", alamat: "Jl. Industri No. 1, Jakarta", telp: "(021) 1234567", isDefault: true },
    create: { kode: "JKT", nama: "Jakarta Pusat", alamat: "Jl. Industri No. 1, Jakarta", telp: "(021) 1234567", isDefault: true },
  });
  await db.cabang.upsert({
    where: { kode: "SBY" },
    update: { nama: "Surabaya", alamat: "Jl. Raya Darmo No. 1, Surabaya", telp: "(031) 7654321" },
    create: { kode: "SBY", nama: "Surabaya", alamat: "Jl. Raya Darmo No. 1, Surabaya", telp: "(031) 7654321" },
  });
  const jkt = await db.cabang.findUnique({ where: { kode: "JKT" } });
  const sby = await db.cabang.findUnique({ where: { kode: "SBY" } });
  if (!jkt || !sby) throw new Error("Cabang not created");
  console.log(`   ✓ Cabang: ${jkt.nama}, ${sby.nama}`);

  // 2. Users
  console.log("\n2. Seed users...");
  const users = [
    { username: "admin1", password: "admin123", name: "Administrator", role: "ADMIN", cabangId: jkt.id },
    { username: "finance1", password: "finance123", name: "Bagian Keuangan", role: "FINANCE", cabangId: jkt.id },
    { username: "gudang1", password: "gudang123", name: "Bagian Gudang", role: "GUDANG", cabangId: sby.id },
  ];
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    const existing = await db.user.findFirst({ where: { username: u.username } });
    if (existing) {
      await db.user.update({ where: { id: existing.id }, data: { passwordHash, name: u.name, role: u.role, cabangId: u.cabangId, isActive: true } });
      console.log(`   ✓ Updated: ${u.username} (${u.role})`);
    } else {
      await db.user.create({ data: { username: u.username, passwordHash, name: u.name, role: u.role, cabangId: u.cabangId, isActive: true } });
      console.log(`   ✓ Created: ${u.username} (${u.role})`);
    }
  }

  // 3. Settings
  console.log("\n3. Seed settings...");
  const settings = [
    { key: "companyName", value: "INDOSARI" },
    { key: "companyAddress", value: "Jl. Industri No. 1, Jakarta" },
    { key: "companyPhone", value: "(021) 1234567" },
    { key: "companyNPWP", value: "" },
  ];
  for (const s of settings) {
    await db.setting.upsert({ where: { key: s.key }, update: {}, create: s });
  }
  console.log(`   ✓ ${settings.length} settings seeded`);

  // 4. NEXTAUTH_SECRET hint (jangan set di sini, tapi info)
  if (!process.env.NEXTAUTH_SECRET) {
    const random = crypto.randomBytes(32).toString("base64");
    console.log("\n⚠ NEXTAUTH_SECRET belum di-set di environment!");
    console.log("  Set di Vercel: Settings → Environment Variables → add:");
    console.log(`  NEXTAUTH_SECRET = ${random}`);
    console.log("  (random 32-byte base64 string, jangan pakai contoh ini di production asli)\n");
  } else {
    console.log("\n✓ NEXTAUTH_SECRET terdeteksi di environment (length=" + process.env.NEXTAUTH_SECRET.length + ")");
  }

  console.log("\n=== Seeding complete ===\n");
  console.log("Login credentials:");
  console.log("  admin1   / admin123   (ADMIN, Cabang Jakarta)");
  console.log("  finance1 / finance123 (FINANCE, Cabang Jakarta)");
  console.log("  gudang1  / gudang123  (GUDANG, Cabang Surabaya)");
  console.log("\nNext steps:");
  console.log("  1. Login sebagai admin1 di aplikasi");
  console.log("  2. Master Data → Import dari File Akuntansi HTML → paste JSON");
  console.log("  3. Penjualan/Pembelian/Persediaan/Piutang/Hutang/Laba Rugi/Neraca → Paste dari Accurate");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
