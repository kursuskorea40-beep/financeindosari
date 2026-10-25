import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cabangId = req.nextUrl.searchParams.get("cabangId") || (session.user as any).cabangId;
  if (!cabangId) return NextResponse.json([]);
  const items = await db.masterSupplier.findMany({
    where: { cabangId },
    orderBy: [{ nama: "asc" }],
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  if (!cabangId) return NextResponse.json({ error: "cabang required" }, { status: 400 });
  const result = await db.masterSupplier.upsert({
    where: { cabangId_nama: { cabangId, nama: body.nama || "" } },
    update: { alamat: body.alamat || "", telp: body.telp || "" },
    create: { cabangId, nama: body.nama, alamat: body.alamat || "", telp: body.telp || "" },
  });
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.masterSupplier.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
