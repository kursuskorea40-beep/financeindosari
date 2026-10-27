import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cabangId = req.nextUrl.searchParams.get("cabangId") || (session.user as any).cabangId;
  // cabangId optional — bila kosong, tampilkan SEMUA data (shared view)
  const items = await db.masterBarang.findMany({
    where: {},
    orderBy: [{ kode: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  // cabangId optional — bila kosong, tampilkan SEMUA data (shared view)
  const result = await db.masterBarang.upsert({
    where: { cabangId_kode: { cabangId, kode: body.kode || "" } },
    update: { nama: body.nama, satuan: body.satuan || "" },
    create: { cabangId, kode: body.kode, nama: body.nama, satuan: body.satuan || "" },
  });
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.masterBarang.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
