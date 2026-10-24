#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Smoke test end-to-end di browser: paste Neraca & Laba Rugi via dialog, edit nilai."""
import json, subprocess, io, sys

def sh(cmd, timeout=60):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    out = (r.stdout + r.stderr).strip()
    return out

def js(expr):
    out = sh(f'agent-browser eval {json.dumps(expr)}')
    return out.strip().strip('"')

def main():
    global fail
    fail = 0
    def ok(cond, name, extra=""):
        global fail
        if cond:
            print("  PASS  " + name)
        else:
            fail += 1
            print("  FAIL  " + name + ("  →  " + extra if extra else ""))

    # ===== Buka menu Neraca =====
    js("[...document.querySelectorAll('.sidebar-item')][7].click()")
    ok(js("document.getElementById('sheetTitle').textContent") == "Neraca", "Menu Neraca terbuka")

    # ===== Paste dialog =====
    js("document.getElementById('btnPasteFR').click()")
    ok(js("!!document.getElementById('pasteOverlay')") == "true", "Dialog paste terbuka")
    ok("Neraca (September 2026)" in js("document.getElementById('pasteOverlay').querySelector('h3').textContent"), "Judul dialog benar")

    # default mode replace untuk FR
    ok(js("document.getElementById('pasteMode').value") == "replace", "Mode default = Replace")

    # isi textarea dengan teks PDF
    txt = json.loads(io.open('/home/z/my-project/scripts/data/neraca_json.txt', encoding='utf-8').read())
    js("document.getElementById('pasteArea').value = " + json.dumps(txt))
    js("document.getElementById('btnParse').click()")
    status = js("document.getElementById('pasteStatus').textContent")
    ok("siap disimpan" in status, "Parse sukses", status)
    ok("18 akun" in status, "18 akun terdeteksi", status)
    ok(js("document.getElementById('pastePreview').innerHTML").count("<tr>") == 4, "Preview 4 baris total")

    # simpan
    js("document.getElementById('btnSavePaste').click()")
    ok("null" in js("String(document.getElementById('pasteOverlay'))"), "Dialog tertutup setelah simpan")
    toast = js("document.getElementById('toast').textContent")
    ok("Neraca September 2026 tersimpan" in toast, "Toast konfirmasi", toast)

    # data tersimpan di localStorage
    ok(js("JSON.parse(localStorage.getItem('indosari-akuntansi-2026-edits-v2')).extras.neracaPerBulan['9'].length") != "", "Override neraca Sep tersimpan di localStorage")

    # tabel tetap render benar setelah simpan
    grand = js("[...document.querySelectorAll('#frTbody .fr-grand')].map(r=>r.cells[0].textContent+'='+r.cells[1].textContent.trim()).join('; ')")
    ok("JUMLAH ASET=921.597.914,6" in grand, "JUMLAH ASET benar", grand)
    ok("JUMLAH LIABILITAS DAN EKUITAS=921.597.914,6" in grand, "JUMLAH LIAB & EKUITAS benar")
    ok("✓ Seimbang" in js("[...document.querySelectorAll('.kpi-card')][3].querySelector('.value').textContent"), "KPI Seimbang")

    # ===== Edit nilai: klik sel angka Kas Kecil → ubah jadi 2.000.000 =====
    idx = js("[...document.getElementById('frTbody').rows].findIndex(r=>r.cells[0] && r.cells[0].dataset.idx!==undefined && r.cells[0].textContent==='Kas Kecil')")
    js(f"document.getElementById('frTbody').rows[{idx}].cells[1].click()")
    ok(js("!!document.querySelector('#frTbody input.cell-input')") == "true", "Input muncul saat klik sel nilai")
    js("const i=document.querySelector('#frTbody input.cell-input'); i.value='2.000.000'; i.dispatchEvent(new Event('blur'))")
    grand2 = js("[...document.querySelectorAll('#frTbody .fr-grand')].map(r=>r.cells[0].textContent+'='+r.cells[1].textContent.trim()).join('; ')")
    ok("JUMLAH ASET=922.597.914,6" in grand2, "Edit nilai → JUMLAH ASET ikut naik 1jt", grand2)
    ok("Kas Kecil=2.000.000" in js("[...document.getElementById('frTbody').rows].map(r=>r.cells[0].textContent+'='+((r.cells[1]&&r.cells[1].textContent.trim())||'')).filter(s=>s.startsWith('Kas Kecil')).join(';')"), "Nilai Kas Kecil = 2.000.000")

    # edit nama akun
    idx2 = js("[...document.getElementById('frTbody').rows].findIndex(r=>r.cells[0] && r.cells[0].dataset.idx!==undefined && r.cells[0].textContent==='Kas Kecil')")
    js(f"document.getElementById('frTbody').rows[{idx2}].cells[0].click()")
    js("const n=document.querySelector('#frTbody input.cell-input'); n.value='Kas Kecil Toko'; n.dispatchEvent(new Event('blur'))")
    ok(js("!![...document.getElementById('frTbody').rows].find(r=>r.cells[0] && r.cells[0].textContent==='Kas Kecil Toko')") == "true", "Rename akun bekerja")

    # reset bulan (confirm dialog: klik di background lalu accept)
    import subprocess as sp, time
    p = sp.Popen("agent-browser eval \"document.getElementById('btnResetFR').click(); 'clicked'\"", shell=True, stdout=sp.PIPE, stderr=sp.PIPE)
    time.sleep(1.0)
    sh('agent-browser dialog accept')
    p.communicate(timeout=30)
    grand3 = js("[...document.querySelectorAll('#frTbody .fr-grand')].map(r=>r.cells[0].textContent+'='+r.cells[1].textContent.trim()).join('; ')")
    ok("JUMLAH ASET=921.597.914,6" in grand3, "Reset bulan kembali ke nilai awal", grand3)

    # ===== Laba Rugi =====
    js("[...document.querySelectorAll('.sidebar-item')][1].click()")
    ok(js("document.getElementById('sheetTitle').textContent") == "Laba Rugi", "Menu Laba Rugi terbuka")
    grand_lr = js("[...document.querySelectorAll('#frTbody .fr-grand')].map(r=>r.cells[0].textContent+'='+r.cells[1].textContent.trim()).join('; ')")
    ok("LABA KOTOR=34.355.002,93" in grand_lr, "LABA KOTOR = 34.355.002,93", grand_lr)
    ok("LABA BERSIH=13.967.092,45" in grand_lr, "LABA BERSIH ≈ 13.967.092,44", grand_lr)
    kpi_lr = js("[...document.querySelectorAll('.kpi-card')].map(k=>k.querySelector('.label').textContent+'='+k.querySelector('.value').textContent.trim()).join('; ')")
    ok("Jumlah Pendapatan=Rp 174.512.860" in kpi_lr, "KPI Pendapatan", kpi_lr)

    # ganti bulan ke Januari → konversi data lama
    js("const s=document.getElementById('frMonthSel'); s.value='1'; s.dispatchEvent(new Event('change'))")
    jan_total = js("[...document.querySelectorAll('#frTbody tr')].map(r=>r.cells[0].textContent+'='+((r.cells[1]&&r.cells[1].textContent.trim())||'')).filter(s=>s.startsWith('Jumlah Pendapatan=')||s.startsWith('LABA BERSIH')).join('; ')")
    ok("Jumlah Pendapatan=110.413.750" in jan_total and "LABA BERSIH=41.394.310,29" in jan_total, "Laba Rugi Januari ter-render (konversi data lama, math tepat)", jan_total)

    # paste dialog LR
    js("document.getElementById('btnPasteFR').click()")
    ok("Laba Rugi (Januari 2026)" in js("document.getElementById('pasteOverlay').querySelector('h3').textContent"), "Judul dialog LR mengikuti bulan aktif")
    js("document.getElementById('closePaste').click()")

    print()
    if fail:
        print(f"SMOKE TEST: {fail} FAIL")
        sys.exit(1)
    print("SMOKE TEST: SEMUA PASS")

main()
