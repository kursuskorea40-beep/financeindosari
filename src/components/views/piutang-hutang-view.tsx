'use client';

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BULAN_NAMES_FULL, BULAN_NAMES_SHORT, fmtIDR, fmtDateID } from "@/lib/accurate-parser";

type ModuleType = "piutang" | "hutang";

interface SaldoRow {
  bulan: number;
  saldoAwal: number;
  penjualan?: number;
  pembelian?: number;
  pembayaran: number;
  penyesuaian?: number;
  penyesuaianAwal?: number;
  saldoAkhir: number;
}

interface FakturItem {
  id: string;
  party?: string;
  pelanggan?: string;
  supplier?: string;
  noFaktur: string;
  tanggal: string | null;
  jatuhTempo: string | null;
  nilai: number;
  jumlah: number;
  dibayar: number;
  sumber: string;
  st: { umur: number; status: "TERLEWAT" | "BERJALAN" };
}

interface Summary {
  saldoAkhirYTD: number;
  penjualanYTD?: number;
  pembelianYTD?: number;
  pembayaranYTD: number;
  fakturBelumLunas: number;
  fakturTerlewat: number;
}

interface ApiResponse {
  cabangId: string;
  tahun: number;
  bulan: number;
  saldoBulanan: SaldoRow[];
  faktur: FakturItem[];
  summary: Summary;
}

