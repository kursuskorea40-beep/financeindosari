import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const cabangId = req.nextUrl.searchParams.get("cabangId") || (session.user as any).cabangId;
  const tahun = parseInt(req.nextUrl.searchParams.get("tahun") || "") || 2026;
  const mode = req.nextUrl.searchParams.get("mode") === "bulanan" ? "bulanan" : "tahunan";
  const bulan = parseInt(req.nextUrl.searchParams.get("bulan") || "") || 1;
  if (!cabangId) return NextResponse.json({ error: "cabang required" }, { status: 400 });

  const allTxJual = await db.transaksiPenjualan.findMany({ where: { tahun } });
  const allTxBeli = await db.transaksiPembelian.findMany({ where: { tahun } });
  const fakturPiu = await db.fakturPiutang.findMany({ where: {} });
  const fakturHut = await db.fakturHutang.findMany({ where: {} });
  const mBC = await db.masterBarang.count({ where: {} });
  const mSC = await db.masterSupplier.count({ where: {} });
  const mPC = await db.masterPelanggan.count({ where: {} });

  const monthly: { bulan: number; jual: number; beli: number }[] = [];
  for (let m = 1; m <= 12; m++) {
    const jual = allTxJual.filter(t => t.bulan === m).reduce((s, t) => s + t.kuantitas * t.hargaSatuan, 0);
    const beli = allTxBeli.filter(t => t.bulan === m).reduce((s, t) => s + t.kuantitas * t.hargaSatuan, 0);
    monthly.push({ bulan: m, jual, beli });
  }

  let series: { label: string; penjualan: number; pembelian: number }[];
  if (mode === "tahunan") {
    const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
    series = months.map((label, i) => ({ label, penjualan: monthly[i].jual, pembelian: monthly[i].beli }));
  } else {
    const txJB = allTxJual.filter(t => t.bulan === bulan);
    const txBB = allTxBeli.filter(t => t.bulan === bulan);
    series = [{label:"Minggu 1",penjualan:0,pembelian:0},{label:"Minggu 2",penjualan:0,pembelian:0},{label:"Minggu 3",penjualan:0,pembelian:0},{label:"Minggu 4",penjualan:0,pembelian:0}];
    txJB.forEach(p => { const w = Math.min(Math.floor((new Date(p.tanggal).getDate()-1)/7),3); series[w].penjualan += p.kuantitas*p.hargaSatuan; });
    txBB.forEach(p => { const w = Math.min(Math.floor((new Date(p.tanggal).getDate()-1)/7),3); series[w].pembelian += p.kuantitas*p.hargaSatuan; });
  }

  const txJ = mode === "tahunan" ? allTxJual : allTxJual.filter(t => t.bulan === bulan);
  const txB = mode === "tahunan" ? allTxBeli : allTxBeli.filter(t => t.bulan === bulan);
  const totJ = txJ.reduce((s,t) => s+t.kuantitas*t.hargaSatuan, 0);
  const totB = txB.reduce((s,t) => s+t.kuantitas*t.hargaSatuan, 0);
  const pK = txB.filter(t => !t.isLunas).reduce((s,t) => s+t.kuantitas*t.hargaSatuan, 0);
  const jK = txJ.filter(t => t.kategori === "NOTA BESAR").reduce((s,t) => s+t.kuantitas*t.hargaSatuan, 0);
  const tFP = fakturPiu.reduce((s,f) => s+f.nilai, 0);
  const tFH = fakturHut.reduce((s,f) => s+f.nilai, 0);

  const cM = new Map<string,number>(); fakturPiu.forEach(f => { const n=f.pelanggan||"Unknown"; cM.set(n,(cM.get(n)||0)+f.nilai); });
  const tC = Array.from(cM.entries()).map(([nama,total])=>({nama,total})).sort((a,b)=>b.total-a.total).slice(0,5);
  const sM = new Map<string,number>(); fakturHut.forEach(f => { const n=f.supplier||"Unknown"; sM.set(n,(sM.get(n)||0)+f.nilai); });
  const tS = Array.from(sM.entries()).map(([nama,total])=>({nama,total})).sort((a,b)=>b.total-a.total).slice(0,5);
  const pM = new Map<string,number>(); txJ.forEach(t => { const n=t.namaBarang||"Unknown"; pM.set(n,(pM.get(n)||0)+t.kuantitas*t.hargaSatuan); });
  const tP = Array.from(pM.entries()).map(([nama,total])=>({nama,total})).sort((a,b)=>b.total-a.total).slice(0,5);

  return NextResponse.json({ cabangId, tahun, mode, bulan, monthly, series, topCustomers:tC, topSuppliers:tS, topProducts:tP, totals: {
    penjualanYTD:totJ, pembelianYTD:totB, labaBersih:totJ-totB,
    piutangSaldoAkhir:Math.max(tFP,jK), hutangSaldoAkhir:Math.max(tFH,pK),
    penjualanKredit:jK, pembelianKredit:pK, fakturPiutangBelumLunas:tFP, fakturHutangBelumLunas:tFH,
    masterBarang:mBC, masterSupplier:mSC, masterPelanggan:mPC,
    transaksiPenjualanCount:txJ.length, transaksiPembelianCount:txB.length,
  }});
}
