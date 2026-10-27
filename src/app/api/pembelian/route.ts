import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMonthFromISO, getYearFromISO } from "@/lib/accurate-parser";

// GET /api/pembelian?cabangId=xxx&bulan=9&tahun=2026&q=search
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cabangId = req.nextUrl.searchParams.get("cabangId") || (session.user as any).cabangId;
  const tahunParam = req.nextUrl.searchParams.get("tahun");
  const bulanParam = req.nextUrl.searchParams.get("bulan");
  const q = req.nextUrl.searchParams.get("q") || "";
  // cabangId optional — bila kosong, tampilkan SEMUA data (shared view)

  const now = new Date();
  const tahun = tahunParam ? parseInt(tahunParam, 10) : now.getFullYear();
  const bulan = bulanParam ? parseInt(bulanParam, 10) : now.getMonth() + 1;

  const all = await db.transaksiPembelian.findMany({
    where: { tahun },
    orderBy: [{ tanggal: "asc" }, { noNota: "asc" }],
  });

  const filtered = all.filter(t => bulan === 0 || t.bulan === bulan).filter(t => {
    if (!q) return true;
    const ql = q.toLowerCase();
    return (t.noNota || "").toLowerCase().includes(ql)
      || (t.namaBarang || "").toLowerCase().includes(ql)
      || (t.keterangan || "").toLowerCase().includes(ql);
  });

  const lunas = filtered.filter(t => t.isLunas).reduce((s, t) => s + t.kuantitas * t.hargaSatuan, 0);
  const kredit = filtered.filter(t => !t.isLunas).reduce((s, t) => s + t.kuantitas * t.hargaSatuan, 0);
  const total = lunas + kredit;

  return NextResponse.json({
    bulan, tahun,
    items: filtered,
    summary: {
      count: filtered.length,
      total,
      tunai: lunas,
      kredit,
      pctTunai: total > 0 ? (lunas / total) * 100 : 0,
    },
  });
}

// POST /api/pembelian — create or update
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  // cabangId optional — bila kosong, tampilkan SEMUA data (shared view)
  const userId = (session.user as any).id;

  const tanggal = body.tanggal;
  if (!tanggal) return NextResponse.json({ error: "tanggal required" }, { status: 400 });
  const tahun = getYearFromISO(tanggal);
  const bulan = getMonthFromISO(tanggal);

  if (body.id) {
    const updated = await db.transaksiPembelian.update({
      where: { id: body.id },
      data: {
        tanggal: body.tanggal,
        bulan, tahun,
        noNota: body.noNota || "",
        namaBarang: body.namaBarang,
        satuan: body.satuan || "",
        kuantitas: parseFloat(body.kuantitas) || 0,
        hargaSatuan: parseFloat(body.hargaSatuan) || 0,
        isLunas: body.isLunas ?? false,
        jatuhTempo: body.jatuhTempo || null,
        keterangan: body.keterangan || "",
        userId,
      },
    });
    return NextResponse.json(updated);
  }
  const created = await db.transaksiPembelian.create({
    data: {
      cabangId,
      bulan, tahun,
      tanggal: body.tanggal,
      noNota: body.noNota || null,
      namaBarang: body.namaBarang,
      satuan: body.satuan || null,
      kuantitas: parseFloat(body.kuantitas) || 0,
      hargaSatuan: parseFloat(body.hargaSatuan) || 0,
      isLunas: body.isLunas ?? false,
      jatuhTempo: body.jatuhTempo || null,
      keterangan: body.keterangan || null,
      userId,
    },
  });
  return NextResponse.json(created);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.transaksiPembelian.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
