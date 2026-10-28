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
    if (!cabangId) return NextResponse.json({ error: "cabangId tidak ditemukan di session. Logout lalu login lagi." }, { status: 400 });
    const text = body.text || "";
    if (!text.trim()) return NextResponse.json({ error: "text kosong" }, { status: 400 });
    const mode = body.mode === "replace" ? "replace" : "append";
    const userId = (session.user as any)?.id;

    const parsed = parseAccurateRincianText(text);
    if (parsed.length === 0) {
      return NextResponse.json({ ok: false, error: "Tidak ada data terparse.", parsedCount: 0 }, { status: 422 });
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
          await db.transaksiPenjualan.deleteMany({ where: { tahun: +yr, bulan: m } });
        }
      }
    }

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
          noNota: tx.noNota,
          namaBarang: tx.namaBarang,
          satuan: tx.satuan,
          kuantitas: tx.kuantitas,
          hargaSatuan: tx.hargaSatuan,
          kategori: tx.kategori,
          isLunas: true,
          keterangan: tx.catatan || null,
          userId,
        })),
      };
      if (mode === "append" && isPostgres) opts.skipDuplicates = true;
      const result = await db.transaksiPenjualan.createMany(opts);
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
  } catch (e: any) {
    return NextResponse.json({
      ok: false,
      error: e.message || "Unknown error",
      stack: e.stack?.split("\n").slice(0, 5),
    }, { status: 500 });
  }
}
