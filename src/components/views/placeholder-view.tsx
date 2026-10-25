'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props { moduleKey: string; }

const MODULE_INFO: Record<string, { title: string; icon: string; status: string; desc: string }> = {
  "laba-rugi": { title: "Laba Rugi", icon: "📈", status: "Coming Soon", desc: "Format Accurate Standar per bulan, dengan Paste dari Accurate, editable. Akan di-port dari HTML akuntansi." },
  "penjualan": { title: "Penjualan", icon: "💵", status: "Coming Soon", desc: "Transaksi penjualan per bulan, dengan Paste dari Accurate (Rincian Penjualan per Barang), import Excel/CSV, tambah manual." },
  "pembelian": { title: "Pembelian", icon: "🛒", status: "Coming Soon", desc: "Transaksi pembelian per bulan, dengan Paste dari Accurate (Rincian Pembelian per Barang), import Excel/CSV." },
  "persediaan": { title: "Persediaan", icon: "📦", status: "Coming Soon", desc: "Kartu stok per bulan, dengan Paste dari Accurate (Daftar Nilai Persediaan), import Excel/CSV." },
  "piutang": { title: "Piutang", icon: "💰", status: "Coming Soon", desc: "Saldo piutang per bulan (editable) + Faktur Piutang Belum Lunas dari Paste 'Daftar Piutang Usaha'." },
  "hutang": { title: "Hutang", icon: "💸", status: "Coming Soon", desc: "Saldo hutang per bulan (editable) + Faktur Hutang Belum Lunas dari Paste 'Daftar Utang Usaha'." },
  "neraca": { title: "Neraca", icon: "⚖️", status: "Coming Soon", desc: "Neraca format Accurate Standar per bulan, dengan Paste dari Accurate, editable." },
};

export function PlaceholderView({ moduleKey }: Props) {
  const info = MODULE_INFO[moduleKey] || { title: moduleKey, icon: "📋", status: "Coming Soon", desc: "Modul ini akan di-port dari file HTML akuntansi." };
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-bold text-[#470A1D]">
            <span className="text-2xl">{info.icon}</span>
            {info.title}
            <Badge variant="secondary" className="ml-2 bg-[#FBE9EE] text-[#6D0F2B] border-[#F0CDD6] text-[10px]">
              {info.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-[#F8F3EE] border border-[#EAE2DB] rounded-lg p-4">
            <p className="text-sm text-[#57534E]">{info.desc}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white border border-[#EAE2DB] rounded-md p-3">
              <div className="text-[10px] uppercase text-[#78716C] font-semibold">Status Saat Ini</div>
              <div className="mt-1 text-[#57534E]">
                ✅ Database + schema siap<br/>
                ✅ Auth + multi-cabang aktif<br/>
                ⏳ Modul ini dijadwalkan porting di iterasi berikutnya
              </div>
            </div>
            <div className="bg-white border border-[#EAE2DB] rounded-md p-3">
              <div className="text-[10px] uppercase text-[#78716C] font-semibold">Sementara</div>
              <div className="mt-1 text-[#57534E]">
                Pakai file <b>INDOSARI_Akuntansi_2026_perbulan.html</b> untuk modul ini. Web app akan menampilkan data yang sama setelah porting selesai.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
