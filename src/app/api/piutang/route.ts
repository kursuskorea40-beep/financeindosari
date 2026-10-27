import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { hitungUmurStatus, PiutangUtangRow } from "@/lib/accurate-piutang-hutang";
import { parseAccuratePiutangUtangText } from "@/lib/accurate-piutang-hutang";

// GET /api/piutang?cabangId=&bulan=&tahun=
//   - Returns: { saldoBulanan: [...12 months], faktur: [...] (filtered by jatuh tempo bulan bila bulan != 0), summary: {...} }
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cabangId = req.nextUrl.searchParams.get("cabangId") || (session.user as any).cabangId;
  if (!cabangId) return NextResponse.json({ error: "cabangId tidak ditemukan. Logout lalu login lagi." }, { status: 400 })
  const now = new Date();
  const tahun = parseInt(req.nextUrl.searchParams.get("tahun") || "") || now.getFullYear();
  const bulan = parseInt(req.nextUrl.searchParams.get("bulan") || "") || 0; // 0 = YTD

  const saldoRows = await db.piutangBulan.findMany({ where: { tahun }, orderBy: [{ bulan: "asc" }] });
  const allFaktur = await db.fakturPiutang.findMany({ where: {} });

  // Fill 12 months (some may not exist)
  const saldo12: { bulan: number; saldoAwal: number; penjualan: number; pembayaran: number; penyesuaian: number; saldoAkhir: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const r = saldoRows.find(x => x.bulan === m);
    const saldoAwal = r?.saldoAwal || 0;
    const penjualan = r?.penjualan || 0;
    const pembayaran = r?.pembayaran || 0;
    const penyesuaian = r?.penyesuaian || 0;
    saldo12.push({
      bulan: m,
      saldoAwal, penjualan, pembayaran, penyesuaian,
      saldoAkhir: saldoAwal + penjualan - pembayaran,
    });
  }

  // Filter faktur by jatuh tempo month (bila bulan != 0)
  const fakturFiltered = bulan === 0 ? allFaktur : allFaktur.filter(f => {
    if (!f.jatuhTempo) return false;
    const m = f.jatuhTempo.match(/^(\d{4})-(\d{2})-/);
    return m && parseInt(m[2], 10) === bulan;
  });
  const fakturWithStatus = fakturFiltered.map(f => ({ ...f, st: hitungUmurStatus(f) }));

  const totJual = saldo12.reduce((s, r) => s + r.penjualan, 0);
  const totBayar = saldo12.reduce((s, r) => s + r.pembayaran, 0);
  const totPuSisa = fakturFiltered.reduce((s, f) => s + f.nilai, 0);
  const puTerlewat = fakturWithStatus.filter(x => x.st.status === "TERLEWAT").length;
  const saldoAkhirDec = saldo12[11]?.saldoAkhir || 0;

  return NextResponse.json({
    cabangId, tahun, bulan,
    saldoBulanan: saldo12,
    faktur: fakturWithStatus,
    summary: {
      saldoAkhirYTD: saldoAkhirDec,
      penjualanYTD: totJual,
      pembayaranYTD: totBayar,
      fakturBelumLunas: totPuSisa,
      fakturTerlewat: puTerlewat,
    },
  });
}

