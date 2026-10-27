import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAccuratePersediaanText } from "@/lib/accurate-persediaan";

// POST /api/persediaan/paste
// Body: { cabangId, text, mode: "append" | "replace", bulan, tahun }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  // cabangId optional — bila kosong, tampilkan SEMUA data (shared view)
  const text = body.text || "";
  if (!text.trim()) return NextResponse.json({ error: "text kosong" }, { status: 400 });
  const mode = body.mode === "append" ? "append" : "replace";

  const now = new Date();
  const tahun = parseInt(body.tahun) || now.getFullYear();
  const bulan = parseInt(body.bulan) || now.getMonth() + 1;

  const parsed = parseAccuratePersediaanText(text);
  if (parsed.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "Tidak ada data terparse. Pastikan format teks sesuai Daftar Nilai Persediaan / Laporan Persediaan Bulanan Accurate.",
      parsedCount: 0,
    }, { status: 422 });
  }

  if (mode === "replace") {
    await db.persediaanBulan.deleteMany({ where: { tahun, bulan } });
  }

  let inserted = 0;
  let updated = 0;
  for (const item of parsed) {
    try {
      const exist = await db.persediaanBulan.findUnique({
        where: { cabangId_tahun_bulan_kode: { cabangId, tahun, bulan, kode: item.kode } },
      });
      if (exist && mode === "append") {
        // Skip existing in append mode
        continue;
      }
      await db.persediaanBulan.upsert({
        where: { cabangId_tahun_bulan_kode: { cabangId, tahun, bulan, kode: item.kode } },
        update: {
          nama: item.nama,
          satuan: item.satuan,
          awalQty: item.awalQty, awalNilai: item.awalNilai,
          masukQty: item.masukQty, masukNilai: item.masukNilai,
          keluarQty: item.keluarQty, keluarNilai: item.keluarNilai,
        },
        create: {
          cabangId, bulan, tahun,
          kode: item.kode, nama: item.nama, satuan: item.satuan,
          awalQty: item.awalQty, awalNilai: item.awalNilai,
          masukQty: item.masukQty, masukNilai: item.masukNilai,
          keluarQty: item.keluarQty, keluarNilai: item.keluarNilai,
        },
      });
      if (exist) updated++; else inserted++;
    } catch (e) {
      // skip on error
    }
  }

  return NextResponse.json({
    ok: true,
    mode,
    bulan, tahun,
    parsedCount: parsed.length,
    inserted, updated,
    sample: parsed.slice(0, 3),
  });
}
