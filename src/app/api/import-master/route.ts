import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/import-master — import JSON dari file HTML akuntansi
// Body: { cabangId, masterBarang, masterSupplier, masterPelanggan, mode: "merge"|"replace" }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  if (!cabangId) return NextResponse.json({ error: "cabang required" }, { status: 400 });
  const mode = body.mode === "replace" ? "replace" : "merge";
  const mb = Array.isArray(body.masterBarang) ? body.masterBarang : [];
  const ms = Array.isArray(body.masterSupplier) ? body.masterSupplier : [];
  const mp = Array.isArray(body.masterPelanggan) ? body.masterPelanggan : [];

  // Replace mode: clear existing
  if (mode === "replace") {
    await db.masterBarang.deleteMany({ where: { cabangId } });
    await db.masterSupplier.deleteMany({ where: { cabangId } });
    await db.masterPelanggan.deleteMany({ where: { cabangId } });
  }

  let addedBarang = 0, addedSupplier = 0, addedPelanggan = 0;
  for (const b of mb) {
    try {
      const kode = String(b.kode || "").trim();
      const nama = String(b.nama || "").trim();
      const satuan = String(b.satuan || "").trim();
      if (!kode || !nama) continue;
      await db.masterBarang.upsert({
        where: { cabangId_kode: { cabangId, kode } },
        update: { nama, satuan },
        create: { cabangId, kode, nama, satuan },
      });
      addedBarang++;
    } catch (e) { /* skip duplicate */ }
  }
  for (const s of ms) {
    try {
      const nama = String(s.nama || "").trim();
      if (!nama) continue;
      const alamat = String(s.alamat || "").trim();
      const telp = String(s.telp || "").trim();
      await db.masterSupplier.upsert({
        where: { cabangId_nama: { cabangId, nama } },
        update: { alamat, telp },
        create: { cabangId, nama, alamat, telp },
      });
      addedSupplier++;
    } catch (e) { /* skip */ }
  }
  for (const p of mp) {
    try {
      const nama = String(p.nama || "").trim();
      if (!nama) continue;
      const alamat = String(p.alamat || "").trim();
      const telp = String(p.telp || "").trim();
      await db.masterPelanggan.upsert({
        where: { cabangId_nama: { cabangId, nama } },
        update: { alamat, telp },
        create: { cabangId, nama, alamat, telp },
      });
      addedPelanggan++;
    } catch (e) { /* skip */ }
  }

  return NextResponse.json({
    ok: true,
    mode,
    addedBarang,
    addedSupplier,
    addedPelanggan,
  });
}
