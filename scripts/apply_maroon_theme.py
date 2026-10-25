#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tema warna "Maroon Elegan" untuk INDOSARI Akuntansi 2026:
- Primary maroon : #6D0F2B (senada header Excel embedded)
- Maroon gelap   : #470A1D / #520C22 / #8A1A38
- Gold (penyeimbang): #D4A72C terang, #B8912C utama, #8F6E12 gelap, #8A6A12 teks
- Latar cream hangat: #F6F1E9, netral hangat (stone)
Aturan:
- Baris COMBINED JSON (data Excel embedded) TIDAK disentuh.
- Urutan: penggantian spesifik per-baris dulu -> hex global -> kelas Tailwind -> teks UI.
"""
import re
import sys

PATH = "/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html"

with open(PATH, "r", encoding="utf-8") as f:
    lines = f.read().split("\n")

# --- Penggantian spesifik (line-targeted, dilakukan lebih dulu) ---
SPECIFIC = [
    # Sidebar logo chip "IN" -> gold (dipelajari dari class bg-sky-500, di-handle via kelas)
    # icon-wrap aktif -> gold
    ('.sidebar-item.active .icon-wrap { background: #0ea5e9;',
     '.sidebar-item.active .icon-wrap { background: #D4A72C;'),
    # KPI primary gradient -> maroon
    ('.kpi-card.primary { background: linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%); border-color: #0369a1; }',
     '.kpi-card.primary { background: linear-gradient(135deg, #6D0F2B 0%, #470A1D 100%); border-color: #470A1D; }'),
    # KPI success gradient -> gold (penyeimbang)
    ('.kpi-card.success { background: linear-gradient(135deg, #22c55e 0%, #15803d 100%); border-color: #15803d; }',
     '.kpi-card.success { background: linear-gradient(135deg, #C9A227 0%, #8F6E12 100%); border-color: #8F6E12; }'),
    # label abu-abu di bawah bar chart & teks toggle/tab -> warm gray
    ('.bar-label { font-size: 0.65rem; color: #475569;',
     '.bar-label { font-size: 0.65rem; color: #7A6B70;'),
    ('.toggle-btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.8rem; font-weight: 600; border: 1px solid #cbd5e1; background: #fff; color: #475569;',
     '.toggle-btn { padding: 0.5rem 1rem; border-radius: 0.375rem; font-size: 0.8rem; font-weight: 600; border: 1px solid #D9CEC6; background: #fff; color: #6E5A5F;'),
    ('.tab-btn { padding: 0.4rem 0.85rem; border-radius: 0.375rem; font-size: 0.78rem; font-weight: 600; border: 1px solid #cbd5e1; background: #fff; color: #475569;',
     '.tab-btn { padding: 0.4rem 0.85rem; border-radius: 0.375rem; font-size: 0.78rem; font-weight: 600; border: 1px solid #D9CEC6; background: #fff; color: #6E5A5F;'),
]

# --- Peta hex global (di luar JSON) ---
HEX_MAP = [
    ("#dbeafe", "#fef9c3"),   # sel input sheet-table & lr-table -> kuning (seragam dgn konvensi "Sel kuning")
    ("#bfdbfe", "#fde047"),   # hover sel input
    ("#0ea5e9", "#6D0F2B"),   # bar chart, toggle/tab aktif (sisa)
    ("#0369a1", "#470A1D"),
    ("#0284c7", "#8A1A38"),
    ("#22c55e", "#D4A72C"),   # bar.laba -> gold
    ("#15803d", "#8A6A12"),   # teks kredit -> gold gelap
    ("#2563eb", "#6D0F2B"),   # focus ring
    ("#1e293b", "#6D0F2B"),   # header tabel, section-header, sidebar aktif, border grand
    ("#475569", "#8A1A38"),   # header-row sheet/tx (sisa)
    ("#0f172a", "#3B232A"),   # teks tergelap -> plum hangat
    ("#f1f5f9", "#F8F3EE"),
    ("#f8fafc", "#FAF6F2"),
    ("#e2e8f0", "#EAE2DB"),
    ("#cbd5e1", "#D9CEC6"),
    ("#64748b", "#7A6B70"),
    ("#94a3b8", "#A39499"),
]

# --- Peta kelas Tailwind (urutan penting: yang lebih panjang dulu) ---
CLASS_MAP = [
    # slate struktural
    ("hover:bg-slate-100", "hover:bg-[#EFE7DC]"),
    ("hover:bg-slate-800", "hover:bg-[#5A0C24]"),
    ("bg-slate-900", "bg-[#470A1D]"),
    ("bg-slate-700", "bg-[#5A0C24]"),
    ("bg-slate-100", "bg-[#F6F1E9]"),
    ("border-slate-700", "border-[#7A2A3C]"),
    # sky -> maroon
    ("hover:bg-sky-700", "hover:bg-[#8A1A38]"),
    ("bg-sky-600", "bg-[#6D0F2B]"),
    ("bg-sky-500", "bg-[#D4A72C]"),
    ("hover:bg-sky-100", "hover:bg-[#F5D9E0]"),
    ("bg-sky-50", "bg-[#FBE9EE]"),
    ("hover:text-sky-800", "hover:text-[#8A1A38]"),
    ("text-sky-800", "text-[#6D0F2B]"),
    ("text-sky-700", "text-[#8A1A38]"),
    ("text-sky-600", "text-[#6D0F2B]"),
    ("border-sky-300", "border-[#E0AEBB]"),
    ("border-sky-200", "border-[#F0CDD6]"),
    # violet (tombol Paste) -> maroon muda
    ("hover:bg-violet-100", "hover:bg-[#F5D9E0]"),
    ("bg-violet-50", "bg-[#FBE9EE]"),
    ("text-violet-700", "text-[#8A1A38]"),
    ("border-violet-300", "border-[#E0AEBB]"),
    # emerald -> gold
    ("hover:bg-emerald-700", "hover:bg-[#8F6E12]"),
    ("bg-emerald-600", "bg-[#B8912C]"),
    ("hover:bg-emerald-100", "hover:bg-[#F3E7BC]"),
    ("bg-emerald-50", "bg-[#FBF3DC]"),
    ("text-emerald-600", "text-[#8A6A12]"),
    ("text-emerald-700", "text-[#8A6A12]"),
    ("border-emerald-300", "border-[#E5D5A3]"),
    # green -> gold
    ("text-green-700", "text-[#8A6A12]"),
    ("bg-green-100", "bg-[#F5EAC4]"),
]

# slate sisanya -> stone (netral hangat)
SLATE_TO_STONE = re.compile(r"\b((?:hover:bg|hover:text|bg|text|border)-slate-)(\d{2,3})\b")

TEXT_MAP = [
    ("Sel biru = input manual. Sel hitam = formula otomatis.",
     "Sel kuning = input manual. Sel lainnya = formula otomatis."),
    ("Biru = omzet aktual. Abu-abu = belum ada data.",
     "Maroon = omzet aktual. Abu-abu = belum ada data."),
    ("Biru = omzet aktual bulan tersebut. Abu-abu = belum ada data.",
     "Maroon = omzet aktual bulan tersebut. Abu-abu = belum ada data."),
    ("Biru = ada data. Abu-abu = belum ada data.",
     "Maroon = ada data. Abu-abu = belum ada data."),
]

counts = {"specific": 0, "hex": 0, "class": 0, "stone": 0, "text": 0}

def process_line(ln: str) -> str:
    # lewati baris data COMBINED JSON
    if ln.startswith("const COMBINED = "):
        return ln
    for old, new in SPECIFIC:
        if old in ln:
            ln = ln.replace(old, new)
            counts["specific"] += 1
    for old, new in HEX_MAP:
        if old in ln:
            n = ln.count(old)
            ln = ln.replace(old, new)
            counts["hex"] += n
    for old, new in CLASS_MAP:
        if old in ln:
            n = ln.count(old)
            ln = ln.replace(old, new)
            counts["class"] += n
    ln2, n = SLATE_TO_STONE.subn(r"\1stone-\2", ln)
    if n:
        counts["stone"] += n
        ln = ln2
    for old, new in TEXT_MAP:
        if old in ln:
            ln = ln.replace(old, new)
            counts["text"] += 1
    return ln

out = [process_line(l) for l in lines]

with open(PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(out))

print("Replacements:", counts)

# --- Verifikasi: sisa warna lama di luar JSON? ---
leftover = []
with open(PATH, "r", encoding="utf-8") as f:
    for i, l in enumerate(f.read().split("\n"), 1):
        if l.startswith("const COMBINED = "):
            continue
        for h in ["#0ea5e9", "#0369a1", "#0284c7", "#22c55e", "#15803d", "#2563eb",
                  "#1e293b", "#475569", "#0f172a", "#dbeafe", "#bfdbfe", "#f1f5f9",
                  "#f8fafc", "#e2e8f0", "#cbd5e1", "#64748b", "#94a3b8"]:
            if h in l:
                leftover.append((i, h))
        for c in ["sky-", "violet-", "emerald-", "green-1", "green-7", "slate-900", "slate-100", "slate-700", "slate-800"]:
            if re.search(rf"\b[a-z:.-]*{re.escape(c)}", l):
                leftover.append((i, "class:" + c))
        if "Biru =" in l or "Sel biru" in l:
            leftover.append((i, "text:Biru"))
if leftover:
    print("LEFTOVER (harus kosong):")
    for i, w in leftover[:30]:
        print(" ", i, w)
    sys.exit(1)
print("OK: tidak ada warna lama tersisa di luar data JSON.")
