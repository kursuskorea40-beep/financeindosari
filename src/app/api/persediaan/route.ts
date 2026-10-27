import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/persediaan?cabangId=&bulan=9&tahun=2026
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cabangId = req.nextUrl.searchParams.get("cabangId") || (session.user as any).cabangId;
  // cabangId optional — bila kosong, tampilkan SEMUA data (shared view)
  const now = new Date();
  const tahun = parseInt(req.nextUrl.searchParams.get("tahun") || "") || now.getFullYear();
  const bulan = parseInt(req.nextUrl.searchParams.get("bulan") || "") || now.getMonth() + 1;

  const items = await db.persediaanBulan.findMany({
    where: { tahun, bulan },
    orderBy: [{ kode: "asc" }],
  });

  // Compute totals + saldo akhir
  const totAwal = items.reduce((s, r) => s + r.awalNilai, 0);
  const totMasuk = items.reduce((s, r) => s + r.masukNilai, 0);
  const totKeluar = items.reduce((s, r) => s + r.keluarNilai, 0);
  const totAkhir = totAwal + totMasuk - totKeluar;

  return NextResponse.json({
    bulan, tahun,
    items,
    summary: {
      count: items.length,
      totAwal, totMasuk, totKeluar, totAkhir,
    },
  });
}

// POST /api/persediaan — create/update single
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  // cabangId optional — bila kosong, tampilkan SEMUA data (shared view)

  // Upsert by (cabangId, tahun, bulan, kode)
  const result = await db.persediaanBulan.upsert({
    where: { cabangId_tahun_bulan_kode: { cabangId, tahun: body.tahun, bulan: body.bulan, kode: body.kode } },
    update: {
      nama: body.nama,
      satuan: body.satuan || null,
      awalQty: parseFloat(body.awalQty) || 0,
      awalNilai: parseFloat(body.awalNilai) || 0,
      masukQty: parseFloat(body.masukQty) || 0,
      masukNilai: parseFloat(body.masukNilai) || 0,
      keluarQty: parseFloat(body.keluarQty) || 0,
      keluarNilai: parseFloat(body.keluarNilai) || 0,
    },
    create: {
      cabangId,
      bulan: body.bulan,
      tahun: body.tahun,
      kode: body.kode,
      nama: body.nama,
      satuan: body.satuan || null,
      awalQty: parseFloat(body.awalQty) || 0,
      awalNilai: parseFloat(body.awalNilai) || 0,
      masukQty: parseFloat(body.masukQty) || 0,
      masukNilai: parseFloat(body.masukNilai) || 0,
      keluarQty: parseFloat(body.keluarQty) || 0,
      keluarNilai: parseFloat(body.keluarNilai) || 0,
    },
  });
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.persediaanBulan.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
