import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/dashboard?cabangId=xxx — KPI agregat untuk dashboard
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cabangId = req.nextUrl.searchParams.get("cabangId") || (session.user as any).cabangId;
  const tahun = 2026; // hardcoded untuk fase awal; bisa parameter nanti

  if (!cabangId) {
    return NextResponse.json({ error: "cabang required" }, { status: 400 });
  }

  // Aggregate transactions by month (Jan-Dec)
  const allTxJual = await db.transaksiPenjualan.findMany({ where: { cabangId, tahun } });
  const allTxBeli = await db.transaksiPembelian.findMany({ where: { cabangId, tahun } });
  const piutangRows = await db.piutangBulan.findMany({ where: { cabangId, tahun } });
  const utangRows = await db.utangBulan.findMany({ where: { cabangId, tahun } });
  const fakturPiu = await db.fakturPiutang.findMany({ where: { cabangId } });
  const fakturHut = await db.fakturHutang.findMany({ where: { cabangId } });
  const masterBarangCount = await db.masterBarang.count({ where: { cabangId } });
  const masterSupplierCount = await db.masterSupplier.count({ where: { cabangId } });
  const masterPelangganCount = await db.masterPelanggan.count({ where: { cabangId } });

  // Monthly aggregates for chart
  const monthly: { bulan: number; jual: number; beli: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const jual = allTxJual.filter(t => t.bulan === m).reduce((s, t) => s + t.kuantitas * t.hargaSatuan, 0);
    const beli = allTxBeli.filter(t => t.bulan === m).reduce((s, t) => s + t.kuantitas * t.hargaSatuan, 0);
    monthly.push({ bulan: m, jual, beli });
  }
  const totJual = monthly.reduce((s, m) => s + m.jual, 0);
  const totBeli = monthly.reduce((s, m) => s + m.beli, 0);

  // Piutang/hutang saldo akhir (bulan terakhir dgn data)
  const saldoPiu = piutangRows.length ? piutangRows[piutangRows.length - 1] : null;
  const saldoHut = utangRows.length ? utangRows[utangRows.length - 1] : null;

  // Faktur belum lunas
  const totFakturPiu = fakturPiu.reduce((s, f) => s + f.nilai, 0);
  const totFakturHut = fakturHut.reduce((s, f) => s + f.nilai, 0);

  return NextResponse.json({
    cabangId,
    tahun,
    monthly,
    totals: {
      penjualanYTD: totJual,
      pembelianYTD: totBeli,
      piutangSaldoAkhir: saldoPiu?.saldoAwal || 0 + (saldoPiu?.penjualan || 0) - (saldoPiu?.pembayaran || 0),
      hutangSaldoAkhir: saldoHut?.saldoAwal || 0 + (saldoHut?.pembelian || 0) - (saldoHut?.pembayaran || 0),
      fakturPiutangBelumLunas: totFakturPiu,
      fakturHutangBelumLunas: totFakturHut,
      masterBarang: masterBarangCount,
      masterSupplier: masterSupplierCount,
      masterPelanggan: masterPelangganCount,
      transaksiPenjualanCount: allTxJual.length,
      transaksiPembelianCount: allTxBeli.length,
    },
  });
}
