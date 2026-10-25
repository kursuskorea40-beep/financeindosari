import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // ADMIN bisa lihat semua cabang; role lain cuma cabang sendiri
  const role = (session.user as any).role;
  const userCabangId = (session.user as any).cabangId;
  if (role === "ADMIN") {
    const cabangs = await db.cabang.findMany({ orderBy: [{ kode: "asc" }] });
    return NextResponse.json(cabangs);
  }
  const cabangs = await db.cabang.findMany({ where: { id: userCabangId } });
  return NextResponse.json(cabangs);
}
