#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Smoke test browser: tema maroon + fitur Paste dari Accurate di menu Piutang & Hutang."""
import json, io, time, sys
import subprocess as sp

def sh(cmd, timeout=60):
    r = sp.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return (r.stdout + r.stderr).strip()

def js(expr):
    return sh(f'agent-browser eval {json.dumps(expr)}').strip().strip('"')

fail = 0
def ok(cond, name, extra=""):
    global fail
    if cond:
        print("  PASS  " + name)
    else:
        fail += 1
        print("  FAIL  " + name + ("  →  " + str(extra) if extra else ""))

# mulai dari keadaan bersih (idempoten)
js("localStorage.clear()")
js("location.reload()")
time.sleep(3)

print("[1] TEMA WARNA MAROON")
# body bg cream
ok(js("getComputedStyle(document.body).backgroundColor") == "rgb(246, 241, 233)", "Body latar cream #F6F1E9", js("getComputedStyle(document.body).backgroundColor"))
# sidebar maroon gelap
ok(js("getComputedStyle(document.querySelector('aside')).backgroundColor") == "rgb(71, 10, 29)", "Sidebar maroon gelap #470A1D")
# logo chip gold
ok(js("getComputedStyle(document.querySelector('aside .size-9')).backgroundColor") == "rgb(212, 167, 44)", "Logo chip gold #D4A72C")
# aktif item sidebar maroon
ok(js("getComputedStyle(document.querySelector('.sidebar-item.active')).backgroundColor") == "rgb(109, 15, 43)", "Sidebar item aktif maroon #6D0F2B")
# th tabel dash maroon (buka menu Piutang dulu nanti; cek CSS rule via stylesheet)
ok(js("[...document.styleSheets[document.styleSheets.length-1].cssRules].some(r=>r.cssText && r.cssText.includes('table.dash-table th { background: rgb(109, 15, 43)')) || [...document.styleSheets[document.styleSheets.length-1].cssRules].some(r=>r.cssText && r.cssText.replace(/\\s+/g,' ').includes('table.dash-table th { background: #6D0F2B'))"), "CSS th dash-table maroon #6D0F2B")
# tidak ada warna sky tersisa di kelas
ok(js("[...document.querySelectorAll('[class]')].some(e=>/sky-|emerald-|violet-/.test(e.className))") == "false", "Tidak ada kelas sky/emerald/violet tersisa di DOM")

print("[2] MENU PIUTANG — tombol Paste + dialog")
js("[...document.querySelectorAll('.sidebar-item')][5].click()")
ok(js("document.getElementById('sheetTitle').textContent") == "Piutang", "Menu Piutang terbuka")
ok(js("!!document.getElementById('btnPastePiu')") == "true", "Tombol Paste dari Accurate ada")
ok(js("document.getElementById('btnPastePiu').textContent").find("Paste dari Accurate") >= 0, "Label tombol benar")
# hint faktur kosong tampil
ok("Belum ada data faktur piutang" in js("document.getElementById('sheetContainer').textContent"), "Hint faktur kosong tampil")

js("document.getElementById('btnPastePiu').click()")
ok(js("!!document.getElementById('pasteOverlay')") == "true", "Dialog paste terbuka")
ok("Piutang" in js("document.getElementById('pasteOverlay').querySelector('h3').textContent"), "Judul dialog Piutang")
ok(js("document.getElementById('pasteMode').value") == "replace", "Mode default Replace")
ok("Daftar Piutang Usaha" in js("document.getElementById('pasteOverlay').textContent"), "Nama laporan Daftar Piutang Usaha disebut")

teks_piu = """INDOSARI
Daftar Piutang Usaha
Per Tgl. 30 Sep 2026

TOKO MAKMUR SEJAHTERA
SI.2026.08.00012  15 Aug 2026  14 Sep 2026  12.500.000  0  12.500.000
SI.2026.09.00031  05 Sep 2026  05 Okt 2026  8.750.000  0  8.750.000

CV SINAR JAYA
SI.2026.07.00004  20 Jul 2026  19 Nov 2026  21.250.000  5.000.000  16.250.000"""
js("document.getElementById('pasteArea').value = " + json.dumps(teks_piu))
js("document.getElementById('btnParse').click()")
status = js("document.getElementById('pasteStatus').textContent")
ok("3 faktur" in status and "siap disimpan" in status, "Parse sukses 3 faktur", status)
ok(js("document.getElementById('pastePreview').querySelectorAll('tbody tr').length") == "3", "Preview 3 baris faktur", js("document.getElementById('pastePreview').querySelectorAll('tbody tr').length"))

js("document.getElementById('btnSavePaste').click()")
time.sleep(0.5)
ok("null" in js("String(document.getElementById('pasteOverlay'))"), "Dialog tertutup setelah simpan")
toast = js("document.getElementById('toast').textContent")
ok("faktur piutang tersimpan" in toast, "Toast konfirmasi", toast)

# tabel faktur piutang tampil
body_txt = js("document.getElementById('sheetContainer').textContent")
ok("Faktur Piutang Belum Lunas" in body_txt, "Tabel Faktur Piutang tampil")
ok("TOKO MAKMUR SEJAHTERA" in body_txt and "SI.2026.08.00012" in body_txt, "Data faktur tampil")
ok("TERLEWAT" in js("document.getElementById('sheetContainer').textContent") or "TERLEWAT" in body_txt, "Status TERLEWAT tampil (JT lewat)")
ok("BERJALAN" in body_txt, "Status BERJALAN tampil (JT 19 Nov belum lewat)")
ok("Rp 37.500.000" in body_txt, "Total sisa Rp 37.500.000 tampil")
# tersimpan di localStorage
ok(js("JSON.parse(localStorage.getItem('indosari-akuntansi-2026-edits-v2')).extras.piutangFaktur.length") == "3", "piutangFaktur tersimpan di localStorage (3)")
# statusBar berisi info faktur
ok("Faktur Piutang Belum Lunas" in js("document.getElementById('statusBar').textContent"), "StatusBar memuat info faktur")

