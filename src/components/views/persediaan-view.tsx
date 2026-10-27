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
import { BULAN_NAMES_FULL, fmtIDR } from "@/lib/accurate-parser";

interface PersediaanItem {
  id: string;
  kode: string;
  nama: string;
  satuan: string | null;
  awalQty: number;
  awalNilai: number;
  masukQty: number;
  masukNilai: number;
  keluarQty: number;
  keluarNilai: number;
}

interface Summary {
  count: number;
  totAwal: number;
  totMasuk: number;
  totKeluar: number;
  totAkhir: number;
}

interface ApiResponse {
  bulan: number;
  tahun: number;
  items: PersediaanItem[];
  summary: Summary;
}

export function PersediaanView({ cabangId }: { cabangId?: string }) {
  const { data: session } = useSession();
  const now = new Date();
  const [bulan, setBulan] = useState<number>(now.getMonth() + 1);
  const [tahun, setTahun] = useState<number>(now.getFullYear());
  const [showPaste, setShowPaste] = useState(false);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: ["persediaan", bulan, tahun, cabangId],
    queryFn: async () => {
      const res = await fetch(`/api/persediaan?bulan=${bulan}&tahun=${tahun}`);
      if (!res.ok) throw new Error("Gagal load persediaan");
      return res.json();
    },
    enabled: !!cabangId,
  });

  const items = data?.items || [];
  const summary = data?.summary;
  const yearOptions = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2];

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

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="Saldo Awal" value={`Rp ${fmtIDR(summary.totAwal)}`} sub={`${summary.count} item`} primary />
          <Kpi label="Penerimaan" value={`Rp ${fmtIDR(summary.totMasuk)}`} sub="Mutasi masuk" gold />
          <Kpi label="Pengeluaran" value={`Rp ${fmtIDR(summary.totKeluar)}`} sub="Mutasi keluar" />
          <Kpi label="Saldo Akhir" value={`Rp ${fmtIDR(summary.totAkhir)}`} sub="Auto (Awal + Masuk - Keluar)" danger />
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#78716C]">
              <div className="text-2xl mb-2">📦</div>
              <p>Belum ada data persediaan untuk <b>{bulan === 0 ? "YTD" : BULAN_NAMES_FULL[bulan - 1]} {tahun}</b>.</p>
              <p className="mt-1">Klik <b>📋 Paste dari Accurate</b> untuk paste laporan <b>"Daftar Nilai Persediaan"</b> atau <b>"Laporan Persediaan Bulanan"</b>.</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[#FBE9EE] text-[#6D0F2B] uppercase">
                <tr>
                  <th className="px-2 py-1.5 text-left w-10">No</th>
                  <th className="px-2 py-1.5 text-left w-24">Kode</th>
                  <th className="px-2 py-1.5 text-left">Nama Barang</th>
                  <th className="px-2 py-1.5 text-center w-14">Sat</th>
                  <th className="px-2 py-1.5 text-right">Awal Qty</th>
                  <th className="px-2 py-1.5 text-right">Awal Nilai</th>
                  <th className="px-2 py-1.5 text-right">Masuk Qty</th>
                  <th className="px-2 py-1.5 text-right">Masuk Nilai</th>
                  <th className="px-2 py-1.5 text-right">Keluar Qty</th>
                  <th className="px-2 py-1.5 text-right">Keluar Nilai</th>
                  <th className="px-2 py-1.5 text-right">Akhir Qty</th>
                  <th className="px-2 py-1.5 text-right">Akhir Nilai</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const akhirQty = it.awalQty + it.masukQty - it.keluarQty;
                  const akhirNilai = it.awalNilai + it.masukNilai - it.keluarNilai;
                  return (
                    <tr key={it.id} className="border-t border-[#EAE2DB] hover:bg-[#FBE9EE]">
                      <td className="px-2 py-1 text-center text-[#78716C]">{idx + 1}</td>
                      <td className="px-2 py-1 font-mono">{it.kode}</td>
                      <td className="px-2 py-1">{it.nama}</td>
                      <td className="px-2 py-1 text-center">{it.satuan || "-"}</td>
                      <td className="px-2 py-1 text-right font-mono">{it.awalQty}</td>
                      <td className="px-2 py-1 text-right font-mono">{fmtIDR(it.awalNilai)}</td>
                      <td className="px-2 py-1 text-right font-mono">{it.masukQty}</td>
                      <td className="px-2 py-1 text-right font-mono">{fmtIDR(it.masukNilai)}</td>
                      <td className="px-2 py-1 text-right font-mono">{it.keluarQty}</td>
                      <td className="px-2 py-1 text-right font-mono">{fmtIDR(it.keluarNilai)}</td>
                      <td className="px-2 py-1 text-right font-mono font-medium">{akhirQty}</td>
                      <td className="px-2 py-1 text-right font-mono font-medium text-[#6D0F2B]">{fmtIDR(akhirNilai)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {summary && (
                <tfoot>
                  <tr className="border-t-2 border-[#6D0F2B] bg-[#F8F3EE] font-bold">
                    <td colSpan={4} className="px-2 py-1.5 text-right">TOTAL ({summary.count} item):</td>
                    <td className="px-2 py-1.5 text-right font-mono">-</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#6D0F2B]">Rp {fmtIDR(summary.totAwal)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">-</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#6D0F2B]">Rp {fmtIDR(summary.totMasuk)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">-</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#6D0F2B]">Rp {fmtIDR(summary.totKeluar)}</td>
                    <td className="px-2 py-1.5 text-right font-mono">-</td>
                    <td className="px-2 py-1.5 text-right font-mono text-[#6D0F2B]">Rp {fmtIDR(summary.totAkhir)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-[#78716C]">
        Format Paste: <b>"Daftar Nilai Persediaan"</b> (snapshot 2 kolom: Kode + Nama + Satuan + Qty + Nilai) atau <b>"Laporan Persediaan Bulanan"</b> (mutasi 6 kolom: Kode + Nama + Satuan + Awal Qty/Nilai + Masuk Qty/Nilai + Keluar Qty/Nilai). Parser auto-detect header + format Indonesia (koma=desimal, titik=ribuan). Nama item yang wrap ke baris kedua otomatis digabung.
      </p>

      {showPaste && <PastePersediaanDialog bulan={bulan} tahun={tahun} onClose={() => setShowPaste(false)} />}
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

function PastePersediaanDialog({ bulan, tahun, onClose }: { bulan: number; tahun: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/persediaan/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode, bulan, tahun, cabangId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save gagal");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Sukses: ${data.inserted + data.updated} item diproses (mode: ${mode}). ${data.parsedCount} parsed.`);
      qc.invalidateQueries({ queryKey: ["persediaan"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const placeholder = `Contoh format:\n\nKODE      NAMA BARANG                       SATUAN   AWAL QTY   AWAL NILAI   MASUK QTY   MASUK NILAI   KELUAR QTY   KELUAR NILAI\nA00002    ALKOHOL                           Ltr      157,25     6.374.998    200          8.108.108     166,25      6.739.863\nA00010    BENZOAT RRC / SODIUM BENZOAT     Kg       59         1.771.112    1.100        38.162.500    1.076,5     37.260.308\n\nAtau format sederhana (Daftar Nilai Persediaan):\n\nKODE      NAMA BARANG                       SATUAN   QTY        NILAI\nA00002    ALKOHOL                           Ltr      191         7.743.242\nA00010    BENZOAT RRC / SODIUM BENZOAT     Kg       82,5        2.673.303`;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-[#470A1D]">📋 Paste dari Accurate — Persediaan {BULAN_NAMES_FULL[bulan - 1]} {tahun}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-[#FBE9EE] border border-[#F0CDD6] rounded-lg p-3 text-xs text-[#6D0F2B]">
            <p className="font-medium mb-1">Cara pakai:</p>
            <ol className="list-decimal ml-5 space-y-0.5">
              <li>Buka laporan <b>"Daftar Nilai Persediaan"</b> atau <b>"Laporan Persediaan Bulanan"</b> di Accurate</li>
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
              <option value="replace">Replace (ganti semua di bulan {BULAN_NAMES_FULL[bulan - 1]} {tahun})</option>
              <option value="append">Append (gabung, skip duplikat per kode)</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Batal</Button>
          <Button size="sm" disabled={save.isPending || !text.trim()} onClick={() => {
            if (!confirm(`Simpan Persediaan ${BULAN_NAMES_FULL[bulan - 1]} ${tahun} mode ${mode}?`)) return;
            save.mutate();
          }} className="bg-[#6D0F2B] hover:bg-[#8A1A38] text-white text-xs">
            {save.isPending ? "Menyimpan..." : "💾 Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
