'use client';

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useSession } from "next-auth/react";

type MasterType = "barang" | "supplier" | "pelanggan";

interface MasterItem {
  id: string;
  kode?: string;
  nama: string;
  satuan?: string;
  alamat?: string;
  telp?: string;
}

export function MasterDataView() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<MasterType>("barang");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ item: MasterItem | null; type: MasterType } | null>(null);
  const [showImport, setShowImport] = useState(false);

  const queryKey = ["master", activeTab, (session?.user as any)?.cabangId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/master/${activeTab}`);
      if (!res.ok) throw new Error(`Gagal load ${activeTab}`);
      return res.json();
    },
    enabled: !!session,
  });

  const items: MasterItem[] = Array.isArray(data) ? data : [];
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(it => {
      if (activeTab === "barang") {
        return (it.kode || "").toLowerCase().includes(q) || (it.nama || "").toLowerCase().includes(q) || (it.satuan || "").toLowerCase().includes(q);
      }
      return (it.nama || "").toLowerCase().includes(q);
    });
  }, [items, search, activeTab]);

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#470A1D]">Master Data</h3>
          <p className="text-xs text-[#78716C]">{items.length} item terdaftar{search ? ` · ${filtered.length} hasil pencarian` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            type="text"
            placeholder="🔍 Cari..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-8 text-xs"
          />
          <div className="flex gap-1">
            <TabBtn active={activeTab === "barang"} onClick={() => { setActiveTab("barang"); setSearch(""); }}>📦 Barang</TabBtn>
            <TabBtn active={activeTab === "supplier"} onClick={() => { setActiveTab("supplier"); setSearch(""); }}>🚚 Supplier</TabBtn>
            <TabBtn active={activeTab === "pelanggan"} onClick={() => { setActiveTab("pelanggan"); setSearch(""); }}>👥 Pelanggan</TabBtn>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-[#E0AEBB] bg-[#FBE9EE] text-[#8A1A38] hover:bg-[#F5D9E0] text-xs h-8"
            onClick={() => setShowImport(true)}
          >
            ⬇ Import dari Akuntansi HTML
          </Button>
          <Button
            size="sm"
            className="bg-[#6D0F2B] hover:bg-[#8A1A38] text-white text-xs h-8"
            onClick={() => setEditing({ item: null, type: activeTab })}
          >
            + Tambah {activeTab === "barang" ? "Barang" : activeTab === "supplier" ? "Supplier" : "Pelanggan"}
          </Button>
        </div>
      </div>

      {/* Table card */}
      <Card>
        <CardContent className="p-0 overflow-auto">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-9" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#78716C]">
              {search ? `Tidak ada hasil pencarian untuk "${search}".` : `Belum ada data ${activeTab}. Klik "+ Tambah" atau import dari file akuntansi HTML.`}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#FBE9EE] text-[#6D0F2B] text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left w-12">No</th>
                  {activeTab === "barang" ? (
                    <>
                      <th className="px-3 py-2 text-left">Kode</th>
                      <th className="px-3 py-2 text-left">Nama Barang</th>
                      <th className="px-3 py-2 text-left w-24">Satuan</th>
                    </>
                  ) : (
                    <>
                      <th className="px-3 py-2 text-left">Nama</th>
                      <th className="px-3 py-2 text-left">Alamat</th>
                      <th className="px-3 py-2 text-left w-32">Telp</th>
                    </>
                  )}
                  <th className="px-3 py-2 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((it, idx) => (
                  <tr key={it.id} className="border-t border-[#EAE2DB] hover:bg-[#FBE9EE]">
                    <td className="px-3 py-1.5 text-center text-xs">{idx + 1}</td>
                    {activeTab === "barang" ? (
                      <>
                        <td className="px-3 py-1.5 font-mono text-xs">{it.kode}</td>
                        <td className="px-3 py-1.5">{it.nama}</td>
                        <td className="px-3 py-1.5 text-center text-xs">{it.satuan}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-1.5">{it.nama}</td>
                        <td className="px-3 py-1.5 text-xs text-[#78716C]">{it.alamat || "-"}</td>
                        <td className="px-3 py-1.5 text-xs text-[#78716C]">{it.telp || "-"}</td>
                      </>
                    )}
                    <td className="px-3 py-1.5 text-center">
                      <button
                        className="text-[#6D0F2B] hover:text-[#8A1A38] text-xs mr-2"
                        onClick={() => setEditing({ item: it, type: activeTab })}
                      >
                        ✏️ Edit
                      </button>
                      <DeleteButton id={it.id} type={activeTab} nama={it.nama} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-[#78716C]">
        Master data terikat dengan cabang user yang login. Import dari file HTML akuntansi tersedia — paste JSON export dari sana ke dialog import.
      </p>

      {editing && (
        <MasterEditDialog
          item={editing.item}
          type={editing.type}
          onClose={() => setEditing(null)}
        />
      )}

      {showImport && <ImportMasterDialog onClose={() => setShowImport(false)} />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
        active ? "bg-[#6D0F2B] text-white" : "bg-white border border-[#E7E5E4] text-[#57534E] hover:bg-[#FBE9EE]"
      }`}
    >
      {children}
    </button>
  );
}