print("[3] MENU HUTANG — tombol Paste + dialog + reset")
js("[...document.querySelectorAll('.sidebar-item')][6].click()")
ok(js("document.getElementById('sheetTitle').textContent") == "Hutang", "Menu Hutang terbuka")
ok(js("!!document.getElementById('btnPasteHut')") == "true", "Tombol Paste dari Accurate ada")
ok("hasil paste Accurate" in js("document.getElementById('sheetContainer').textContent") or "per 30 Sep 2026" in js("document.getElementById('sheetContainer').textContent"), "Judul tabel faktur hutang ada")

js("document.getElementById('btnPasteHut').click()")
ok("Hutang" in js("document.getElementById('pasteOverlay').querySelector('h3').textContent"), "Judul dialog Hutang")
ok("Daftar Utang Usaha" in js("document.getElementById('pasteOverlay').textContent"), "Nama laporan Daftar Utang Usaha disebut")

teks_hut = """INDOSARI
Daftar Utang Usaha
Per Tgl. 30 Sep 2026

BINTANG TIMUR MITRA ABADI, PT
PI.2026.08.000146  24 Aug 2026  23 Sep 2026  8.108.108,11  0  8.108.108,11
PI.2026.09.000162  16 Sep 2026  16 Okt 2026  8.108.108,11  0  8.108.108,11

BIRAN
PI.2026.08.000145  22 Aug 2026  21 Sep 2026  550.000  0  550.000"""
js("document.getElementById('pasteArea').value = " + json.dumps(teks_hut))
js("document.getElementById('btnParse').click()")
status = js("document.getElementById('pasteStatus').textContent")
ok("3 faktur" in status and "siap disimpan" in status, "Parse hutang sukses", status)
js("document.getElementById('btnSavePaste').click()")
time.sleep(0.5)
body_txt2 = js("document.getElementById('sheetContainer').textContent")
ok("hasil paste Accurate" in body_txt2, "Judul tabel faktur → hasil paste Accurate")
ok("BINTANG TIMUR MITRA ABADI, PT" in body_txt2 and "PI.2026.08.000146" in body_txt2, "Faktur supplier tampil")
ok("Rp 16.766.216" in body_txt2, "Total hutang Rp 16.766.216 tampil")
ok(js("JSON.parse(localStorage.getItem('indosari-akuntansi-2026-edits-v2')).extras.fakturBelumLunas.length") == "3", "fakturBelumLunas override tersimpan (3)")
# tombol Reset Edit muncul karena ada override faktur
ok(js("!!document.getElementById('btnResetHut')") == "true", "Reset Edit muncul (ada override faktur)")

# reset (dengan dialog confirm)
p = sp.Popen('agent-browser eval "document.getElementById(\'btnResetHut\').click(); \'clicked\'"', shell=True, stdout=sp.PIPE, stderr=sp.PIPE)
time.sleep(1.2)
sh('agent-browser dialog accept')
p.communicate(timeout=30)
time.sleep(0.5)
ok(js("String(localStorage.getItem('indosari-akuntansi-2026-edits-v2')).includes('fakturBelumLunas')") == "false", "Reset menghapus override faktur hutang dari localStorage")
ok(js("String(JSON.parse(localStorage.getItem('indosari-akuntansi-2026-edits-v2')).extras.fakturBelumLunas)") in ("undefined", ""), "Faktur kembali ke data Excel bawaan (22 faktur)")

print("[4] RESET PIUTANG")
js("[...document.querySelectorAll('.sidebar-item')][5].click()")
p = sp.Popen('agent-browser eval "document.getElementById(\'btnResetPiu\').click(); \'clicked\'"', shell=True, stdout=sp.PIPE, stderr=sp.PIPE)
time.sleep(1.2)
sh('agent-browser dialog accept')
p.communicate(timeout=30)
time.sleep(0.5)
ok(js("String(JSON.parse(localStorage.getItem('indosari-akuntansi-2026-edits-v2')).extras.piutangFaktur)") in ("undefined", ""), "Reset piutang menghapus faktur paste")
ok("Belum ada data faktur piutang" in js("document.getElementById('sheetContainer').textContent"), "Kembali ke hint faktur kosong")

print("[5] REGRESI RINGKAS: menu lain masih render")
for idx, name in [(0, "Dashboard"), (1, "Laba Rugi"), (2, "Penjualan"), (3, "Pembelian"), (4, "Persediaan"), (7, "Neraca"), (8, "Master Data")]:
    js(f"[...document.querySelectorAll('.sidebar-item')][{idx}].click()")
    ok(js("document.getElementById('sheetContainer').children.length") not in ("0",), f"{name} render OK")
# cek KPI dashboard pakai gradient maroon
js("[...document.querySelectorAll('.sidebar-item')][1].click()")
ok(js("getComputedStyle(document.querySelector('.kpi-card.primary')).backgroundImage").find("rgb(109, 15, 43)") >= 0, "KPI primary gradient maroon")

print()
if fail:
    print(f"SMOKE TEST: {fail} FAIL")
    sys.exit(1)
print("SMOKE TEST: SEMUA PASS")
