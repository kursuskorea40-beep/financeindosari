#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Integrasi modul Laba Rugi & Neraca (format Accurate) ke HTML INDOSARI."""
import io, sys, re

HTML = "/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html"
MODULE = "/home/z/my-project/scripts/fr_module.js"

def main():
    with io.open(HTML, "r", encoding="utf-8") as f:
        html = f.read()
    with io.open(MODULE, "r", encoding="utf-8") as f:
        module = f.read().rstrip() + "\n"

    orig = html

    # ---------- 1. Ganti section 9 (Laba Rugi debit/kredit lama) ----------
    start_marker = "// ============================================================\n// 9. LABA RUGI"
    end_marker = "// ============================================================\n// 10. RINCIAN PENJUALAN"
    si = html.find(start_marker)
    ei = html.find(end_marker)
    assert si >= 0, "marker section 9 tidak ditemukan"
    assert ei > si, "marker section 10 tidak ditemukan"
    html = html[:si] + module + "\n" + html[ei:]
    print("[1] Section 9 (Laba Rugi lama) diganti modul baru (%d chars -> %d chars)" % (ei - si, len(module)))

    # ---------- 2. Sidebar: Neraca excel -> custom ----------
    old_side = '  { key: "Neraca",            label: "Neraca",             desc: "Aktiva, Kewajiban, Ekuitas", icon: "⚖️", excel: true },'
    new_side = '  { key: "neraca",            label: "Neraca",             desc: "Per bulan, editable + paste", icon: "⚖️", custom: "neraca" },'
    assert html.count(old_side) == 1, "sidebar Neraca tidak unik"
    html = html.replace(old_side, new_side, 1)
    print("[2] Sidebar Neraca -> custom")

    # ---------- 3. Dispatch render ----------
    old_disp = '      case "hutang": return renderHutang();'
    new_disp = '      case "hutang": return renderHutang();\n      case "neraca": return renderNeraca();'
    assert html.count(old_disp) == 1, "dispatch hutang tidak unik"
    html = html.replace(old_disp, new_disp, 1)
    print("[3] Dispatch renderNeraca ditambahkan")

    # ---------- 4. Dialog Paste Accurate: flags ----------
    old_flags = '''  // type: "penjualan" | "pembelian" | "persediaan"
  const isJual = type === "penjualan";
  const isBeli = type === "pembelian";
  const isPers = type === "persediaan";
  let reportName, title, placeholder, tips, formatUmum;
  if (isPers) {'''
    new_flags = '''  // type: "penjualan" | "pembelian" | "persediaan" | "labarugi" | "neraca"
  const isJual = type === "penjualan";
  const isBeli = type === "pembelian";
  const isPers = type === "persediaan";
  const isLR = type === "labarugi";
  const isNer = type === "neraca";
  const isFR = isLR || isNer;
  let reportName, title, placeholder, tips, formatUmum;
  if (isFR) {
    const nmBulan = BULAN_NAMES[(opts.month || (isLR ? lrMonth : neracaMonth)) - 1];
    reportName = isLR ? "Laba/Rugi (Standar)" : "Neraca (Standar)";
    title = `Paste dari Laporan Accurate — ${isLR ? "Laba Rugi" : "Neraca"} (${nmBulan} 2026)`;
    placeholder = isLR
      ? "Contoh format yang akan diparse:\\n\\nINDOSARI\\nLaba/Rugi (Standar)\\nDari 01 Sep 2026 s/d 30 Sep 2026\\n\\nPENDAPATAN\\nPendapatan Operasional 174.512.860\\nPenjualan 174.564.635\\nDiskon Penjualan -51.775\\nJumlah Pendapatan 174.512.860\\nBEBAN POKOK PENJUALAN\\nBeban Pokok Penjualan 140.157.857,07\\nLABA KOTOR 34.355.002,93\\nBEBAN OPERASIONAL\\nBeban Gaji & Upah 21.000.000\\nBeban Listrik 782.931\\n..."
      : "Contoh format yang akan diparse:\\n\\nINDOSARI\\nNeraca (Standar)\\nPer Tgl. 30 Sep 2026\\n\\nASET\\nASET LANCAR\\nKas dan Setara Kas\\nKas & Bank 15.687.880,5\\nKas Kecil 1.000.000\\nKas Besar 14.468.580,5\\nBank 280.000\\nSelisih kas & Bank -60.700\\nJumlah Kas dan Setara Kas 15.687.880,5\\nPiutang Usaha 36.769.260\\n...";
    tips = "Baris Jumlah/LABA/JUMLAH (total) tidak perlu dipaste — semuanya auto-hitung ulang dari akun. Akun yang tidak dikenal otomatis ditambahkan ke bagian terdekat. Saldo anak ber-suffix mata uang (mis. \\"Piutang Usaha IDR\\") otomatis digabung ke akun induknya agar tidak dobel.";
    formatUmum = "baris \\"Nama Akun + Angka\\" (format Indonesia: titik=ribuan, koma=desimal, angka dalam kurung=negatif). Nama bagian tanpa angka (PENDAPATAN, ASET, dsb.) dipakai sebagai konteks.";
  } else if (isPers) {'''
    assert html.count(old_flags) == 1, "anchor flags dialog tidak unik"
    html = html.replace(old_flags, new_flags, 1)
    print("[4] Flags & config dialog FR ditambahkan")

    # ---------- 5. Dialog: teks jumlah item/transaksi ----------
    old_w = "<li>Pastikan jumlah ${isPers ? 'item' : 'transaksi'} & total nilai sesuai harapan, lalu klik <b>Simpan</b>.</li>"
    new_w = "<li>Pastikan jumlah ${isPers ? 'item' : (isFR ? 'akun' : 'transaksi')} & total nilai sesuai harapan, lalu klik <b>Simpan</b>.</li>"
    assert html.count(old_w) == 1, "anchor wording tidak unik"
    html = html.replace(old_w, new_w, 1)
    print("[5] Wording dialog diupdate")

    # ---------- 6. Dialog: pasteMode default untuk FR = replace ----------
    old_mode = '''            <select id="pasteMode" class="border border-slate-300 rounded px-2 py-1.5 text-xs">
              <option value="append">${isPers ? "Append (gabung per KODE)" : "Append (tambah ke data lama)"}</option>
              <option value="replace">Replace (ganti semua data)</option>
            </select>'''
    new_mode = '''            <select id="pasteMode" class="border border-slate-300 rounded px-2 py-1.5 text-xs">
              <option value="append" ${isFR ? "" : "selected"}>${isPers ? "Append (gabung per KODE)" : (isFR ? "Append (gabung per akun)" : "Append (tambah ke data lama)")}</option>
              <option value="replace" ${isFR ? "selected" : ""}>Replace (ganti semua data)</option>
            </select>'''
    assert html.count(old_mode) == 1, "anchor pasteMode tidak unik"
    html = html.replace(old_mode, new_mode, 1)
    print("[6] pasteMode default FR = Replace")

    # ---------- 7. Dialog: dispatch parse ----------
    old_parse = '''      if (isPers) {
        parsedTxs = parseAccuratePersediaanText(text);
      } else if (isJual) {'''
    new_parse = '''      if (isLR) {
        parsedTxs = parseAccurateLabaRugiText(text);
      } else if (isNer) {
        parsedTxs = parseAccurateNeracaText(text);
      } else if (isPers) {
        parsedTxs = parseAccuratePersediaanText(text);
      } else if (isJual) {'''
    assert html.count(old_parse) == 1, "anchor parse dispatch tidak unik"
    html = html.replace(old_parse, new_parse, 1)
    print("[7] Dispatch parser FR ditambahkan")

    # ---------- 8. Dialog: preview FR ----------
    old_prev = '''      if (isPers) {
        // Preview for persediaan'''
    new_prev = '''      if (isFR) {
        // Preview untuk Laba Rugi / Neraca
        const itemsFR = parsedTxs.filter(r => r.t === "item");
        const customFR = itemsFR.filter(r => r.custom);
        const TV = (id) => { const rr = parsedTxs.find(x => x.id === id); return rr ? frTotalValue(rr, parsedTxs) : 0; };
        const kpiRows = isLR ? [
          ["Jumlah Pendapatan", TV("jp")], ["Laba Kotor", TV("lk")],
          ["Pendapatan Operasional", TV("po")], ["LABA BERSIH", TV("lb")],
        ] : [
          ["JUMLAH ASET", TV("jas")], ["JUMLAH KEWAJIBAN", TV("jk")],
          ["Jumlah Ekuitas", TV("jek")], ["Selisih (harus 0)", TV("jas") - TV("jle")],
        ];
        document.getElementById("pastePreview").innerHTML =
          `<p class="text-xs text-slate-600 mb-2"><b>${itemsFR.length} akun</b> terisi (${customFR.length} akun baru otomatis ditambahkan) · Total auto-hitung:</p>
          <table class="tx-table"><tbody>
            ${kpiRows.map(([k, v]) => `<tr><td>${k}</td><td class="num"><b>Rp ${fmtFRNum(v)}</b></td></tr>`).join("")}
          </tbody></table>`;
        document.getElementById("pastePreview").classList.remove("hidden");
        document.getElementById("pasteStatus").innerHTML = `<span class="text-emerald-600">✓ Template ${isLR ? "Laba Rugi" : "Neraca"} siap disimpan (${itemsFR.length} akun, ${customFR.length} baru)</span>`;
      } else if (isPers) {
        // Preview for persediaan'''
    assert html.count(old_prev) == 1, "anchor preview tidak unik"
    html = html.replace(old_prev, new_prev, 1)
    print("[8] Preview FR ditambahkan")

    # ---------- 9. Dialog: save FR ----------
    old_save = '''    if (isPers) {
      // Save persediaan'''
    new_save = '''    if (isFR) {
      const month = opts.month || (isLR ? lrMonth : neracaMonth);
      const existing = isLR ? getLabaRugiBulan(month) : getNeracaBulan(month);
      const newRows = mode === "replace" ? parsedTxs : frMergeRows(existing, parsedTxs);
      if (isLR) saveLabaRugiBulan(month, newRows); else saveNeracaBulan(month, newRows);
      close();
      render();
      showToast(`✓ ${isLR ? "Laba Rugi" : "Neraca"} ${BULAN_NAMES[month - 1]} 2026 tersimpan`);
    } else if (isPers) {
      // Save persediaan'''
    assert html.count(old_save) == 1, "anchor save tidak unik"
    html = html.replace(old_save, new_save, 1)
    print("[9] Save FR ditambahkan")

    # ---------- 10. CSS fr-table ----------
    css_anchor = "  table.lr-table { border-collapse: collapse; width: 100%; font-size: 0.85rem; }"
    css_new = '''  /* fr-table: Laba Rugi & Neraca format Accurate */
  table.fr-table { border-collapse: collapse; width: 100%; font-size: 0.82rem; }
  table.fr-table thead th { background: #1e293b; color: #fff; padding: 8px 12px; font-weight: 600; text-align: left; }
  table.fr-table td { border-bottom: 1px solid #e2e8f0; padding: 5px 12px; vertical-align: middle; }
  table.fr-table tr.fr-hdr td { background: #f1f5f9; font-weight: 700; color: #0f172a; }
  table.fr-table tr.fr-hdr.major td { background: #e2e8f0; letter-spacing: .02em; }
  table.fr-table td.fr-name { cursor: text; }
  table.fr-table td.fr-name:hover { background: #f8fafc; }
  table.fr-table td.fr-val { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  table.fr-table td.fr-val.input { background: #fef9c3; cursor: text; }
  table.fr-table td.fr-val.neg { color: #dc2626; }
  table.fr-table tr.fr-total td { font-weight: 600; background: #f8fafc; border-top: 1px solid #cbd5e1; }
  table.fr-table tr.fr-grand td { background: #fef3c7; border-top: 2px solid #1e293b; font-weight: 700; }
  table.fr-table td.fr-act { width: 64px; text-align: center; white-space: nowrap; }
  table.fr-table td.fr-act button { opacity: .3; border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; padding: 1px 6px; cursor: pointer; font-size: 11px; margin-left: 3px; }
  table.fr-table tr:hover td.fr-act button { opacity: 1; }
  table.fr-table td input.cell-input { width: 100%; background: transparent; border: 0; outline: 0; padding: 0; font: inherit; color: inherit; text-align: right; }
  table.fr-table td input.cell-input:focus { background: #fff; box-shadow: inset 0 0 0 2px #2563eb; border-radius: 2px; }
''' + css_anchor
    assert html.count(css_anchor) == 1, "anchor CSS tidak unik"
    html = html.replace(css_anchor, css_new, 1)
    print("[10] CSS fr-table ditambahkan")

    with io.open(HTML, "w", encoding="utf-8") as f:
        f.write(html)
    print("OK. Ukuran: %d -> %d bytes" % (len(orig.encode("utf-8")), len(html.encode("utf-8"))))

if __name__ == "__main__":
    main()
