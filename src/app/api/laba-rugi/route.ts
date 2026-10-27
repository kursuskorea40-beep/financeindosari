import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAccurateLabaRugiText, frDeepCopyRows, frMergeRows, LR_ROWS_SEP, FRRow } from "@/lib/accurate-fr";

// GET /api/laba-rugi?cabangId=&bulan=9&tahun=2026
//   - Returns: { rows: FRRow[] (with totals computed), isDefault: boolean, hasEdit: boolean }
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cabangId = req.nextUrl.searchParams.get("cabangId") || (session.user as any).cabangId;
  if (!cabangId) return NextResponse.json({ error: "cabangId tidak ditemukan. Logout lalu login lagi." }, { status: 400 })
  const now = new Date();
  const tahun = parseInt(req.nextUrl.searchParams.get("tahun") || "") || now.getFullYear();
  const bulan = parseInt(req.nextUrl.searchParams.get("bulan") || "") || now.getMonth() + 1;

  // Get all item rows for this bulan+tahun+cabang from DB
  const dbRows = await db.labaRugiBulan.findMany({ where: { tahun, bulan } });
  let rows: FRRow[];
  if (dbRows.length > 0) {
    // Merge with template (template provides structure + total formulas)
    const templateRows = frDeepCopyRows(LR_ROWS_SEP);
    // Zero out template items first
    templateRows.forEach(r => { if (r.t === "item") r.v = 0; });
    // Map DB rows to template items by akun name
    templateRows.forEach(r => {
      if (r.t !== "item" || !r.name) return;
      const dbMatch = dbRows.find(d => d.akun.toLowerCase() === r.name!.toLowerCase());
      if (dbMatch) r.v = dbMatch.nilai;
    });
    // Add custom (non-template) akun at end
    for (const d of dbRows) {
      const exists = templateRows.find(r => r.t === "item" && r.name && r.name.toLowerCase() === d.akun.toLowerCase());
      if (!exists && d.isCustom) {
        templateRows.push({
          t: "item", name: d.akun, lvl: 1,
          sc: [d.kategori || "ops"], v: d.nilai, custom: true,
        });
      }
    }
    rows = templateRows;
  } else {
    // No DB data — return template with all zeros (except September default values)
    rows = frDeepCopyRows(LR_ROWS_SEP);
  }
  return NextResponse.json({
    cabangId, tahun, bulan,
    rows,
    hasEdit: dbRows.length > 0,
    isDefault: dbRows.length === 0,
  });
}

// POST /api/laba-rugi — save single akun edit (body: { bulan, tahun, akun, nilai, kategori, isCustom })
//   OR save full set (body: { bulan, tahun, rows: [...] })
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  if (!cabangId) return NextResponse.json({ error: "cabangId tidak ditemukan. Logout lalu login lagi." }, { status: 400 })
  const bulan = parseInt(body.bulan);
  const tahun = parseInt(body.tahun);
  if (!bulan || !tahun) return NextResponse.json({ error: "bulan & tahun required" }, { status: 400 });

  // If body.rows is array, save all in transaction
  if (Array.isArray(body.rows)) {
    const rows: FRRow[] = body.rows;
    // Delete existing items for this bulan+tahun+cabang
    await db.labaRugiBulan.deleteMany({ where: { tahun, bulan } });
    for (const r of rows) {
      if (r.t !== "item" || !r.name) continue;
      await db.labaRugiBulan.upsert({
        where: { cabangId_tahun_bulan_akun: { cabangId, tahun, bulan, akun: r.name } },
        update: { nilai: r.v || 0, kategori: r.sc?.[0] || null, isCustom: r.custom || false },
        create: {
          cabangId, bulan, tahun,
          akun: r.name, nilai: r.v || 0,
          kategori: r.sc?.[0] || null, isCustom: r.custom || false,
        },
      });
    }
    return NextResponse.json({ ok: true, saved: rows.filter(r => r.t === "item").length });
  }

  // Single akun upsert
  const result = await db.labaRugiBulan.upsert({
    where: { cabangId_tahun_bulan_akun: { cabangId, tahun, bulan, akun: body.akun } },
    update: { nilai: parseFloat(body.nilai) || 0, kategori: body.kategori || null, isCustom: body.isCustom || false },
    create: {
      cabangId, bulan, tahun,
      akun: body.akun, nilai: parseFloat(body.nilai) || 0,
      kategori: body.kategori || null, isCustom: body.isCustom || false,
    },
  });
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cabangId = (session.user as any).cabangId;
  const bulan = req.nextUrl.searchParams.get("bulan");
  const tahun = req.nextUrl.searchParams.get("tahun");
  if (!bulan || !tahun) return NextResponse.json({ error: "bulan & tahun required" }, { status: 400 });
  await db.labaRugiBulan.deleteMany({ where: { bulan: parseInt(bulan), tahun: parseInt(tahun) } });
  return NextResponse.json({ ok: true });
}

// Paste dari Accurate (Laba/Rugi Standar)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  if (!cabangId) return NextResponse.json({ error: "cabangId tidak ditemukan. Logout lalu login lagi." }, { status: 400 })
  const text = body.text || "";
  if (!text.trim()) return NextResponse.json({ error: "text kosong" }, { status: 400 });
  const bulan = parseInt(body.bulan);
  const tahun = parseInt(body.tahun);
  if (!bulan || !tahun) return NextResponse.json({ error: "bulan & tahun required" }, { status: 400 });
  const mode = body.mode === "append" ? "append" : "replace";

  const parsed = parseAccurateLabaRugiText(text);
  if (parsed.length === 0) {
    return NextResponse.json({ ok: false, error: "Tidak ada akun terparse", parsedCount: 0 }, { status: 422 });
  }

  if (mode === "replace") {
    await db.labaRugiBulan.deleteMany({ where: { tahun, bulan } });
  } else {
    // Append: merge with existing
    const existing = await db.labaRugiBulan.findMany({ where: { tahun, bulan } });
    const existingRows: FRRow[] = existing.map(d => ({
      t: "item", name: d.akun, lvl: 1, sc: [d.kategori || "ops"], v: d.nilai, custom: d.isCustom,
    }));
    const merged = frMergeRows(existingRows, parsed);
    await db.labaRugiBulan.deleteMany({ where: { tahun, bulan } });
    for (const r of merged) {
      if (r.t !== "item" || !r.name) continue;
      await db.labaRugiBulan.create({
        data: {
          cabangId, bulan, tahun,
          akun: r.name, nilai: r.v || 0,
          kategori: r.sc?.[0] || null, isCustom: r.custom || false,
        },
      });
    }
    return NextResponse.json({
      ok: true, mode, parsedCount: parsed.filter(r => r.t === "item").length,
      savedCount: merged.filter(r => r.t === "item").length,
      sample: parsed.filter(r => r.t === "item").slice(0, 3).map((r: FRRow) => ({ name: r.name, v: r.v })),
    });
  }

  // Replace mode: save parsed items
  let saved = 0;
  for (const r of parsed) {
    if (r.t !== "item" || !r.name) continue;
    await db.labaRugiBulan.create({
      data: {
        cabangId, bulan, tahun,
        akun: r.name, nilai: r.v || 0,
        kategori: r.sc?.[0] || null, isCustom: r.custom || false,
      },
    });
    saved++;
  }
  return NextResponse.json({
    ok: true, mode, parsedCount: parsed.filter(r => r.t === "item").length,
    savedCount: saved,
    sample: parsed.filter(r => r.t === "item").slice(0, 3).map((r: FRRow) => ({ name: r.name, v: r.v })),
  });
}