function DeleteButton({ id, type, nama }: { id: string; type: MasterType; nama: string }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/master/${type}?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal hapus");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master", type] });
      toast.success(`${type === "barang" ? "Barang" : type === "supplier" ? "Supplier" : "Pelanggan"} "${nama}" dihapus`);
    },
    onError: () => toast.error("Gagal menghapus"),
  });
  return (
    <button
      className="text-[#dc2626] hover:text-[#b91c1c] text-xs"
      onClick={() => {
        if (confirm(`Hapus "${nama}"?`)) mut.mutate();
      }}
    >
      🗑 Hapus
    </button>
  );
}

function MasterEditDialog({ item, type, onClose }: { item: MasterItem | null; type: MasterType; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<MasterItem>(
    item || (type === "barang" ? { id: "", kode: "", nama: "", satuan: "" } : { id: "", nama: "", alamat: "", telp: "" })
  );

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/master/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Gagal simpan");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["master", type] });
      toast.success(`${type === "barang" ? "Barang" : type === "supplier" ? "Supplier" : "Pelanggan"} ${item ? "diperbarui" : "ditambahkan"}`);
      onClose();
    },
    onError: () => toast.error("Gagal menyimpan"),
  });

  const title = `${item ? "Edit" : "Tambah"} ${type === "barang" ? "Barang" : type === "supplier" ? "Supplier" : "Pelanggan"}`;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#470A1D]">{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {type === "barang" ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Kode</Label>
                <Input value={form.kode || ""} onChange={(e) => setForm({ ...form, kode: e.target.value })} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama Barang</Label>
                <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Satuan</Label>
                <Input value={form.satuan || ""} onChange={(e) => setForm({ ...form, satuan: e.target.value })} placeholder="Kg, Ltr, Pcs..." className="text-sm" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs">Nama {type === "supplier" ? "Supplier" : "Pelanggan"}</Label>
                <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Alamat</Label>
                <Input value={form.alamat || ""} onChange={(e) => setForm({ ...form, alamat: e.target.value })} className="text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telp</Label>
                <Input value={form.telp || ""} onChange={(e) => setForm({ ...form, telp: e.target.value })} className="text-sm" />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Batal</Button>
          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() => {
              if (!form.nama || (type === "barang" && !form.kode)) {
                toast.error("Kode/Nama wajib diisi");
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

function ImportMasterDialog({ onClose }: { onClose: () => void }) {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const [jsonText, setJsonText] = useState("");
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  const imp = useMutation({
    mutationFn: async () => {
      const data = JSON.parse(jsonText);
      const res = await fetch("/api/import-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, mode, cabangId: (session?.user as any).cabangId }),
      });
      if (!res.ok) throw new Error("Gagal import");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Import sukses: ${data.addedBarang} barang, ${data.addedSupplier} supplier, ${data.addedPelanggan} pelanggan (mode: ${data.mode})`);
      qc.invalidateQueries({ queryKey: ["master"] });
      onClose();
    },
    onError: (e: any) => toast.error(`Import gagal: ${e.message}`),
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-[#470A1D]">⬇ Import Master dari HTML Akuntansi</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="bg-[#FBE9EE] border border-[#F0CDD6] rounded-lg p-3 text-xs text-[#6D0F2B]">
            <p className="font-medium mb-1">Cara pakai:</p>
            <ol className="list-decimal ml-5 space-y-0.5">
              <li>Buka file <b>INDOSARI_Akuntansi_2026_perbulan.html</b></li>
              <li>Klik menu <b>Master Data</b> di sidebar</li>
              <li>Klik tombol <b>⬇ Export JSON</b> lalu <b>Copy ke Clipboard</b></li>
              <li>Paste ke textarea di bawah, pilih mode, klik Import</li>
            </ol>
          </div>
          <div>
            <Label className="text-xs font-medium">JSON master dari HTML akuntansi:</Label>
            <textarea
              rows={8}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder='{"masterBarang":[{"kode":"A00002","nama":"ALKOHOL","satuan":"Kg"}], ...}'
              className="w-full mt-1 px-3 py-2 border border-[#D6D3D1] rounded-md text-xs font-mono"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="text-xs">Mode:</Label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as any)}
              className="px-2 py-1 border border-[#D6D3D1] rounded-md text-xs"
            >
              <option value="merge">Merge (gabung, tak double)</option>
              <option value="replace">Replace (ganti semua)</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">Batal</Button>
          <Button
            size="sm"
            disabled={imp.isPending || !jsonText.trim()}
            onClick={() => {
              try { JSON.parse(jsonText); imp.mutate(); }
              catch { toast.error("JSON tidak valid"); }
            }}
            className="bg-[#6D0F2B] hover:bg-[#8A1A38] text-white text-xs"
          >
            {imp.isPending ? "Mengimport..." : "📥 Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
