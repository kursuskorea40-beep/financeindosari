#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Patch kecil: tambah FR_SKIP_NAMES ke HTML yang sudah terinjeksi modul FR."""
import io

HTML = "/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html"

OLD_ALIAS = '''const NERACA_ALIAS = {
  "hutang usaha": "utang usaha",
  "kas": "kas kecil",
  "utang dagang": "utang usaha",
};'''
NEW_ALIAS = OLD_ALIAS + '''
// Nama subtotal induk di Accurate yang TIDAK ada sebagai header template
// (nilainya = jumlah anak, jadi dilewati agar tidak dobel hitung)
const FR_SKIP_NAMES = new Set(["kas & bank", "nilai histori"]);'''

OLD_CHECK = '''    if (totalByName[nm]) continue;                         // LABA KOTOR, Modal, dsb → auto-hitung
    if (headerByName[nm] && !resolveItem(nm)) continue;    // subtotal induk (nama = judul bagian)'''
NEW_CHECK = '''    if (totalByName[nm]) continue;                         // LABA KOTOR, Modal, dsb → auto-hitung
    if (FR_SKIP_NAMES.has(nm)) continue;                   // subtotal induk non-template (mis. Kas & Bank)
    if (headerByName[nm] && !resolveItem(nm)) continue;    // subtotal induk (nama = judul bagian)'''

def main():
    with io.open(HTML, "r", encoding="utf-8") as f:
        html = f.read()
    for name, old, new in [("alias", OLD_ALIAS, NEW_ALIAS), ("check", OLD_CHECK, NEW_CHECK)]:
        assert html.count(old) == 1, f"anchor {name} tidak unik: {html.count(old)}"
        html = html.replace(old, new, 1)
        print(f"[OK] patch {name}")
    with io.open(HTML, "w", encoding="utf-8") as f:
        f.write(html)
    print("Done.")

if __name__ == "__main__":
    main()
