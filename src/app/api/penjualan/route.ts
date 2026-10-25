import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMonthFromISO, getYearFromISO } from "@/lib/accurate-parser";

// GET /api/penjualan?cabangId=xxx&bulan=9&tahun=2026&q=search
//   - bulan=0 = YTD; bulan=1-12 = specific month
//   - q = search nomor/nama barang/keterangan
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cabangId = req.nextUrl.searchParams.get("cabangId") || (session.user as any).cabangId;
  const tahunParam = req.nextUrl.searchParams.get("tahun");
  const bulanParam = req.nextUrl.searchParams.get("bulan");
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!cabangId) return NextResponse.json([]);

  // Default: bulan = current month, tahun = current year
  const now = new Date();
  const tahun = tahunParam ? parseInt(tahunParam, 10) : now.getFullYear();
  const bulan = bulanParam ? parseInt(bulanParam, 10) : now.getMonth() + 1;

  // Query all year's transactions then filter (so summary can use same data)
  const all = await db.transaksiPenjualan.findMany({
    where: { cabangId, tahun },
    orderBy: [{ tanggal: "asc" }, { noNota: "asc" }],
  });

  // Filter by bulan (0 = all months YTD)
  const filtered = all.filter(t => bulan === 0 || t.bulan === bulan).filter(t => {
    if (!q) return true;
    const ql = q.toLowerCase();
    return (t.noNota || "").toLowerCase().includes(ql)
      || (t.namaBarang || "").toLowerCase().includes(ql)
      || (t.keterangan || "").toLowerCase().includes(ql);
  });

  // Summary: total tunai (NOTA KECIL) vs kredit (NOTA BESAR)
  const tunai = filtered.filter(t => t.kategori === "NOTA KECIL").reduce((s, t) => s + t.kuantitas * t.hargaSatuan, 0);
  const kredit = filtered.filter(t => t.kategori === "NOTA BESAR").reduce((s, t) => s + t.kuantitas * t.hargaSatuan, 0);
  const total = tunai + kredit;

  return NextResponse.json({
    bulan, tahun,
    items: filtered,
    summary: {
      count: filtered.length,
      total,
      tunai,
      kredit,
      pctTunai: total > 0 ? (tunai / total) * 100 : 0,
    },
  });
}

// POST /api/penjualan — create or update single transaksi
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  if (!cabangId) return NextResponse.json({ error: "cabang required" }, { status: 400 });
  const userId = (session.user as any).id;

  const tanggal = body.tanggal;
  if (!tanggal) return NextResponse.json({ error: "tanggal required" }, { status: 400 });
  const tahun = getYearFromISO(tanggal);
  const bulan = getMonthFromISO(tanggal);

  // Upsert by id (update) or create new
  if (body.id) {
    const updated = await db.transaksiPenjualan.update({
      where: { id: body.id },
      data: {
        tanggal: body.tanggal,
        bulan, tahun,
        noNota: body.noNota || "",
        namaBarang: body.namaBarang,
        satuan: body.satuan || "",
        kuantitas: parseFloat(body.kuantitas) || 0,
        hargaSatuan: parseFloat(body.hargaSatuan) || 0,
        kategori: body.kategori || "NOTA KECIL",
        isLunas: body.isLunas ?? true,
        jatuhTempo: body.jatuhTempo || null,
        keterangan: body.keterangan || "",
        userId,
      },
    });
    return NextResponse.json(updated);
  }
  const created = await db.transaksiPenjualan.create({
    data: {
      cabangId,
      bulan, tahun,
      tanggal: body.tanggal,
      noNota: body.noNota || null,
      namaBarang: body.namaBarang,
      satuan: body.satuan || null,
      kuantitas: parseFloat(body.kuantitas) || 0,
      hargaSatuan: parseFloat(body.hargaSatuan) || 0,
      kategori: body.kategori || "NOTA KECIL",
      isLunas: body.isLunas ?? true,
      jatuhTempo: body.jatuhTempo || null,
      keterangan: body.keterangan || null,
      userId,
    },
  });
  return NextResponse.json(created);
}

// DELETE /api/penjualan?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.transaksiPenjualan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
