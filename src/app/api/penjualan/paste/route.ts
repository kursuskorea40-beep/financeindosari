import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAccurateRincianText, getMonthFromISO, getYearFromISO } from "@/lib/accurate-parser";

// POST /api/penjualan/paste
// Body: { cabangId, text, mode: "append" | "replace" }
//   - mode "replace": hapus semua transaksi penjualan di cabang+tahun, lalu insert hasil parse
//   - mode "append" (default): insert saja, skip yang noNota+tanggal duplikat
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  if (!cabangId) return NextResponse.json({ error: "cabang required" }, { status: 400 });
  const text = body.text || "";
  if (!text.trim()) return NextResponse.json({ error: "text kosong" }, { status: 400 });
  const mode = body.mode === "replace" ? "replace" : "append";
  const userId = (session.user as any).id;

  // Parse text via smart parser
  const parsed = parseAccurateRincianText(text);
  if (parsed.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "Tidak ada data terparse. Pastikan format teks sesuai Rincian Penjualan per Barang Accurate.",
      parsedCount: 0,
    }, { status: 422 });
  }

  // Group by year (most/all transactions should be in same year for one paste)
  const byYear: Record<number, typeof parsed> = {};
  for (const tx of parsed) {
    const yr = getYearFromISO(tx.tanggal);
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(tx);
  }

  // If mode replace, delete existing for affected years
  if (mode === "replace") {
    for (const yr of Object.keys(byYear)) {
      // Only delete for the months present in parsed data (be conservative)
      const monthsInPaste = new Set(byYear[+yr].map(t => getMonthFromISO(t.tanggal)));
      for (const m of monthsInPaste) {
        await db.transaksiPenjualan.deleteMany({
          where: { cabangId, tahun: +yr, bulan: m },
        });
      }
    }
  }

  // Insert
  let inserted = 0;
  let skippedDup = 0;
  for (const tx of parsed) {
    const tahun = getYearFromISO(tx.tanggal);
    const bulan = getMonthFromISO(tx.tanggal);
    try {
      // Skip duplicates in append mode (same noNota + tanggal + namaBarang)
      if (mode === "append") {
        const exist = await db.transaksiPenjualan.findFirst({
          where: { cabangId, noNota: tx.noNota, tanggal: tx.tanggal, namaBarang: tx.namaBarang },
        });
        if (exist) { skippedDup++; continue; }
      }
      await db.transaksiPenjualan.create({
        data: {
          cabangId,
          bulan, tahun,
          tanggal: tx.tanggal,
          noNota: tx.noNota,
          namaBarang: tx.namaBarang,
          satuan: tx.satuan,
          kuantitas: tx.kuantitas,
          hargaSatuan: tx.hargaSatuan,
          kategori: tx.kategori,
          isLunas: true, // penjualan default lunas (hanya NB = kredit aja)
          keterangan: tx.catatan || null,
          userId,
        },
      });
      inserted++;
    } catch (e) {
      // skip on error (probably duplicate constraint)
      skippedDup++;
    }
  }

  return NextResponse.json({
    ok: true,
    mode,
    parsedCount: parsed.length,
    inserted,
    skippedDuplicates: skippedDup,
    yearsAffected: Object.keys(byYear).map(y => parseInt(y, 10)),
    sample: parsed.slice(0, 3),
  });
}
