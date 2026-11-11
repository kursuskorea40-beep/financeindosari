'use client';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from "recharts";
import { BULAN_NAMES_FULL, fmtIDR } from "@/lib/accurate-parser";
type Mode = "tahunan" | "bulanan";
const PC = ["#6D0F2B","#D4A72C","#8A1A38","#B8860B","#15803D"];
const fR = (n: number) => `Rp ${fmtIDR(n)}`;
const fC = (n: number) => new Intl.NumberFormat("id-ID",{notation:"compact",maximumFractionDigits:1}).format(n||0);

export function DashboardView({ cabangId }: { cabangId?: string }) {
  const [tahun, setTahun] = useState(2026);
  const [mode, setMode] = useState<Mode>("tahunan");
  const [bulan, setBulan] = useState(new Date().getMonth()+1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", cabangId, tahun, mode, bulan],
    queryFn: async () => {
      const p = new URLSearchParams(); if (cabangId) p.set("cabangId", cabangId);
      p.set("tahun", String(tahun)); p.set("mode", mode); if (mode === "bulanan") p.set("bulan", String(bulan));
      const r = await fetch(`/api/dashboard?${p}`); if (!r.ok) throw new Error("fail"); return r.json();
    },
  });
  if (isLoading) return <div className="space-y-4"><Skeleton className="h-12" /><div className="grid grid-cols-2 md:grid-cols-5 gap-3">{[...Array(5)].map((_,i)=><Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-72" /></div>;
  if (isError || !data) return <Card><CardContent className="p-6 text-center text-sm text-[#dc2626]">Gagal memuat dashboard. Coba refresh.</CardContent></Card>;
  const t = data.totals, s = data.series || [];
  const tc = data.topCustomers || [], ts = data.topSuppliers || [], tp = data.topProducts || [];
  const pd = [{name:"Penjualan",value:t.penjualanYTD},{name:"Pembelian",value:t.pembelianYTD},{name:"Piutang",value:t.piutangSaldoAkhir},{name:"Hutang",value:t.hutangSaldoAkhir}];
  const pl = mode === "tahunan" ? `Tahun ${tahun}` : `${BULAN_NAMES_FULL[bulan-1]} ${tahun}`;
  return (<div className="space-y-5">
    <Card><CardContent className="p-3"><div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1"><Label className="text-[10px] uppercase text-[#78716C]">Tahun</Label><select value={tahun} onChange={e=>setTahun(+e.target.value)} className="h-8 px-2 text-xs border border-[#D6D3D1] rounded-md bg-white">{[2024,2025,2026,2027,2028].map(y=><option key={y} value={y}>{y}</option>)}</select></div>
      <div className="flex flex-col gap-1"><Label className="text-[10px] uppercase text-[#78716C]">Mode</Label><select value={mode} onChange={e=>setMode(e.target.value as Mode)} className="h-8 px-2 text-xs border border-[#D6D3D1] rounded-md bg-white"><option value="tahunan">Tahunan</option><option value="bulanan">Bulanan</option></select></div>
      {mode === "bulanan" && <div className="flex flex-col gap-1"><Label className="text-[10px] uppercase text-[#78716C]">Bulan</Label><select value={bulan} onChange={e=>setBulan(+e.target.value)} className="h-8 px-2 text-xs border border-[#D6D3D1] rounded-md bg-white">{BULAN_NAMES_FULL.map((b,i)=><option key={i} value={i+1}>{b}</option>)}</select></div>}
      <div className="ml-auto"><Badge variant="secondary" className="bg-[#FBE9EE] text-[#6D0F2B] border-[#F0CDD6]">{pl}</Badge></div>
    </div></CardContent></Card>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <K label={`Penjualan ${pl}`} value={fR(t.penjualanYTD)} sub={`${t.transaksiPenjualanCount} trx · Kredit: ${fR(t.penjualanKredit)}`} primary />
      <K label={`Pembelian ${pl}`} value={fR(t.pembelianYTD)} sub={`${t.transaksiPembelianCount} trx · Kredit: ${fR(t.pembelianKredit)}`} gold />
      <K label="Laba Bersih" value={fR(t.labaBersih)} sub="Penjualan - Pembelian" green />
      <K label="Piutang" value={fR(t.piutangSaldoAkhir)} sub={`Faktur BL: ${fR(t.fakturPiutangBelumLunas)}`} danger />
      <K label="Hutang" value={fR(t.hutangSaldoAkhir)} sub={`Faktur BL: ${fR(t.fakturHutangBelumLunas)}`} danger />
    </div>
    <Card><CardHeader><CardTitle className="text-sm font-bold text-[#470A1D]">Tren {mode==="tahunan"?"Bulanan":"Mingguan"} {pl}</CardTitle></CardHeader>
      <CardContent><div style={{width:"100%",height:300}}><ResponsiveContainer><LineChart data={s} margin={{top:5,right:20,left:10,bottom:5}}>
        <CartesianGrid strokeDasharray="3 3" stroke="#EAE2DB" /><XAxis dataKey="label" tick={{fontSize:11,fill:"#78716C"}} /><YAxis tickFormatter={fC} tick={{fontSize:11,fill:"#78716C"}} />
        <Tooltip formatter={(v:number)=>fR(v)} contentStyle={{fontSize:12}} /><Legend wrapperStyle={{fontSize:11}} />
        <Line type="monotone" dataKey="penjualan" stroke="#6D0F2B" strokeWidth={2} name="Penjualan" dot={{r:3}} /><Line type="monotone" dataKey="pembelian" stroke="#D4A72C" strokeWidth={2} name="Pembelian" dot={{r:3}} />
      </LineChart></ResponsiveContainer></div></CardContent></Card>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card><CardHeader><CardTitle className="text-sm font-bold text-[#470A1D]">Penjualan vs Pembelian</CardTitle></CardHeader>
        <CardContent><div style={{width:"100%",height:300}}><ResponsiveContainer><BarChart data={s} margin={{top:5,right:20,left:10,bottom:5}}>
          <CartesianGrid strokeDasharray="3 3" stroke="#EAE2DB" /><XAxis dataKey="label" tick={{fontSize:11,fill:"#78716C"}} /><YAxis tickFormatter={fC} tick={{fontSize:11,fill:"#78716C"}} />
          <Tooltip formatter={(v:number)=>fR(v)} contentStyle={{fontSize:12}} /><Legend wrapperStyle={{fontSize:11}} />
          <Bar dataKey="penjualan" fill="#6D0F2B" name="Penjualan" radius={[3,3,0,0]} /><Bar dataKey="pembelian" fill="#D4A72C" name="Pembelian" radius={[3,3,0,0]} />
        </BarChart></ResponsiveContainer></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-sm font-bold text-[#470A1D]">Komposisi Finansial</CardTitle></CardHeader>
        <CardContent><div style={{width:"100%",height:300}}><ResponsiveContainer><PieChart>
          <Pie data={pd} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e:any)=>`${e.name}: ${fC(e.value)}`} labelLine={false} style={{fontSize:11}}>
            {pd.map((_,i)=><Cell key={i} fill={PC[i%PC.length]} />)}</Pie>
          <Tooltip formatter={(v:number)=>fR(v)} contentStyle={{fontSize:12}} /><Legend wrapperStyle={{fontSize:11}} />
        </PieChart></ResponsiveContainer></div></CardContent></Card>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4"><T5 title="Top 5 Customer" rows={tc} /><T5 title="Top 5 Supplier" rows={ts} /><T5 title="Top 5 Produk" rows={tp} /></div>
    <Card><CardHeader><CardTitle className="text-sm font-bold text-[#470A1D]">Master Data</CardTitle></CardHeader><CardContent>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-[#F8F3EE] border border-[#EAE2DB] rounded-lg p-3"><div className="text-xs uppercase text-[#78716C]">Barang</div><div className="text-2xl font-bold text-[#6D0F2B]">{t.masterBarang}</div></div>
        <div className="bg-[#F8F3EE] border border-[#EAE2DB] rounded-lg p-3"><div className="text-xs uppercase text-[#78716C]">Supplier</div><div className="text-2xl font-bold text-[#6D0F2B]">{t.masterSupplier}</div></div>
        <div className="bg-[#F8F3EE] border border-[#EAE2DB] rounded-lg p-3"><div className="text-xs uppercase text-[#78716C]">Pelanggan</div><div className="text-2xl font-bold text-[#6D0F2B]">{t.masterPelanggan}</div></div>
      </div></CardContent></Card>
  </div>);
}
function K({label,value,sub,primary,gold,danger,green}:any){const c=primary?"bg-gradient-to-br from-[#6D0F2B] to-[#470A1D] text-white":gold?"bg-gradient-to-br from-[#D4A72C] to-[#8F6E12] text-white":green?"bg-gradient-to-br from-[#15803D] to-[#14532D] text-white":danger?"border-2 border-[#dc2626] bg-white":"bg-white border border-[#EAE2DB]";return <div className={`rounded-lg p-3 shadow-sm ${c}`}><div className={`text-[10px] uppercase font-semibold ${primary||gold||green?"text-white/80":"text-[#78716C]"}`}>{label}</div><div className="text-base font-bold mt-1 font-mono">{value}</div>{sub&&<div className={`text-[10px] mt-0.5 ${primary||gold||green?"text-white/70":"text-[#78716C]"}`}>{sub}</div>}</div>;}
function T5({title,rows}:any){return <Card><CardHeader><CardTitle className="text-sm font-bold text-[#470A1D]">{title}</CardTitle></CardHeader><CardContent className="p-0"><table className="w-full text-xs"><thead className="bg-[#FBE9EE] text-[#6D0F2B] uppercase"><tr><th className="px-2 py-1.5 text-left w-8">No</th><th className="px-2 py-1.5 text-left">Nama</th><th className="px-2 py-1.5 text-right">Total</th></tr></thead><tbody>{rows.length===0?<tr><td colSpan={3} className="px-2 py-4 text-center text-[#78716C]">Tidak ada data</td></tr>:rows.map((r:any,i:number)=><tr key={i} className="border-t border-[#EAE2DB] hover:bg-[#FBE9EE]"><td className="px-2 py-1 text-center text-[#78716C]">{i+1}</td><td className="px-2 py-1 truncate max-w-[180px]">{r.nama}</td><td className="px-2 py-1 text-right font-mono text-[#6D0F2B]">{fR(r.total)}</td></tr>)}</tbody></table></CardContent></Card>;}
