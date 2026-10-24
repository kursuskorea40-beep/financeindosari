#!/usr/bin/env python3
# Split menu "Piutang & Utang" menjadi dua menu sendiri: "Piutang" dan "Hutang"
# - Ganti entry SIDEBAR_ITEMS
# - Perbaiki hideToolbar (custom view tidak butuh toolbar Export/Import)
# - Ganti dispatch case piutangUtang -> piutang + hutang
# - Ganti section 12 (renderPiutangUtang) dengan renderPiutang + renderHutang + helpers
# - Tambah CSS editable cell untuk dash-table
import sys

PATH = "/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html"
NEW_SECTION_PATH = "/home/z/my-project/scripts/section12_new.js"

with open(PATH, "r", encoding="utf-8") as f:
    html = f.read()
with open(NEW_SECTION_PATH, "r", encoding="utf-8") as f:
    new_section = f.read()

def sub_once(s, old, new, label):
    n = s.count(old)
    assert n == 1, f"[{label}] expected 1 occurrence, found {n}: {old[:70]!r}"
    print(f"  OK  {label}")
    return s.replace(old, new)

# 1) CSS: editable cell untuk dash-table + total-row
html = sub_once(
    html,
    "  table.dash-table tr.active-row { background: #fef3c7; }",
    "  table.dash-table tr.active-row { background: #fef3c7; }\n"
    "  table.dash-table td.input { background-color: #fef9c3; cursor: text; }\n"
    "  table.dash-table td.input:hover { background-color: #fde047; }\n"
    "  table.dash-table td input.cell-input { width: 100%; background: transparent; border: 0; outline: 0; padding: 0; font: inherit; color: inherit; text-align: right; }\n"
    "  table.dash-table tr.total-row td { background: #fef3c7; font-weight: 700; }",
    "CSS dash-table editable + total-row",
)

# 2) SIDEBAR_ITEMS: pisah jadi dua menu
html = sub_once(
    html,
    '  { key: "piutang-utang",     label: "Piutang & Utang",    desc: "+ faktur belum lunas",       icon: "💰", custom: "piutangUtang" },',
    '  { key: "piutang",           label: "Piutang",            desc: "Piutang usaha + tunai/kredit", icon: "💰", custom: "piutang" },\n'
    '  { key: "hutang",            label: "Hutang",             desc: "Hutang usaha + faktur",      icon: "💸", custom: "hutang" },',
    "SIDEBAR_ITEMS split",
)

# 3) hideToolbar: semua custom view sembunyikan toolbar (export/import csv hanya untuk sheet Excel)
html = sub_once(
    html,
    '  const hideToolbar = isCustom && item.custom !== "piutangUtang";',
    '  const hideToolbar = isCustom;',
    "hideToolbar fix",
)

# 4) Dispatch switch
html = sub_once(
    html,
    '      case "piutangUtang": return renderPiutangUtang();',
    '      case "piutang": return renderPiutang();\n      case "hutang": return renderHutang();',
    "render dispatch",
)

# 5) Ganti section 12 dengan renderPiutang + renderHutang
start_marker = (
    "// ============================================================\n"
    "// 12. PIUTANG & UTANG — with embedded Faktur Belum Lunas\n"
    "// ============================================================\n"
    "function renderPiutangUtang() {"
)
end_marker = (
    "// ============================================================\n"
    "// 13. MASTER DATA"
)
i = html.find(start_marker)
assert i >= 0, "start marker section 12 tidak ditemukan"
j = html.find(end_marker, i)
assert j > i, "end marker section 13 tidak ditemukan"
html = html[:i] + new_section.rstrip("\n") + "\n\n" + html[j:]
print("  OK  section 12 -> renderPiutang + renderHutang")

# Verifikasi: tidak ada sisa referensi lama
for leftover in ["piutangUtang", "renderPiutangUtang", '"piutang-utang"']:
    cnt = html.count(leftover)
    assert cnt == 0, f"Masih ada {cnt} referensi '{leftover}'"
print("  OK  tidak ada sisa referensi piutangUtang / piutang-utang")

with open(PATH, "w", encoding="utf-8") as f:
    f.write(html)
print(f"Saved: {PATH} ({len(html)} chars)")
