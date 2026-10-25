#!/usr/bin/env python3
"""Extract masterBarang/masterSupplier/masterPelanggan from INDOSARI_Akuntansi_2026_perbulan.html
embedded JSON, save to scripts/data/akuntansi_master_export.json for seeding the web app."""
import json
import re
import sys
from pathlib import Path

HTML = Path("/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html")
OUT = Path("/home/z/my-project/scripts/data/akuntansi_master_export.json")
OUT.parent.mkdir(parents=True, exist_ok=True)

text = HTML.read_text(encoding="utf-8")
# Find the embedded JSON: starts after `<script>` near the COMBINED JSON data line.
# Pattern: a huge JSON literal somewhere inline.
m = re.search(r'(\{"sheets"\s*:\s*\{.*?"extras"\s*:\s*\{.*?\}.*?"excelSheets"\s*:\s*\{.*?\}\s*\})\s*[,;]', text, re.DOTALL)
if not m:
    # Try simpler pattern - just find the first { with "sheets":
    # Actually the embedded data is on a single line.
    # Find pattern: masterBarang":[
    pass

# Try simpler approach: find JSON literal starting with {"sheets":
# Heuristic: find position of `const COMBINED = ` then locate first `{` and walk balanced braces.
marker_pos = text.find('const COMBINED = ')
if marker_pos < 0:
    # Fallback: look for {"excelSheets":
    start = text.find('{"excelSheets":')
else:
    start = text.find('{', marker_pos)
if start < 0:
    print("Could not find COMBINED JSON start")
    sys.exit(1)

# Walk balanced braces from `start`
depth = 0
end = -1
in_string = False
escape = False
for i in range(start, len(text)):
    ch = text[i]
    if escape:
        escape = False
        continue
    if ch == '\\' and in_string:
        escape = True
        continue
    if ch == '"' and not escape:
        in_string = not in_string
        continue
    if in_string:
        continue
    if ch == '{':
        depth += 1
    elif ch == '}':
        depth -= 1
        if depth == 0:
            end = i + 1
            break

if end < 0:
    print("Could not find balanced JSON end")
    sys.exit(1)

raw_json = text[start:end]
print(f"Extracted JSON: {len(raw_json)} chars")

try:
    data = json.loads(raw_json)
except json.JSONDecodeError as e:
    print(f"JSON parse error: {e}")
    sys.exit(1)

extras = data.get("extras", {})
mb = extras.get("masterBarang", [])
ms = extras.get("masterSupplier", [])
mp = extras.get("masterPelanggan", [])

print(f"masterBarang: {len(mb)}")
print(f"masterSupplier: {len(ms)}")
print(f"masterPelanggan: {len(mp)}")
if mb:
    print(f"  sample barang: {mb[0]}")
if ms:
    print(f"  sample supplier: {ms[0]}")
if mp:
    print(f"  sample pelanggan: {mp[0]}")

# Normalize: masterBarang = [{kode, nama, satuan}], supplier/pelanggan = [{nama, alamat?, telp?}]
out = {
    "masterBarang": [{"kode": b.get("kode", ""), "nama": b.get("nama", ""), "satuan": b.get("satuan", "")} for b in mb],
    "masterSupplier": [{"nama": s.get("nama", ""), "alamat": s.get("alamat", ""), "telp": s.get("telp", "")} for s in ms],
    "masterPelanggan": [{"nama": p.get("nama", ""), "alamat": p.get("alamat", ""), "telp": p.get("telp", "")} for p in mp],
}
OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\nSaved to: {OUT}")
print(f"Total: {len(out['masterBarang'])} barang, {len(out['masterSupplier'])} supplier, {len(out['masterPelanggan'])} pelanggan")
