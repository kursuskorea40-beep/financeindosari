#!/usr/bin/env python3
"""Inspect embedded sheets via hfSheets (raw 2D values + formulas)."""
import json, re, sys

SRC = '/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html'
src = open(SRC, encoding='utf-8').read()
m = re.search(r'const COMBINED = (\{.*?\});\n', src, re.S)
data = json.loads(m.group(1))
es = data['excelSheets']
print("sheetOrder:", es['sheetOrder'])

def dump_sheet(name, max_row=30, max_col=16):
    hf = es['hfSheets'].get(name)
    if hf is None:
        print(f"\n### {name}: NOT in hfSheets"); return
    print(f"\n### {name} (hf rows={len(hf)}, cols={len(hf[0]) if hf else 0})")
    for r, row in enumerate(hf[:max_row], start=1):
        cells = []
        for ci, v in enumerate(row[:max_col]):
            if v is None or v == '': continue
            s = str(v)
            if len(s) > 42: s = s[:42] + '…'
            cells.append(f"{chr(64+ci+1)}{r}={s}")
        if cells:
            print('  ' + ' | '.join(cells))

for nm in sys.argv[1:] or ['Laba Rugi', 'Neraca']:
    dump_sheet(nm)
