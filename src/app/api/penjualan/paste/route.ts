import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseAccurateRincianText, getMonthFromISO, getYearFromISO } from "@/lib/accurate-parser";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const body = await req.json();
    const cabangId = body.cabangId || (session.user as any)?.cabangId;
    if (!cabangId) return NextResponse.json({ error: "cabangId tidak ditemukan. Logout lalu login lagi." }, { status: 400 });
    const text = body.text || "";
    if (!text.trim()) return NextResponse.json({ error: "text kosong" }, { status: 400 });
    const mode = body.mode === "replace" ? "replace" : "append";
    const userId = (session.user as any)?.id;

    const parsed = parseAccurateRincianText(text);
    if (parsed.length === 0) {
      return NextResponse.json({ ok: false, error: "Tidak ada data terparse.", parsedCount: 0 }, { status: 422 });
    }

    // Get all tahun+bulan combinations from parsed data
    const byYear: Record<number, typeof parsed> = {};
    for (const tx of parsed) {
      const yr = getYearFromISO(tx.tanggal);
      if (!byYear[yr]) byYear[yr] = [];
      byYear[yr].push(tx);
    }

    // In replace mode: delete ALL records for affected tahun+bulan (across ALL cabangs)
    if (mode === "replace") {
      for (const yr of Object.keys(byYear)) {
        const monthsInPaste = new Set(byYear[+yr].map(t => getMonthFromISO(t.tanggal)));
        for (const m of monthsInPaste) {
          const delResult = await db.transaksiPenjualan.deleteMany({
            where: { tahun: +yr, bulan: m },
          });
          console.log(`Replace: deleted ${delResult.count} records for tahun=${yr}, bulan=${m}`);
        }
      }
    }

    // Insert new records one by one (skip duplicates manually)
    let inserted = 0;
    let skippedDup = 0;
    for (const tx of parsed) {
      const tahun = getYearFromISO(tx.tanggal);
      const bulan = getMonthFromISO(tx.tanggal);
      try {
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
            isLunas: true,
            keterangan: tx.catatan || null,
            userId,
          },
        });
        inserted++;
      } catch (e: any) {
        // Skip duplicates (unique constraint violation)
        if (e.code === 'P2002') {
          skippedDup++;
        } else {
          throw e; // Re-throw other errors
        }
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
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message || "Unknown error",
      code: e.code,
    }, { status: 500 });
  }
}