// POST /api/piutang — upsert saldo bulanan (body: { bulan, tahun, saldoAwal, penjualan, pembayaran, penyesuaian })
//   OR upsert faktur (body: { isFaktur: true, id?, noFaktur, ... })
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  if (!cabangId) return NextResponse.json({ error: "cabangId tidak ditemukan. Logout lalu login lagi." }, { status: 400 })

  if (body.isFaktur) {
    // Faktur upsert by noFaktur
    if (body.id) {
      const updated = await db.fakturPiutang.update({
        where: { id: body.id },
        data: {
          pelanggan: body.pelanggan || body.party,
          noFaktur: body.noFaktur,
          tanggal: body.tanggal || null,
          jatuhTempo: body.jatuhTempo || null,
          nilai: parseFloat(body.nilai) || 0,
          jumlah: parseFloat(body.jumlah) || 0,
          dibayar: parseFloat(body.dibayar) || 0,
          sumber: body.sumber || "manual",
        },
      });
      return NextResponse.json(updated);
    }
    const created = await db.fakturPiutang.create({
      data: {
        cabangId,
        pelanggan: body.pelanggan || body.party || "",
        noFaktur: body.noFaktur,
        tanggal: body.tanggal || null,
        jatuhTempo: body.jatuhTempo || null,
        nilai: parseFloat(body.nilai) || 0,
        jumlah: parseFloat(body.jumlah) || 0,
        dibayar: parseFloat(body.dibayar) || 0,
        sumber: body.sumber || "manual",
      },
    });
    return NextResponse.json(created);
  }

  // Saldo bulanan upsert
  const result = await db.piutangBulan.upsert({
    where: { cabangId_tahun_bulan: { cabangId, tahun: body.tahun, bulan: body.bulan } },
    update: {
      saldoAwal: parseFloat(body.saldoAwal) || 0,
      penjualan: parseFloat(body.penjualan) || 0,
      pembayaran: parseFloat(body.pembayaran) || 0,
      penyesuaian: parseFloat(body.penyesuaian) || 0,
    },
    create: {
      cabangId,
      bulan: body.bulan, tahun: body.tahun,
      saldoAwal: parseFloat(body.saldoAwal) || 0,
      penjualan: parseFloat(body.penjualan) || 0,
      pembayaran: parseFloat(body.pembayaran) || 0,
      penyesuaian: parseFloat(body.penyesuaian) || 0,
    },
  });
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  const all = req.nextUrl.searchParams.get("all");
  const cabangId = (session.user as any).cabangId;
  if (all === "faktur") {
    // Delete all faktur from paste Accurate in this cabang
    await db.fakturPiutang.deleteMany({ where: { sumber: "paste_accurate" } });
    return NextResponse.json({ ok: true });
  }
  if (all === "saldo") {
    await db.piutangBulan.deleteMany({ where: {} });
    return NextResponse.json({ ok: true });
  }
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.fakturPiutang.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

// Paste dari Accurate (Daftar Piutang Usaha)
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();
  const cabangId = body.cabangId || (session.user as any).cabangId;
  if (!cabangId) return NextResponse.json({ error: "cabangId tidak ditemukan. Logout lalu login lagi." }, { status: 400 })
  const text = body.text || "";
  if (!text.trim()) return NextResponse.json({ error: "text kosong" }, { status: 400 });
  const mode = body.mode === "append" ? "append" : "replace";

  const parsed: PiutangUtangRow[] = parseAccuratePiutangUtangText(text, "piutang");
  if (parsed.length === 0) {
    return NextResponse.json({ ok: false, error: "Tidak ada data terparse", parsedCount: 0 }, { status: 422 });
  }

  if (mode === "replace") {
    await db.fakturPiutang.deleteMany({ where: { sumber: "paste_accurate" } });
  }

  // Bulk insert via createMany — performant untuk serverless
  let inserted = 0;
  let skippedDup = 0;
  const isPostgres = (process.env.DATABASE_URL || "").startsWith("postgres");
  const opts: any = {
    data: parsed.map(f => ({
      cabangId,
      pelanggan: f.party,
      noFaktur: f.noFaktur,
      tanggal: f.tanggal,
      jatuhTempo: f.jatuhTempo,
      jumlah: f.jumlah,
      dibayar: f.dibayar,
      nilai: f.sisa,
      sumber: "paste_accurate",
    })),
  };
  if (mode === "append" && isPostgres) opts.skipDuplicates = true;
  const result = await db.fakturPiutang.createMany(opts);
  inserted = result.count;
  skippedDup = parsed.length - result.count;

  return NextResponse.json({
    ok: true,
    mode,
    parsedCount: parsed.length,
    inserted, skippedDuplicates: skippedDup,
    sample: parsed.slice(0, 3),
  });
}
