import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const items = await db.setting.findMany();
  const out: Record<string, string> = {};
  for (const s of items) out[s.key] = s.value;
  return NextResponse.json(out);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json(); // { key, value }
  if (!body.key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const result = await db.setting.upsert({
    where: { key: body.key },
    update: { value: body.value || "" },
    create: { key: body.key, value: body.value || "" },
  });
  return NextResponse.json(result);
}
