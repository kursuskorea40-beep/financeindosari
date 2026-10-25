'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BULAN_NAMES_FULL, BULAN_NAMES_SHORT, fmtIDR } from "@/lib/accurate-parser";
import { FRRow, frTotalValue, fmtFRNum } from "@/lib/accurate-fr";

type ModuleType = "laba-rugi" | "neraca";

interface ApiResponse {
  cabangId: string;
  tahun: number;
  bulan: number;
  rows: FRRow[];
  hasEdit: boolean;
  isDefault: boolean;
}

export function FRView({ moduleType }: { moduleType: ModuleType }) {
  const { data: session } = useSession();
  const isLR = moduleType === "laba-rugi";
  const moduleName = isLR ? "Laba Rugi" : "Neraca";
  const moduleIcon = isLR ? "📈" : "⚖️";

  const now = new Date();
  const [bulan, setBulan] = useState<number>(now.getMonth() + 1);
  const [tahun, setTahun] = useState<number>(now.getFullYear());
  const [showPaste, setShowPaste] = useState(false);
  const [editing, setEditing] = useState<{ row: FRRow; idx: number } | null>(null);

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey: [moduleType, bulan, tahun, (session?.user as any)?.cabangId],
    queryFn: async () => {
      const res = await fetch(`/api/${moduleType}?bulan=${bulan}&tahun=${tahun}`);
      if (!res.ok) throw new Error(`Gagal load ${moduleType}`);
      return res.json();
    },
    enabled: !!(session?.user as any)?.cabangId,
  });

  const rows = data?.rows || [];
  const yearOptions = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1, now.getFullYear() + 2];

  // Compute totals
  const totals = useMemo(() => {
    const out: Record<string, number> = {};
    rows.forEach(r => {
      if (r.t === "total" && r.id && r.calc) {
        out[r.id] = frTotalValue(r, rows);
      }
    });
    return out;
  }, [rows]);

  // KPI for LR: Pendapatan, Laba Kotor, Pendapatan Op, Laba Bersih
  // KPI for Neraca: Aset, Kewajiban, Ekuitas, Seimbang check
  const kpis = isLR ? [
    { id: "jp", label: "Jumlah Pendapatan" },
    { id: "lk", label: "Laba Kotor" },
    { id: "po", label: "Pendapatan Operasional" },
    { id: "lb", label: "LABA BERSIH" },
  ] : [
    { id: "jas", label: "JUMLAH ASET" },
    { id: "jk", label: "JUMLAH KEWAJIBAN" },
    { id: "jek", label: "Jumlah Ekuitas" },
    { id: "jle", label: "JUMLAH LIAB+EKUITAS" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-[#57534E]">Bulan:</Label>
          <select value={bulan} onChange={(e) => setBulan(parseInt(e.target.value, 10))} className="h-8 px-2 text-xs border border-[#D6D3D1] rounded-md bg-white">
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
        {data?.hasEdit && (
          <ResetButton moduleType={moduleType} bulan={bulan} tahun={tahun} />
        )}
      </div>

      {/* KPI */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map((kpi, idx) => {
            const v = totals[kpi.id] ?? 0;
            const isSeimbang = !isLR && kpi.id === "jle";
            const seimbang = isSeimbang ? Math.abs((totals["jas"] || 0) - (totals["jle"] || 0)) < 0.01 : null;
            return (
              <div key={kpi.id} className={`rounded-lg p-3 shadow-sm ${idx === 0 ? "bg-gradient-to-br from-[#6D0F2B] to-[#470A1D] text-white" : idx === 1 ? "bg-gradient-to-br from-[#D4A72C] to-[#8F6E12] text-white" : "bg-white border border-[#EAE2DB]"}`}>
                <div className={`text-[10px] uppercase tracking-wider font-semibold ${idx < 2 ? "text-white/80" : "text-[#78716C]"}`}>{kpi.label}</div>
                <div className="text-lg font-bold mt-1 font-mono tabular-nums">{isSeimbang && seimbang !== null ? (seimbang ? "✓ Seimbang" : "✗ Tidak Seimbang") : `Rp ${fmtFRNum(v)}`}</div>
                <div className={`text-[10px] mt-0.5 ${idx < 2 ? "text-white/70" : "text-[#78716C]"}`}>{isLR ? "Per " + BULAN_NAMES_FULL[bulan - 1] + " " + tahun : "Per " + BULAN_NAMES_FULL[bulan - 1] + " " + tahun}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* FR table */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          <div className="p-3 border-b border-[#EAE2DB]">
            <h3 className="text-sm font-bold text-[#470A1D]">{moduleName} ({isLR ? "Laba/Rugi Standar" : "Neraca Standar"}) — {BULAN_NAMES_FULL[bulan - 1]} {tahun}</h3>
            <p className="text-xs text-[#78716C] mt-0.5">{isLR ? "Format Accurate Standar. Total (Jumlah/Laba) auto-hitung dari akun." : "Format Accurate Standar. Aset = Liabilitas + Ekuitas (harus seimbang)."} {data?.hasEdit ? "✓ Edit tersimpan." : "Belum ada data paste, default template."}</p>
          </div>
          {isLoading ? <Skeleton className="h-96" /> : (
            <table className="w-full text-xs">
              <thead className="bg-[#FBE9EE] text-[#6D0F2B] uppercase">
                <tr>
                  <th className="px-2 py-1.5 text-left">Nama Akun</th>
                  <th className="px-2 py-1.5 text-right w-40">Nilai (Rp)</th>
                  <th className="px-2 py-1.5 text-center w-16">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const pad = (r.lvl || 0) * 16;
                  if (r.t === "header") {
                    return (
                      <tr key={idx} className="bg-[#F8F3EE] border-t-2 border-[#EAE2DB]">
                        <td className="px-2 py-1.5 font-bold uppercase text-[10px] text-[#57534E]" style={{ paddingLeft: `${pad + 8}px` }}>{r.name}</td>
                        <td></td>
                        <td></td>
                      </tr>
                    );
                  }
                  if (r.t === "total") {
                    const v = totals[r.id || ""] ?? 0;
                    return (
                      <tr key={idx} className={`border-t border-[#EAE2DB] ${r.grand ? "bg-[#fef3c7] font-bold border-t-2 border-[#6D0F2B]" : "bg-[#FBE9EE] font-semibold"}`}>
                        <td className="px-2 py-1.5 text-[#470A1D]" style={{ paddingLeft: `${pad + 8}px` }}>{r.name}</td>
                        <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtFRNum(v)}</td>
                        <td></td>
                      </tr>
                    );
                  }
                  // item
                  return (
                    <tr key={idx} className="border-t border-[#EAE2DB] hover:bg-[#FBE9EE] group">
                      <td className="px-2 py-1.5" style={{ paddingLeft: `${pad + 8}px` }}>
                        {r.name}
                        {r.custom && <span className="ml-2 text-[10px] text-[#8A6A12] italic">(akun baru)</span>}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono tabular-nums">{fmtFRNum(r.v || 0)}</td>
                      <td className="px-2 py-1.5 text-center opacity-0 group-hover:opacity-100">
                        <button onClick={() => setEditing({ row: r, idx })} className="text-[#6D0F2B] hover:text-[#8A1A38] text-xs">✏️</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-[#78716C]">
        Format Paste: <b>"{isLR ? "Laba/Rugi (Standar)" : "Neraca (Standar)"}"</b> dari Accurate. Baris "Nama Akun + Angka" dipetakan ke template. Baris Jumlah/LABA (total) dilewati (auto-hitung). Akun tak dikenal ditambahkan ke bagian terdekat sebagai "(akun baru)". Format Indonesia (titik=ribuan, koma=desimal, kurung=negatif).
      </p>

      {editing && <EditFRAkunDialog moduleType={moduleType} bulan={bulan} tahun={tahun} row={editing.row} onClose={() => setEditing(null)} />}
      {showPaste && <PasteFRDialog moduleType={moduleType} bulan={bulan} tahun={tahun} onClose={() => setShowPaste(false)} />}
    </div>
  );
}

function ResetButton({ moduleType, bulan, tahun }: { moduleType: ModuleType; bulan: number; tahun: number }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/${moduleType}?bulan=${bulan}&tahun=${tahun}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal reset");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [moduleType] });
      toast.success(`${moduleType === "laba-rugi" ? "Laba Rugi" : "Neraca"} ${BULAN_NAMES_FULL[bulan - 1]} ${tahun} direset ke template default`);
    },
    onError: () => toast.error("Gagal reset"),
  });
  return (
    <Button size="sm" variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs h-8" onClick={() => {
      if (confirm(`Reset ${moduleType === "laba-rugi" ? "Laba Rugi" : "Neraca"} ${BULAN_NAMES_FULL[bulan - 1]} ${tahun} ke template default? Semua edit akan hilang.`)) mut.mutate();
    }}>
      ↺ Reset ke Default
    </Button>
  );
}

function EditFRAkunDialog({ moduleType, bulan, tahun, row, onClose }: {
  moduleType: ModuleType;
  bulan: number;
  tahun: number;
  row: FRRow;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [val, setVal] = useState(String(row.v || 0));
  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/${moduleType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bulan, tahun,
          akun: row.name,
          nilai: parseFloat(val) || 0,
          kategori: row.sc?.[0] || null,
          isCustom: row.custom || false,
        }),
      });
      if (!res.ok) throw new Error("Gagal simpan");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [moduleType] });
      toast.success(`Akun "${row.name}" diperbarui`);
      onClose();
    },
    onError: () => toast.error("Gagal menyimpan"),
  });
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#470A1D]">Edit Akun — {row.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-[#78716C]">{moduleType === "laba-rugi" ? "Laba Rugi" : "Neraca"} {BULAN_NAMES_FULL[bulan - 1]} {tahun}</div>
          <div className="space-y-1.5">
            <Label className="text-xs">Nilai (Rp)</Label>
            <Input type="number" step="0.01" value={val} onChange={(e) => setVal(e.target.value)} className="text-sm h-8" />
            <div className="text-[10px] text-[#78716C]">Gunakan negatif (-) untuk akun kontra (cth: Diskon Penjualan, Akumulasi Penyusutan).</div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Batal</Button>
          <Button size="sm" disabled={save.isPending} onClick={() => save.mutate()} className="bg-[#6D0F2B] hover:bg-[#8A1A38] text-white text-xs">
            {save.isPending ? "Menyimpan..." : "💾 Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasteFRDialog({ moduleType, bulan, tahun, onClose }: {
  moduleType: ModuleType;
  bulan: number;
  tahun: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isLR = moduleType === "laba-rugi";
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/${moduleType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode, bulan, tahun }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save gagal");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Sukses: ${data.savedCount} akun ${isLR ? "Laba Rugi" : "Neraca"} disimpan untuk ${BULAN_NAMES_FULL[bulan - 1]} ${tahun} (mode: ${data.mode}).`);
      qc.invalidateQueries({ queryKey: [moduleType] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });
  const placeholder = isLR
    ? `Contoh format:\n\nINDOSARI\nLaba/Rugi (Standar)\nDari 01 Sep 2026 s/d 30 Sep 2026\n\nPENDAPATAN\nPendapatan Operasional 174.512.860\nPenjualan 174.564.635\nDiskon Penjualan -51.775\nJumlah Pendapatan 174.512.860\nBEBAN POKOK PENJUALAN\nBeban Pokok Penjualan 140.157.857,07\nLABA KOTOR 34.355.002,93\nBEBAN OPERASIONAL\nBeban Gaji & Upah 21.000.000\nBeban Listrik 782.931\n...`
    : `Contoh format:\n\nINDOSARI\nNeraca (Standar)\nPer Tgl. 30 Sep 2026\n\nASET\nASET LANCAR\nKas dan Setara Kas\nKas & Bank 15.687.880,5\nKas Kecil 1.000.000\nKas Besar 14.468.580,5\nBank 280.000\nSelisih kas & Bank -60.700\nJumlah Kas dan Setara Kas 15.687.880,5\nPiutang Usaha 36.769.260\n...`;
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-[#470A1D]">📋 Paste dari Accurate — {isLR ? "Laba Rugi" : "Neraca"} {BULAN_NAMES_FULL[bulan - 1]} {tahun}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-[#FBE9EE] border border-[#F0CDD6] rounded-lg p-3 text-xs text-[#6D0F2B]">
            <p className="font-medium mb-1">Cara pakai:</p>
            <ol className="list-decimal ml-5 space-y-0.5">
              <li>Buka laporan <b>"{isLR ? "Laba/Rugi (Standar)" : "Neraca (Standar)"}"</b> di Accurate untuk periode {BULAN_NAMES_FULL[bulan - 1]} {tahun}</li>
              <li>Export ke PDF → buka PDF → <b>Ctrl+A</b> → <b>Ctrl+C</b></li>
              <li>Paste ke textarea, pilih mode, klik Simpan</li>
            </ol>
            <p className="mt-2 text-amber-700"><b>Tips:</b> Baris "Jumlah ..."/"LABA ..." (total) tidak perlu dipaste — semuanya auto-hitung ulang dari akun. Akun tak dikenal otomatis ditambahkan ke bagian terdekat.</p>
          </div>
          <div>
            <Label className="text-xs">Paste teks laporan Accurate:</Label>
            <textarea rows={12} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="w-full mt-1 px-3 py-2 border border-[#D6D3D1] rounded-md text-xs font-mono" />
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs">Mode:</Label>
            <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="h-8 px-2 text-xs border border-[#D6D3D1] rounded-md bg-white">
              <option value="replace">Replace (ganti semua akun di {BULAN_NAMES_FULL[bulan - 1]} {tahun})</option>
              <option value="append">Append (gabung, update akun yg sudah ada)</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Batal</Button>
          <Button size="sm" disabled={save.isPending || !text.trim()} onClick={() => {
            if (!confirm(`Simpan ${isLR ? "Laba Rugi" : "Neraca"} ${BULAN_NAMES_FULL[bulan - 1]} ${tahun} mode ${mode}?`)) return;
            save.mutate();
          }} className="bg-[#6D0F2B] hover:bg-[#8A1A38] text-white text-xs">
            {save.isPending ? "Menyimpan..." : "💾 Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

void fmtIDR;
