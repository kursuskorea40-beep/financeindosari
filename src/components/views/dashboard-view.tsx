'use client';

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const BULAN_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

function fmtIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n || 0);
}

export function DashboardView({ cabangId }: { cabangId?: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", cabangId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard${cabangId ? `?cabangId=${cabangId}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-[#dc2626]">
          Gagal memuat dashboard. Coba refresh halaman.
        </CardContent>
      </Card>
    );
  }

  const totals = data.totals;
  const monthly = data.monthly;
  const maxJual = Math.max(...monthly.map((m: any) => m.jual), 1);
  const maxBeli = Math.max(...monthly.map((m: any) => m.beli), 1);
  const maxBar = Math.max(maxJual, maxBeli);

  return (
    <div className="space-y-5">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Penjualan YTD" value={`Rp ${fmtIDR(totals.penjualanYTD)}`} sub={`${totals.transaksiPenjualanCount} transaksi`} primary />
        <KpiCard label="Pembelian YTD" value={`Rp ${fmtIDR(totals.pembelianYTD)}`} sub={`${totals.transaksiPembelianCount} transaksi`} gold />
        <KpiCard label="Piutang Saldo Akhir" value={`Rp ${fmtIDR(totals.piutangSaldoAkhir)}`} sub={`Faktur belum lunas: Rp ${fmtIDR(totals.fakturPiutangBelumLunas)}`} danger />
        <KpiCard label="Hutang Saldo Akhir" value={`Rp ${fmtIDR(totals.hutangSaldoAkhir)}`} sub={`Faktur belum lunas: Rp ${fmtIDR(totals.fakturHutangBelumLunas)}`} danger />
      </div>

      {/* Master data summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-[#470A1D]">Master Data (Cabang Anda)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-[#F8F3EE] border border-[#EAE2DB] rounded-lg p-3">
              <div className="text-xs uppercase text-[#78716C]">Barang</div>
              <div className="text-2xl font-bold text-[#6D0F2B]">{totals.masterBarang}</div>
            </div>
            <div className="bg-[#F8F3EE] border border-[#EAE2DB] rounded-lg p-3">
              <div className="text-xs uppercase text-[#78716C]">Supplier</div>
              <div className="text-2xl font-bold text-[#6D0F2B]">{totals.masterSupplier}</div>
            </div>
            <div className="bg-[#F8F3EE] border border-[#EAE2DB] rounded-lg p-3">
              <div className="text-xs uppercase text-[#78716C]">Pelanggan</div>
              <div className="text-2xl font-bold text-[#6D0F2B]">{totals.masterPelanggan}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold text-[#470A1D]">Penjualan vs Pembelian per Bulan ({data.tahun})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1.5 h-64 px-2 py-2 bg-[#FAF6F2] rounded-lg border border-[#EAE2DB]">
            {monthly.map((m: any) => (
              <div key={m.bulan} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                <div className="flex items-end justify-center gap-0.5 h-56">
                  <div
                    className="bg-[#6D0F2B] rounded-t-sm transition-all min-h-[2px] w-full max-w-[14px]"
                    style={{ height: `${(m.jual / maxBar) * 100}%` }}
                    title={`Penjualan: Rp ${fmtIDR(m.jual)}`}
                  />
                  <div
                    className="bg-[#D4A72C] rounded-t-sm transition-all min-h-[2px] w-full max-w-[14px]"
                    style={{ height: `${(m.beli / maxBar) * 100}%` }}
                    title={`Pembelian: Rp ${fmtIDR(m.beli)}`}
                  />
                </div>
                <div className="text-[10px] text-[#78716C]">{BULAN_NAMES[m.bulan - 1]}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-3 text-xs text-[#78716C]">
            <span className="flex items-center gap-1.5">
              <span className="size-3 bg-[#6D0F2B] rounded-sm" /> Penjualan
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 bg-[#D4A72C] rounded-sm" /> Pembelian
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Status info */}
      <div className="text-xs text-[#78716C] flex items-center gap-2">
        <Badge variant="secondary" className="bg-[#FBE9EE] text-[#6D0F2B] border-[#F0CDD6]">
          {data.tahun}
        </Badge>
        <span>Cabang aktif: <b className="text-[#470A1D]">{data.cabangId}</b> · {monthly.filter((m: any) => m.jual > 0 || m.beli > 0).length} bulan ada data</span>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, primary, gold, danger }: { label: string; value: string; sub?: string; primary?: boolean; gold?: boolean; danger?: boolean }) {
  const cls = primary ? "bg-gradient-to-br from-[#6D0F2B] to-[#470A1D] text-white"
    : gold ? "bg-gradient-to-br from-[#D4A72C] to-[#8F6E12] text-white"
    : danger ? "border-2 border-[#dc2626] bg-white"
    : "bg-white border border-[#EAE2DB]";
  return (
    <div className={`rounded-lg p-4 shadow-sm ${cls}`}>
      <div className={`text-[10px] uppercase tracking-wider font-semibold ${primary || gold ? "text-white/80" : "text-[#78716C]"}`}>{label}</div>
      <div className="text-lg font-bold mt-1 font-mono tabular-nums">{value}</div>
      {sub && <div className={`text-[10px] mt-1 ${primary || gold ? "text-white/70" : "text-[#78716C]"}`}>{sub}</div>}
    </div>
  );
}
