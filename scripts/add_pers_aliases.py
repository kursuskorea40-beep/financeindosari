#!/usr/bin/env python3
"""Add plain 'penerimaan'/'pengeluaran' aliases so 2-line headers
(Saldo Awal | Penerimaan | Pengeluaran | Saldo Akhir + Qty/Nilai sub-row) map better."""
from pathlib import Path

HTML = Path("/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html")
text = HTML.read_text(encoding="utf-8")

old1 = '"penerimaan qty", "mutasi masuk qty", "mutasi masuk", "in", "masuk"]'
new1 = '"penerimaan qty", "penerimaan", "mutasi masuk qty", "mutasi masuk", "in", "masuk"]'
assert text.count(old1) == 1, f"masukQty alias anchor count = {text.count(old1)}"
text = text.replace(old1, new1)
print("✓ masukQty: added 'penerimaan' alias")

old2 = '"pengeluaran qty", "mutasi keluar qty", "mutasi keluar", "out", "keluar"]'
new2 = '"pengeluaran qty", "pengeluaran", "mutasi keluar qty", "mutasi keluar", "out", "keluar"]'
assert text.count(old2) == 1, f"keluarQty alias anchor count = {text.count(old2)}"
text = text.replace(old2, new2)
print("✓ keluarQty: added 'pengeluaran' alias")

HTML.write_text(text, encoding="utf-8")
print(f"✓ Done! New size: {len(text):,} bytes")