export function PiutangHutangView({ moduleType }: { moduleType: ModuleType }) {
  const { data: session } = useSession();
  const isPiu = moduleType === "piutang";
  const moduleName = isPiu ? "Piutang" : "Hutang";
  const moduleIcon = isPiu ? "💰" : "💸";
  const partnerLabel = isPiu ? "Pelanggan" : "Supplier";
  const partnerField = isPiu ? "pelanggan" : "supplier";

  const now = new Date();
  const [bulan, setBulan] = useState<number>(0); // 0 = YTD
  const [tahun, setTahun] = useState<number>(now.getFullYear());
  const [showPaste, setShowPaste] = useState(false);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: [moduleType, bulan, tahun, (session?.user as any)?.cabangId],
    queryFn: async () => {
      const res = await fetch(`/api/${moduleType}?bulan=${bulan}&tahun=${tahun}`);
      if (!res.ok) throw new Error(`Gagal load ${moduleType}`);
      return res.json();
    },
    enabled: !!(session?.user as any)?.cabangId,
  });

  const saldoBulanan = data?.saldoBulanan || [];
  const faktur = data?.faktur || [];
  const summary = data?.summary;
  const yearOptions = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2];
  const isPerMonth = bulan > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-[#57534E]">Bulan:</Label>
          <select value={bulan} onChange={(e) => setBulan(parseInt(e.target.value, 10))} className="h-8 px-2 text-xs border border-[#D6D3D1] rounded-md bg-white">
            <option value={0}>📊 Semua Bulan (YTD)</option>
            {BULAN_NAMES_FULL.map((b, i) => <option key={i} value={i + 1}>{b} {tahun}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-[#57534E]">Tahun:</Label>
          <select value={tahun} onChange={(e) => setTahun(parseInt(e.target.value, 10))} className="h-8 px-2 text-xs border border-[#D6D3D1] rounded-md bg-white">
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <Button size="sm" variant="outline" className="border-[#E0AEBB] bg-[#FBE9EE] text-[#8A1A38] hover:bg-[#F5D9E0] text-xs h-8 ml-auto" onClick={() => setShowPaste(true)}>
          📋 Paste dari Accurate
        </Button>
      </div>

      {/* KPI */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label={`${moduleName} Saldo Akhir ${isPerMonth ? BULAN_NAMES_SHORT[bulan - 1] : "YTD"}`} value={`Rp ${fmtIDR(isPerMonth ? (saldoBulanan[bulan - 1]?.saldoAkhir || 0) : summary.saldoAkhirYTD)}`} sub={isPerMonth ? `Bulan ${BULAN_NAMES_FULL[bulan - 1]}` : "Per Desember"} primary />
          <Kpi label={`${isPiu ? "Penjualan Kredit" : "Pembelian Kredit"} ${isPerMonth ? BULAN_NAMES_SHORT[bulan - 1] : "YTD"}`} value={`Rp ${fmtIDR(isPerMonth ? (isPiu ? saldoBulanan[bulan - 1]?.penjualan || 0 : saldoBulanan[bulan - 1]?.pembelian || 0) : (isPiu ? summary.penjualanYTD || 0 : summary.pembelianYTD || 0))}`} sub={isPerMonth ? "Bulan ini" : "YTD"} gold />
          <Kpi label={`Pembayaran ${isPerMonth ? BULAN_NAMES_SHORT[bulan - 1] : "YTD"}`} value={`Rp ${fmtIDR(isPerMonth ? (saldoBulanan[bulan - 1]?.pembayaran || 0) : summary.pembayaranYTD)}`} sub={isPiu ? "Pelunasan pelanggan" : "Pelunasan ke supplier"} />
          <Kpi label={`Faktur ${isPerMonth ? "Jatuh Tempo Bulan Ini" : "Belum Lunas"}`} value={`Rp ${fmtIDR(summary.fakturBelumLunas)}`} sub={`${faktur.length} faktur · ${summary.fakturTerlewat} terlewat`} danger />
        </div>
      )}

      {/* Saldo bulanan table */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          <div className="p-3 border-b border-[#EAE2DB]">
            <h3 className="text-sm font-bold text-[#470A1D]">{moduleName} Usaha per Bulan {isPerMonth && <span className="text-[#6D0F2B] text-xs font-medium ml-2">· bulan {BULAN_NAMES_FULL[bulan - 1]} disorot</span>}</h3>
            <p className="text-xs text-[#78716C] mt-0.5">Saldo Akhir = Saldo Awal + {isPiu ? "Penjualan" : "Pembelian"} − Pembayaran (auto).</p>
          </div>
          {isLoading ? <Skeleton className="h-48" /> : (
            <table className="w-full text-xs">
              <thead className="bg-[#FBE9EE] text-[#6D0F2B] uppercase">
                <tr>
                  <th className="px-2 py-1.5 text-left">Bulan</th>
                  <th className="px-2 py-1.5 text-right">Saldo Awal</th>
                  {isPiu ? <th className="px-2 py-1.5 text-right">Penjualan (Kredit)</th> : <th className="px-2 py-1.5 text-right">Pembelian</th>}
                  <th className="px-2 py-1.5 text-right">Pembayaran</th>
                  {!isPiu && <th className="px-2 py-1.5 text-right">Penyesuaian Awal</th>}
                  {isPiu && <th className="px-2 py-1.5 text-right">Penyesuaian</th>}
                  <th className="px-2 py-1.5 text-right">Saldo Akhir</th>
                </tr>
              </thead>
              <tbody>
                {saldoBulanan.map(r => (
                  <tr key={r.bulan} className={`border-t border-[#EAE2DB] hover:bg-[#FBE9EE] ${isPerMonth && r.bulan === bulan ? "bg-[#fef3c7]" : ""}`}>
                    <td className="px-2 py-1 font-medium">{BULAN_NAMES_FULL[r.bulan - 1]}</td>
                    <td className="px-2 py-1 text-right font-mono">{fmtIDR(r.saldoAwal)}</td>
                    {isPiu ? <td className="px-2 py-1 text-right font-mono">{fmtIDR(r.penjualan || 0)}</td> : <td className="px-2 py-1 text-right font-mono">{fmtIDR(r.pembelian || 0)}</td>}
                    <td className="px-2 py-1 text-right font-mono">{fmtIDR(r.pembayaran)}</td>
                    {!isPiu && <td className="px-2 py-1 text-right font-mono">{fmtIDR(r.penyesuaianAwal || 0)}</td>}
                    {isPiu && <td className="px-2 py-1 text-right font-mono">{fmtIDR(r.penyesuaian || 0)}</td>}
                    <td className="px-2 py-1 text-right font-mono font-medium text-[#6D0F2B]">{fmtIDR(r.saldoAkhir)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Faktur table */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          <div className="p-3 border-b border-[#EAE2DB] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#470A1D]">Faktur {moduleName} Belum Lunas {isPerMonth && <span className="text-[#6D0F2B] text-xs font-medium ml-2">· jatuh tempo di {BULAN_NAMES_FULL[bulan - 1]} {tahun}</span>}</h3>
              <p className="text-xs text-[#78716C] mt-0.5">Sumber: paste "{isPiu ? "Daftar Piutang Usaha" : "Daftar Utang Usaha"}" Accurate. NILAI = sisa belum dibayar. Umur & status dihitung otomatis dari jatuh tempo vs hari ini.</p>
            </div>
          </div>
          {isLoading ? <Skeleton className="h-48" /> : faktur.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#78716C]">
              <div className="text-2xl mb-2">{moduleIcon}</div>
              <p>{isPerMonth ? `Tidak ada faktur ${moduleName} dengan jatuh tempo di ${BULAN_NAMES_FULL[bulan - 1]} ${tahun}.` : `Belum ada data faktur ${moduleName}.`}</p>
              <p className="mt-1">Klik <b>📋 Paste dari Accurate</b> lalu paste laporan <b>"{isPiu ? "Daftar Piutang Usaha" : "Daftar Utang Usaha"}"</b>.</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[#FBE9EE] text-[#6D0F2B] uppercase">
                <tr>
                  <th className="px-2 py-1.5 text-left w-10">No</th>
                  <th className="px-2 py-1.5 text-left">{partnerLabel}</th>
                  <th className="px-2 py-1.5 text-left">No. Faktur</th>
                  <th className="px-2 py-1.5 text-center">Tanggal</th>
                  <th className="px-2 py-1.5 text-center">Jatuh Tempo</th>
                  <th className="px-2 py-1.5 text-right">Umur (hr)</th>
                  <th className="px-2 py-1.5 text-right">Nilai</th>
                  <th className="px-2 py-1.5 text-center">Status</th>
                  <th className="px-2 py-1.5 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {faktur.map((f, idx) => (
                  <tr key={f.id} className="border-t border-[#EAE2DB] hover:bg-[#FBE9EE]">
                    <td className="px-2 py-1 text-center text-[#78716C]">{idx + 1}</td>
                    <td className="px-2 py-1">{(f as any)[partnerField] || f.party || "-"}</td>
                    <td className="px-2 py-1 font-mono">{f.noFaktur}</td>
                    <td className="px-2 py-1 text-center">{fmtDateID(f.tanggal)}</td>
                    <td className="px-2 py-1 text-center">{fmtDateID(f.jatuhTempo)}</td>
                    <td className="px-2 py-1 text-right font-mono">{f.st.umur}</td>
                    <td className="px-2 py-1 text-right font-mono font-medium text-[#6D0F2B]">Rp {fmtIDR(f.nilai)}</td>
                    <td className="px-2 py-1 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] border ${f.st.status === "TERLEWAT" ? "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]" : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"}`}>{f.st.status}</span>
                    </td>
                    <td className="px-2 py-1 text-center">
                      <DeleteFakturButton id={f.id} moduleType={moduleType} />
                    </td>
                  </tr>
                ))}
              </tbody>
              {summary && (
                <tfoot>
                  <tr className="border-t-2 border-[#6D0F2B] bg-[#F8F3EE] font-bold">
                    <td colSpan={6} className="px-2 py-1.5 text-right">TOTAL ({faktur.length} faktur · {summary.fakturTerlewat} terlewat):</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#6D0F2B]">Rp {fmtIDR(summary.fakturBelumLunas)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-[#78716C]">
        Format Paste: <b>"{isPiu ? "Daftar Piutang Usaha" : "Daftar Utang Usaha"}"</b> dari Accurate. Setiap blok diawali nama {partnerLabel.toLowerCase()}, lalu baris faktur: No. Faktur + Tanggal + Jatuh Tempo + Jumlah / Dibayar / Sisa. Yang disimpan = SISA (nilai belum dibayar). Umur & status TERLEWAT/BERJALAN dihitung otomatis.
      </p>

      {showPaste && <PastePiutangHutangDialog moduleType={moduleType} onClose={() => setShowPaste(false)} />}
    </div>
  );
}

function Kpi({ label, value, sub, primary, gold, danger }: { label: string; value: string; sub?: string; primary?: boolean; gold?: boolean; danger?: boolean }) {
  const cls = primary ? "bg-gradient-to-br from-[#6D0F2B] to-[#470A1D] text-white"
    : gold ? "bg-gradient-to-br from-[#D4A72C] to-[#8F6E12] text-white"
    : danger ? "border-2 border-[#dc2626] bg-white"
    : "bg-white border border-[#EAE2DB]";
  return (
    <div className={`rounded-lg p-3 shadow-sm ${cls}`}>
      <div className={`text-[10px] uppercase tracking-wider font-semibold ${primary || gold ? "text-white/80" : "text-[#78716C]"}`}>{label}</div>
      <div className="text-lg font-bold mt-1 font-mono tabular-nums">{value}</div>
      {sub && <div className={`text-[10px] mt-0.5 ${primary || gold ? "text-white/70" : "text-[#78716C]"}`}>{sub}</div>}
    </div>
  );
}

function DeleteFakturButton({ id, moduleType }: { id: string; moduleType: ModuleType }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/${moduleType}?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [moduleType] });
      toast.success("Faktur dihapus");
    },
    onError: () => toast.error("Gagal menghapus"),
  });
  return (
    <button className="text-[#dc2626] hover:text-[#b91c1c] text-xs" onClick={() => { if (confirm("Hapus faktur ini?")) mut.mutate(); }}>🗑️</button>
  );
}

function PastePiutangHutangDialog({ moduleType, onClose }: { moduleType: ModuleType; onClose: () => void }) {
  const qc = useQueryClient();
  const isPiu = moduleType === "piutang";
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/${moduleType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save gagal");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Sukses: ${data.inserted} faktur ${isPiu ? "Piutang" : "Hutang"} disisipkan (mode: ${data.mode}).`);
      qc.invalidateQueries({ queryKey: [moduleType] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const placeholder = isPiu
    ? `Contoh format:\n\nINDOSARI\nDaftar Piutang Usaha\nPer Tgl. 30 Sep 2026\n\nTOKO MAKMUR SEJAHTERA\nSI.2026.08.00012  15 Aug 2026  14 Sep 2026  12.500.000  0  12.500.000\nSI.2026.09.00031  05 Sep 2026  05 Okt 2026  8.750.000  0  8.750.000\n\nCV SINAR JAYA\nSI.2026.07.00004  20 Jul 2026  19 Aug 2026  21.250.000  5.000.000  16.250.000\n...`
    : `Contoh format:\n\nINDOSARI\nDaftar Utang Usaha\nPer Tgl. 30 Sep 2026\n\nBINTANG TIMUR MITRA ABADI, PT\nPI.2026.08.000146  24 Aug 2026  23 Sep 2026  8.108.108,11  0  8.108.108,11\nPI.2026.09.000162  16 Sep 2026  16 Okt 2026  8.108.108,11  0  8.108.108,11\n\nBIRAN\nPI.2026.08.000145  22 Aug 2026  21 Sep 2026  550.000  0  550.000\n...`;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-[#470A1D]">📋 Paste dari Accurate — {isPiu ? "Piutang" : "Hutang"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-[#FBE9EE] border border-[#F0CDD6] rounded-lg p-3 text-xs text-[#6D0F2B]">
            <p className="font-medium mb-1">Cara pakai:</p>
            <ol className="list-decimal ml-5 space-y-0.5">
              <li>Buka laporan <b>"{isPiu ? "Daftar Piutang Usaha" : "Daftar Utang Usaha"}"</b> di Accurate</li>
              <li>Export ke PDF → buka PDF → <b>Ctrl+A</b> → <b>Ctrl+C</b> (atau copy dari preview)</li>
              <li>Paste ke textarea di bawah, pilih mode, klik Simpan</li>
            </ol>
          </div>
          <div>
            <Label className="text-xs">Paste teks laporan Accurate:</Label>
            <textarea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="w-full mt-1 px-3 py-2 border border-[#D6D3D1] rounded-md text-xs font-mono" />
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs">Mode:</Label>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="h-8 px-2 text-xs border border-[#D6D3D1] rounded-md bg-white">
              <option value="replace">Replace (ganti semua faktur hasil paste)</option>
              <option value="append">Append (gabung, skip duplikat No. Faktur)</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Batal</Button>
          <Button size="sm" disabled={save.isPending || !text.trim()} onClick={() => {
            if (!confirm(`Simpan ${isPiu ? "Piutang" : "Hutang"} mode ${mode}?`)) return;
            save.mutate();
          }} className="bg-[#6D0F2B] hover:bg-[#8A1A38] text-white text-xs">
            {save.isPending ? "Menyimpan..." : "💾 Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
