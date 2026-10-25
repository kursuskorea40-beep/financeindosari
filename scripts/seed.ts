// Seed: 2 cabang, 3 user, identitas perusahaan, + import master data dari HTML akuntansi
// Run: bun run scripts/seed.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as fs from "fs";

const db = new PrismaClient();

async function main() {
  console.log("=== Seeding INDOSARI Akuntansi Web App ===\n");

  // 1. Cabang (2 cabang: Jakarta + Surabaya)
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
  console.log(`   ✓ Cabang: ${jkt.nama} (${jkt.id}), ${sby.nama} (${sby.id})`);

  // 2. Users (3 user: admin1, finance1, gudang1)
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
      console.log(`   ✓ Updated user: ${u.username} (${u.role})`);
    } else {
      await db.user.create({ data: { username: u.username, passwordHash, name: u.name, role: u.role, cabangId: u.cabangId, isActive: true } });
      console.log(`   ✓ Created user: ${u.username} (${u.role})`);
    }
  }

  // 3. Settings (identitas perusahaan default)
  console.log("\n3. Seed settings...");
  const settings = [
    { key: "companyName", value: "INDOSARI" },
    { key: "companyAddress", value: "Jl. Industri No. 1, Jakarta" },
    { key: "companyPhone", value: "(021) 1234567" },
    { key: "companyNPWP", value: "" },
  ];
  for (const s of settings) {
    await db.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log(`   ✓ ${settings.length} settings seeded`);

  // 4. Bootstrap master data dari HTML akuntansi (bila ada file export JSON)
  console.log("\n4. Bootstrap master data (opsional)...");
  const akuntansiJsonPath = "/home/z/my-project/scripts/data/akuntansi_master_export.json";
  if (fs.existsSync(akuntansiJsonPath)) {
    console.log(`   Found: ${akuntansiJsonPath}`);
    const raw = fs.readFileSync(akuntansiJsonPath, "utf-8");
    const data = JSON.parse(raw);
    const mb = data.masterBarang || [];
    const ms = data.masterSupplier || [];
    const mp = data.masterPelanggan || [];
    console.log(`   Importing: ${mb.length} barang, ${ms.length} supplier, ${mp.length} pelanggan → Cabang JKT`);
    let added = 0;
    for (const b of mb) {
      try {
        await db.masterBarang.upsert({
          where: { cabangId_kode: { cabangId: jkt.id, kode: b.kode || "" } },
          update: { nama: b.nama, satuan: b.satuan || "" },
          create: { cabangId: jkt.id, kode: b.kode || "", nama: b.nama || "", satuan: b.satuan || "" },
        });
        added++;
      } catch (e) { /* skip duplicates */ }
    }
    console.log(`   ✓ ${added} barang ter-import ke Cabang Jakarta`);
    added = 0;
    for (const s of ms) {
      try {
        await db.masterSupplier.upsert({
          where: { cabangId_nama: { cabangId: jkt.id, nama: s.nama || "" } },
          update: { alamat: s.alamat || "", telp: s.telp || "" },
          create: { cabangId: jkt.id, nama: s.nama || "", alamat: s.alamat || "", telp: s.telp || "" },
        });
        added++;
      } catch (e) { /* skip */ }
    }
    console.log(`   ✓ ${added} supplier ter-import ke Cabang Jakarta`);
    added = 0;
    for (const p of mp) {
      try {
        await db.masterPelanggan.upsert({
          where: { cabangId_nama: { cabangId: jkt.id, nama: p.nama || "" } },
          update: { alamat: p.alamat || "", telp: p.telp || "" },
          create: { cabangId: jkt.id, nama: p.nama || "", alamat: p.alamat || "", telp: p.telp || "" },
        });
        added++;
      } catch (e) { /* skip */ }
    }
    console.log(`   ✓ ${added} pelanggan ter-import ke Cabang Jakarta`);
  } else {
    console.log("   No akuntansi master export found. Skip. (Untuk import manual: buka HTML akuntansi → Master Data → Export JSON → download → letakkan di scripts/data/akuntansi_master_export.json → jalankan seed lagi)");
  }

  console.log("\n=== Seeding complete ===\n");
  console.log("Login credentials:");
  console.log("  admin1   / admin123   (ADMIN, Cabang Jakarta)");
  console.log("  finance1 / finance123 (FINANCE, Cabang Jakarta)");
  console.log("  gudang1  / gudang123  (GUDANG, Cabang Surabaya)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
