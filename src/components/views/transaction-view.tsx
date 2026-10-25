'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BULAN_NAMES_FULL,
  BULAN_NAMES_SHORT,
  fmtIDR,
  fmtDateID,
} from "@/lib/accurate-parser";

type ModuleType = "penjualan" | "pembelian";

interface TransaksiItem {
  id: string;
  tanggal: string;
  noNota: string | null;
  namaBarang: string;
  satuan: string | null;
  kuantitas: number;
  hargaSatuan: number;
  kategori?: string; // penjualan: NOTA BESAR | NOTA KECIL
  isLunas?: boolean; // pembelian
  jatuhTempo?: string | null;
  keterangan?: string | null;
}

interface SummaryData {
  count: number;
  total: number;
  tunai: number;
  kredit: number;
  pctTunai: number;
}

interface ApiResponse {
  bulan: number;
  tahun: number;
  items: TransaksiItem[];
  summary: SummaryData;
}

interface Props {
  moduleType: ModuleType;
}

export function TransactionView({ moduleType }: Props) {
  const { data: session } = useSession();
  const isJual = moduleType === "penjualan";
  const moduleName = isJual ? "Penjualan" : "Pembelian";
  const moduleIcon = isJual ? "💵" : "🛒";
  const cabangId = (session?.user as any)?.cabangId;

  // Filter state
  const now = new Date();
  const [bulan, setBulan] = useState<number>(now.getMonth() + 1);
  const [tahun, setTahun] = useState<number>(now.getFullYear());
  const [search, setSearch] = useState("");

  // Modal state
  const [editing, setEditing] = useState<TransaksiItem | null | undefined>(undefined);
  const [showPaste, setShowPaste] = useState(false);

  const queryKey = ["transaksi", moduleType, cabangId, bulan, tahun, search];

  const { data, isLoading } = useQuery<ApiResponse>({
    queryKey,
    queryFn: async () => {
      const url = `/api/${moduleType}?bulan=${bulan}&tahun=${tahun}${search ? `&q=${encodeURIComponent(search)}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Gagal load ${moduleType}`);
      return res.json();
    },
    enabled: !!cabangId,
  });

  // Year options (current year ± 2)
  const yearOptions = useMemo(() => {
    const cy = now.getFullYear();
    return [cy - 2, cy - 1, cy, cy + 1, cy + 2];
  }, [now]);

  const items = data?.items || [];
  const summary = data?.summary;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-[#57534E]">Bulan:</Label>
          <select
            value={bulan}
            onChange={(e) => setBulan(parseInt(e.target.value, 10))}
            className="h-8 px-2 text-xs border border-[#D6D3D1] rounded-md bg-white"
          >
            <option value={0}>📊 Semua Bulan (YTD)</option>
            {BULAN_NAMES_FULL.map((b, i) => (
              <option key={i} value={i + 1}>{b} {tahun}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs font-medium text-[#57534E]">Tahun:</Label>
          <select
            value={tahun}
            onChange={(e) => setTahun(parseInt(e.target.value, 10))}
            className="h-8 px-2 text-xs border border-[#D6D3D1] rounded-md bg-white"
          >
            {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <Input
          type="text"
          placeholder={`🔍 Cari nomor / barang / keterangan...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 h-8 text-xs"
        />
        <div className="ml-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-[#E0AEBB] bg-[#FBE9EE] text-[#8A1A38] hover:bg-[#F5D9E0] text-xs h-8"
            onClick={() => setShowPaste(true)}
          >
            📋 Paste dari Accurate
          </Button>
          <Button
            size="sm"
            className="bg-[#6D0F2B] hover:bg-[#8A1A38] text-white text-xs h-8"
            onClick={() => setEditing(null)}
          >
            + Tambah Transaksi
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiBox
            label={`${moduleName} ${bulan === 0 ? "YTD" : BULAN_NAMES_SHORT[bulan - 1]}`}
            value={`Rp ${fmtIDR(summary.total)}`}
            sub={`${summary.count} transaksi`}
            primary
          />
          <KpiBox
            label={isJual ? "Tunai (Nota Kecil)" : "Lunas (Tunai)"}
            value={`Rp ${fmtIDR(summary.tunai)}`}
            sub={`${summary.pctTunai.toFixed(1)}% dari total`}
            gold
          />
          <KpiBox
            label={isJual ? "Kredit (Nota Besar)" : "Belum Lunas (Kredit)"}
            value={`Rp ${fmtIDR(summary.kredit)}`}
            sub={`${(100 - summary.pctTunai).toFixed(1)}% dari total`}
          />
          <KpiBox
            label="Rata-rata / Transaksi"
            value={`Rp ${fmtIDR(summary.count > 0 ? summary.total / summary.count : 0)}`}
            sub={`${summary.count} baris`}
          />
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-9" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#78716C]">
              <div className="text-2xl mb-2">{moduleIcon}</div>
              <p>Belum ada transaksi {moduleName} untuk <b>{bulan === 0 ? "YTD" : BULAN_NAMES_FULL[bulan - 1]} {tahun}</b>.</p>
              <p className="mt-1">Klik <b>📋 Paste dari Accurate</b> untuk paste laporan Rincian {moduleName} per Barang, atau <b>+ Tambah Transaksi</b> untuk input manual.</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[#FBE9EE] text-[#6D0F2B] uppercase sticky top-0">
                <tr>
                  <th className="px-2 py-1.5 text-left w-10">No</th>
                  <th className="px-2 py-1.5 text-left w-28">No. Nota</th>
                  <th className="px-2 py-1.5 text-left w-24">Tanggal</th>
                  <th className="px-2 py-1.5 text-left">Nama Barang</th>
                  <th className="px-2 py-1.5 text-right w-16">Qty</th>
                  <th className="px-2 py-1.5 text-left w-14">Sat</th>
                  <th className="px-2 py-1.5 text-right w-24">Harga</th>
                  <th className="px-2 py-1.5 text-right w-28">Subtotal</th>
                  <th className="px-2 py-1.5 text-left w-20">Kategori</th>
                  <th className="px-2 py-1.5 text-center w-20">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const subtotal = it.kuantitas * it.hargaSatuan;
                  const kategoriLabel = isJual
                    ? (it.kategori === "NOTA BESAR" ? "NB" : "NT")
                    : (it.isLunas ? "Lunas" : "Kredit");
                  const kategoriBadge = isJual
                    ? (it.kategori === "NOTA BESAR"
                      ? "bg-[#FBE9EE] text-[#6D0F2B] border-[#F0CDD6]"
                      : "bg-[#FBF3DC] text-[#8A6A12] border-[#E5D5A3]")
                    : (it.isLunas
                      ? "bg-[#DCFCE7] text-[#15803D] border-[#BBF7D0]"
                      : "bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]");
                  return (
                    <tr key={it.id} className="border-t border-[#EAE2DB] hover:bg-[#FBE9EE]">
                      <td className="px-2 py-1 text-center text-[#78716C]">{idx + 1}</td>
                      <td className="px-2 py-1 font-mono">{it.noNota || "-"}</td>
                      <td className="px-2 py-1">{fmtDateID(it.tanggal)}</td>
                      <td className="px-2 py-1">{it.namaBarang}{it.keterangan ? <span className="text-[10px] text-[#78716C] ml-1">· {it.keterangan}</span> : ""}</td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums">{it.kuantitas}</td>
                      <td className="px-2 py-1 text-center">{it.satuan || "-"}</td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums">{fmtIDR(it.hargaSatuan)}</td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums font-medium">{fmtIDR(subtotal)}</td>
                      <td className="px-2 py-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] border ${kategoriBadge}`}>{kategoriLabel}</span>
                      </td>
                      <td className="px-2 py-1 text-center">
                        <button onClick={() => setEditing(it)} className="text-[#6D0F2B] hover:text-[#8A1A38] text-xs mr-2">✏️</button>
                        <DeleteButton id={it.id} moduleType={moduleType} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {summary && (
                <tfoot>
                  <tr className="border-t-2 border-[#6D0F2B] bg-[#F8F3EE] font-bold">
                    <td colSpan={7} className="px-2 py-1.5 text-right">TOTAL ({summary.count} transaksi):</td>
                    <td className="px-2 py-1.5 text-right font-mono tabular-nums text-[#6D0F2B]">Rp {fmtIDR(summary.total)}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-[#78716C]">
        {isJual ? (
          <>Format Paste: <b>"Rincian Penjualan per Barang"</b> dari Accurate. NB. (Nota Besar) / NT. (Nota Kecil) otomatis diklasifikasi. Format Indonesia (titik=ribuan, koma=desimal).</>
        ) : (
          <>Format Paste: <b>"Rincian Pembelian per Barang"</b> dari Accurate. Keterangan "Giro xxx" / "Tempo dd Mmm yyyy" otomatis dideteksi sebagai kredit (belum lunas) dengan jatuh tempo. Empty keterangan = tunai (LUNAS).</>
        )}
      </p>

      {/* Edit/Add dialog */}
      {editing !== undefined && (
        <EditDialog
          moduleType={moduleType}
          item={editing}
          defaultBulan={bulan}
          defaultTahun={tahun}
          onClose={() => setEditing(undefined)}
        />
      )}

      {/* Paste dialog */}
      {showPaste && (
        <PasteDialog
          moduleType={moduleType}
          onClose={() => setShowPaste(false)}
          onSuccess={() => {
            setShowPaste(false);
            // Trigger refetch
            setTimeout(() => {
              const event = new Event("refetch");
              window.dispatchEvent(event);
            }, 100);
          }}
        />
      )}
    </div>
  );
}

function KpiBox({ label, value, sub, primary, gold }: { label: string; value: string; sub?: string; primary?: boolean; gold?: boolean }) {
  const cls = primary ? "bg-gradient-to-br from-[#6D0F2B] to-[#470A1D] text-white"
    : gold ? "bg-gradient-to-br from-[#D4A72C] to-[#8F6E12] text-white"
    : "bg-white border border-[#EAE2DB]";
  return (
    <div className={`rounded-lg p-3 shadow-sm ${cls}`}>
      <div className={`text-[10px] uppercase tracking-wider font-semibold ${primary || gold ? "text-white/80" : "text-[#78716C]"}`}>{label}</div>
      <div className="text-lg font-bold mt-1 font-mono tabular-nums">{value}</div>
      {sub && <div className={`text-[10px] mt-0.5 ${primary || gold ? "text-white/70" : "text-[#78716C]"}`}>{sub}</div>}
    </div>
  );
}

function DeleteButton({ id, moduleType }: { id: string; moduleType: ModuleType }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/${moduleType}?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transaksi", moduleType] });
      toast.success("Transaksi dihapus");
    },
    onError: () => toast.error("Gagal menghapus"),
  });
  return (
    <button
      className="text-[#dc2626] hover:text-[#b91c1c] text-xs"
      onClick={() => { if (confirm("Hapus transaksi ini?")) mut.mutate(); }}
    >
      🗑️
    </button>
  );
}

function EditDialog({ moduleType, item, defaultBulan, defaultTahun, onClose }: {
  moduleType: ModuleType;
  item: TransaksiItem | null;
  defaultBulan: number;
  defaultTahun: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isJual = moduleType === "penjualan";
  const today = new Date();
  const defaultTanggal = `${defaultTahun}-${String(defaultBulan === 0 ? today.getMonth() + 1 : defaultBulan).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const [form, setForm] = useState({
    id: item?.id || "",
    tanggal: item?.tanggal || defaultTanggal,
    noNota: item?.noNota || "",
    namaBarang: item?.namaBarang || "",
    satuan: item?.satuan || "",
    kuantitas: item?.kuantitas?.toString() || "1",
    hargaSatuan: item?.hargaSatuan?.toString() || "0",
    kategori: item?.kategori || (isJual ? "NOTA KECIL" : ""),
    isLunas: item?.isLunas ?? false,
    jatuhTempo: item?.jatuhTempo || "",
    keterangan: item?.keterangan || "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/${moduleType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Gagal simpan");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transaksi", moduleType] });
      toast.success(item ? "Transaksi diperbarui" : "Transaksi ditambahkan");
      onClose();
    },
    onError: () => toast.error("Gagal menyimpan"),
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-[#470A1D]">
            {item ? "Edit" : "Tambah"} Transaksi {isJual ? "Penjualan" : "Pembelian"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tanggal</Label>
            <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} className="text-sm h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">No. {isJual ? "Nota" : "Faktur"}</Label>
            <Input value={form.noNota} onChange={(e) => setForm({ ...form, noNota: e.target.value })} placeholder="SI.2026.xx atau PI.2026.xx" className="text-sm h-8" />
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Nama Barang</Label>
            <Input value={form.namaBarang} onChange={(e) => setForm({ ...form, namaBarang: e.target.value })} className="text-sm h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Qty</Label>
            <Input type="number" step="0.001" value={form.kuantitas} onChange={(e) => setForm({ ...form, kuantitas: e.target.value })} className="text-sm h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Satuan</Label>
            <Input value={form.satuan} onChange={(e) => setForm({ ...form, satuan: e.target.value })} placeholder="Kg, Ltr, Pcs..." className="text-sm h-8" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Harga Satuan</Label>
            <Input type="number" step="0.01" value={form.hargaSatuan} onChange={(e) => setForm({ ...form, hargaSatuan: e.target.value })} className="text-sm h-8" />
          </div>
          {isJual ? (
            <div className="space-y-1.5">
              <Label className="text-xs">Kategori</Label>
              <select value={form.kategori} onChange={(e) => setForm({ ...form, kategori: e.target.value })} className="w-full h-8 px-2 text-sm border border-[#D6D3D1] rounded-md bg-white">
                <option value="NOTA KECIL">NOTA KECIL (Tunai)</option>
                <option value="NOTA BESAR">NOTA BESAR (Kredit)</option>
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <select value={form.isLunas ? "lunas" : "kredit"} onChange={(e) => setForm({ ...form, isLunas: e.target.value === "lunas" })} className="w-full h-8 px-2 text-sm border border-[#D6D3D1] rounded-md bg-white">
                <option value="lunas">LUNAS (Tunai)</option>
                <option value="kredit">KREDIT (Belum Lunas)</option>
              </select>
            </div>
          )}
          {!isJual && (
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs">Jatuh Tempo (bila kredit)</Label>
              <Input type="date" value={form.jatuhTempo} onChange={(e) => setForm({ ...form, jatuhTempo: e.target.value })} className="text-sm h-8" />
            </div>
          )}
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs">Keterangan</Label>
            <Input value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} className="text-sm h-8" />
          </div>
        </div>
        <div className="bg-[#F8F3EE] border border-[#EAE2DB] rounded-md p-2 text-xs">
          Subtotal: <b className="text-[#6D0F2B] font-mono">Rp {fmtIDR((parseFloat(form.kuantitas) || 0) * (parseFloat(form.hargaSatuan) || 0))}</b>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Batal</Button>
          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() => {
              if (!form.tanggal || !form.namaBarang) {
                toast.error("Tanggal & nama barang wajib");
                return;
              }
              save.mutate();
            }}
            className="bg-[#6D0F2B] hover:bg-[#8A1A38] text-white text-xs"
          >
            {save.isPending ? "Menyimpan..." : "💾 Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PasteDialog({ moduleType, onClose, onSuccess }: {
  moduleType: ModuleType;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const qc = useQueryClient();
  const isJual = moduleType === "penjualan";
  const [text, setText] = useState("");
  const [mode, setMode] = useState<"append" | "replace">("replace");
  const [preview, setPreview] = useState<{ count: number; total: number; tunai: number; kredit: number; samples: any[] } | null>(null);

  const parse = useMutation({
    mutationFn: async () => {
      // Just parse locally for preview (use the API to validate too)
      const res = await fetch(`/api/${moduleType}/paste`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, mode: "append", previewOnly: true }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Parse gagal");
      }
      return res.json();
    },
    onSuccess: (data) => {
      // data has parsedCount, sample, etc. We don't save yet, just preview.
      // Compute summary from sample (note: this is only first 3 samples; total from parsedCount)
      setPreview({
        count: data.parsedCount,
        total: data.sample?.reduce((s: number, t: any) => s + (t.kuantitas || 0) * (t.hargaSatuan || 0), 0) || 0,
        tunai: data.sample?.filter((t: any) => isJual ? t.kategori === "NOTA KECIL" : t.isLunas).reduce((s: number, t: any) => s + (t.kuantitas || 0) * (t.hargaSatuan || 0), 0) || 0,
        kredit: data.sample?.filter((t: any) => isJual ? t.kategori === "NOTA BESAR" : !t.isLunas).reduce((s: number, t: any) => s + (t.kuantitas || 0) * (t.hargaSatuan || 0), 0) || 0,
        samples: data.sample || [],
      });
      toast.info(`Parsed: ${data.parsedCount} transaksi (preview — belum disimpan)`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Note: previewOnly is not implemented in the API; the API will actually insert.
  // For UX, we'll just save directly when user clicks Save.

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/${moduleType}/paste`, {
        method: "POST",
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
      toast.success(`Sukses: ${data.inserted} transaksi disisipkan (${data.mode}).${data.skippedDuplicates ? ` ${data.skippedDuplicates} duplikat dilewati.` : ""}`);
      qc.invalidateQueries({ queryKey: ["transaksi", moduleType] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const placeholder = isJual
    ? `Contoh format yang akan diparse:\n\nINDOSARI\nRincian Penjualan per Barang\nDari 01 Sep 2026 s/d 30 Sep 2026\n\nALKOHOL\n00054260806 06 Sep 2026 5 Ltr 280.000\nSI.2026.09.00001 06 Sep 2026 NB. 708 39 Ltr 2.184.000\n166,25 8.076.000\n\nBENZOAT HOLLAND\n00002260901 01 Sep 2026 0,25 Kg 18.500\n...`
    : `Contoh format yang akan diparse:\n\nINDOSARI\nRincian Pembelian per Barang\nDari 01 Sep 2026 s/d 30 Sep 2026\n\nALKOHOL\nPI.2026.09.000146 24 Sep 2026 Giro 0058 24,25 Kg 8.108.108,11\n00009260901 01 Sep 2026 1 Kg 12.000\n25,25 8.120.108,11\n\nBENZOAT HOLLAND\nPI.2026.09.000150 09 Sep 2026 Tempo 09 Okt 2026 175 Kg 8.750.000\n...`;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-[#470A1D]">📋 Paste dari Accurate — {isJual ? "Penjualan" : "Pembelian"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-[#FBE9EE] border border-[#F0CDD6] rounded-lg p-3 text-xs text-[#6D0F2B]">
            <p className="font-medium mb-1">Cara pakai:</p>
            <ol className="list-decimal ml-5 space-y-0.5">
              <li>Buka laporan <b>"Rincian {isJual ? "Penjualan" : "Pembelian"} per Barang"</b> di Accurate</li>
              <li>Export ke PDF, buka PDF-nya, tekan <b>Ctrl+A</b> → <b>Ctrl+C</b></li>
              <li>Atau langsung <b>copy dari preview Accurate</b></li>
              <li>Paste ke textarea di bawah</li>
              <li>Pilih mode <b>Replace</b> (ganti semua) atau <b>Append</b> (gabung, skip duplikat)</li>
              <li>Klik <b>💾 Simpan</b>. Transaksi akan ter-insert ke database cabang aktif.</li>
            </ol>
          </div>
          <div>
            <Label className="text-xs">Paste teks laporan Accurate di sini:</Label>
            <textarea
              rows={10}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              className="w-full mt-1 px-3 py-2 border border-[#D6D3D1] rounded-md text-xs font-mono"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs">Mode:</Label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="h-8 px-2 text-xs border border-[#D6D3D1] rounded-md bg-white"
            >
              <option value="replace">Replace (ganti semua di bulan terkait)</option>
              <option value="append">Append (gabung, skip duplikat)</option>
            </select>
            <span className="text-xs text-[#78716C]">
              Mode <b>Replace</b> akan hapus transaksi lama di bulan-bulan yang ada di paste, lalu insert baru. Mode <b>Append</b> tidak hapus, hanya skip jika noNota + tanggal + namaBarang sudah ada.
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Batal</Button>
          <Button
            size="sm"
            disabled={save.isPending || !text.trim()}
            onClick={() => {
              if (!confirm(`Simpan ${isJual ? "Penjualan" : "Pembelian"} mode ${mode}? Bila Replace, transaksi lama di bulan terkait akan dihapus.`)) return;
              save.mutate();
            }}
            className="bg-[#6D0F2B] hover:bg-[#8A1A38] text-white text-xs"
          >
            {save.isPending ? "Menyimpan..." : "💾 Simpan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
