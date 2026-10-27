import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAccurateRincianPembelianText, getMonthFromISO, getYearFromISO } from "@/lib/accurate-parser";

// POST /api/pembelian/paste
// Body: { cabangId, text, mode: "append" | "replace" }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  // cabangId optional — bila kosong, tampilkan SEMUA data (shared view)
  const text = body.text || "";
  if (!text.trim()) return NextResponse.json({ error: "text kosong" }, { status: 400 });
  const mode = body.mode === "replace" ? "replace" : "append";
  const userId = (session.user as any).id;

  const parsed = parseAccurateRincianPembelianText(text);
  if (parsed.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "Tidak ada data terparse. Pastikan format teks sesuai Rincian Pembelian per Barang Accurate.",
      parsedCount: 0,
    }, { status: 422 });
  }

  const byYear: Record<number, typeof parsed> = {};
  for (const tx of parsed) {
    const yr = getYearFromISO(tx.tanggal);
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(tx);
  }

  if (mode === "replace") {
    for (const yr of Object.keys(byYear)) {
      const monthsInPaste = new Set(byYear[+yr].map(t => getMonthFromISO(t.tanggal)));
      for (const m of monthsInPaste) {
        await db.transaksiPembelian.deleteMany({
          where: { tahun: +yr, bulan: m },
        });
      }
    }
  }

  // Bulk insert via createMany — performant untuk serverless
  let inserted = 0;
  let skippedDup = 0;

  const groups: Record<string, typeof parsed> = {};
  for (const tx of parsed) {
    const tahun = getYearFromISO(tx.tanggal);
    const bulan = getMonthFromISO(tx.tanggal);
    const key = `${tahun}-${bulan}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  }

  for (const key of Object.keys(groups)) {
    const batch = groups[key];
    const [tahun, bulan] = key.split("-").map(n => parseInt(n, 10));
    const isPostgres = (process.env.DATABASE_URL || "").startsWith("postgres");
    const opts: any = {
      data: batch.map(tx => ({
        cabangId,
        bulan, tahun,
        tanggal: tx.tanggal,
        noNota: tx.noFaktur,
        namaBarang: tx.namaBarang,
        satuan: tx.satuan,
        kuantitas: tx.kuantitas,
        hargaSatuan: tx.hargaSatuan,
        isLunas: tx.isLunas,
        jatuhTempo: tx.jatuhTempo || null,
        keterangan: tx.catatan || null,
        userId,
      })),
    };
    if (mode === "append" && isPostgres) opts.skipDuplicates = true;
    const result = await db.transaksiPembelian.createMany(opts);
    inserted += result.count;
    skippedDup += batch.length - result.count;
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
