# Worklog — INDOSARI Akuntansi 2026 (perbulan.html)

---

Task ID: 1
Agent: main (Z.ai)
Task: Pisahkan menu "Piutang & Utang" menjadi dua menu sendiri: "Piutang" dan "Hutang" (+ konfirmasi parser Persediaan dari sesi sebelumnya sudah terpasang)

Work Log:
- Verifikasi parser Persediaan (tugas sesi sebelumnya) sudah lengkap di HTML: `parseAccuratePersediaanText` (baris ~2592), dialog Paste Accurate menangani tipe "persediaan", tombol `btnPasteAccuratePers` ada, test_persediaan_parser.js 51 pass / 0 fail.
- Inspeksi sheet Excel "Piutang & Utang" via scripts/inspect_piutang_sheet.js: Piutang baris 8-19, Tunai vs Kredit baris 23-34, Utang baris 40-51, semua nilai statis (bukan formula).
- Edit SIDEBAR_ITEMS: entry `piutang-utang` diganti dua entry: `piutang` (💰 Piutang, custom "piutang") dan `hutang` (💸 Hutang, custom "hutang").
- Edit dispatch render: case "piutang" → renderPiutang(), case "hutang" → renderHutang().
- Perbaiki hideToolbar: `const hideToolbar = isCustom;` (sebelumnya toolbar Export/Import CSV tampil di view piutang-utang padahal akan crash — bukan sheet Excel).
- Ganti section 12 (renderPiutangUtang) dengan renderPiutang + renderHutang + helpers (scripts/section12_new.js di-inject via scripts/split_piutang_hutang.py):
  - getPiutangRows/savePiutangBulan: override per bulan di userEdits.extras.piutangBulan (localStorage), reset-able.
  - getTunaiKreditRows: Tunai (NOTA KECIL) vs Kredit (NOTA BESAR) per bulan — prioritas dihitung LIVE dari data transaksi Penjualan (hasil paste Accurate; Sep = 149.225.955 tunai + 25.286.900 kredit = 174.512.856), fallback ke nilai Excel (Jan-Mei) dengan kolom SUMBER.
  - getUtangRows/saveUtangBulan: override per bulan di userEdits.extras.utangBulan.
  - getFakturBelumLunas: faktur supplier (22 faktur) tampil di menu Hutang.
  - Tabel bulanan editable (klik sel kuning → input → Enter), pakai data-val agar desimal aman.
  - Tombol "↺ Reset Edit" per menu untuk kembalikan ke data Excel asli.
  - CSS baru: dash-table td.input (kuning editable), total-row, cell-input.
- FIX BUG DOUBLE-COUNT (ditemukan saat test): kolom Penyesuaian/Penyesuaian Awal sudah termasuk dalam Saldo Awal (bukti: C11=G10+F11 persis; C40=G39+D40 persis). Formula lama saldoAkhir menambahkan penyesuaian lagi → April piutang tampil Rp 3.000 (Excel: 0), Jan hutang tampil Rp 144.862.050 (Excel: 143.117.984). Formula baru: saldoAkhir = saldoAwal + mutasi - pembayaran (tanpa penyesuaian), cocok 100% dengan kolom G Excel.
- Rapikan test_pembelian_parser.js (mapping indeks TX3-TX5 stale karena sample jadi 6 TX) — parser sendiri ternyata benar semua.
- Test: scripts/test_piutang_hutang.js 34 pass / 0 fail; verify_syntax.js OK; regression test_js_parser.js, test_pembelian_parser.js, test_persediaan_parser.js, verify_embedded_data.js semua OK.

Stage Summary:
- File deliverable: /home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html (~1,2 MB, syntax OK)
- Sidebar sekarang: Dashboard, Laba Rugi, Penjualan, Pembelian, Persediaan, Piutang (sendiri), Hutang (sendiri), Neraca, Master Data
- Menu Piutang: KPI (saldo akhir, jual kredit YTD, bayar YTD, % tunai) + tabel bulanan editable + tabel Tunai vs Kredit (live-aware)
- Menu Hutang: KPI (saldo akhir, beli kredit YTD, bayar YTD, faktur belum lunas) + tabel bulanan editable + rincian 22 faktur supplier
- Edit saldo bulanan kini bisa langsung dari UI (localStorage) — sebelumnya tidak bisa sama sekali
- Script artefak: scripts/split_piutang_hutang.py, scripts/section12_new.js, scripts/test_piutang_hutang.js, scripts/inspect_piutang_sheet.js, scripts/check_tunai_kredit_split.js

---
Task ID: 2
Agent: main (Z.ai)
Task: Neraca per bulan (editable + paste Accurate) & Laba Rugi format sesuai laporan Accurate terlampir

Work Log:
- Ganti section 9 (Laba Rugi debit/kredit lama dari sheet Excel) dengan modul baru "9. LABA RUGI & NERACA — Format Accurate Standar" (scripts/fr_module.js, di-inject via scripts/update_fr.py).
- Template baris sesuai PDF terlampir: LR_ROWS_SEP (33 baris: PENDAPATAN, BPP, LABA KOTOR, 11 beban operasional, non-operasional, LABA BERSIH) & NERACA_ROWS_SEP (53 baris: ASET/LANCAR/TIDAK LANCAR, LIABILITAS, EKUITAS) dengan nilai September 2026 dari Accurate.
- Model data: t=header/item/total, lvl indentasi, sc=scope penjumlahan, calc="sum:scope" + formula khusus (lk, po, jno, lb, jas, jle). Baris total auto-hitung (frSumScope/frTotalValue), item editable.
- Penyimpanan per bulan: userEdits.extras.labaRugiPerBulan / neracaPerBulan (localStorage); Sep = default Accurate; bulan lain LR = konversi dari sheet Laba Rugi lama (C/D/E/H/J+K/D/L → Penjualan/Pend LU/BPP/Gaji/Ops Lainnya/Beban LU), Neraca bulan lain = nol. Tombol Reset per bulan.
- UI: selector bulan, 4 KPI (LR: Pendapatan/Laba Kotor/Pend Op/Laba Bersih; Neraca: Aset/Kewajiban/Ekuitas/Keseimbangan "✓ Seimbang"), tabel fr-table ala Accurate (indentasi, header bold, total border, grand kuning, negatif merah), edit nilai (sel kuning) + rename (klik nama) + tambah/hapus akun (＋/✕), status bar.
- Paste parser: parseAccurateLabaRugiText / parseAccurateNeracaText (core parseAccurateFRText) — baris "Nama Akun + angka" dipetakan ke template (norm + alias + strip suffix IDR), skip baris Jumlah*/total Accurate (auto-hitung), skip FR_SKIP_NAMES (Kas & Bank, Nilai Histori), skip anak bernilai -0, nilai kurung = negatif, akun tak dikenal disisipkan di konteks bagian dengan scope warisan. Dialog paste diperluas (tipe labarugi/neraca, default Replace, preview total + jumlah akun baru).
- Sidebar: Neraca excel→custom "neraca"; dispatch + case renderNeraca; desc Laba Rugi diupdate; CSS fr-table ditambah.
- Test: scripts/test_fr_parsers.js 63 pass/0 fail (teks PDF asli dari kedua lampiran: semua total cocok — JP 174.512.860, LK 34.355.002,93, JBO 23.232.450,48, LB ≈13.967.092,44; Aset 921.597.914,6, Kewajiban 182.300.119,72, Ekuitas 739.297.794,88, SEIMBANG); smoke test browser scripts/smoke_fr_browser.py 24/24 PASS (paste end-to-end, edit nilai→total ikut, rename, reset, konversi Januari 110.413.750→LB 41.394.310,29 math tepat); regression semua parser lama tetang lulus; verify_syntax OK.

Stage Summary:
- File deliverable: /home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html (~1,24 MB, syntax OK)
- Menu Neraca & Laba Rugi kini format persis laporan Accurate Standar, per bulan, editable penuh, + tombol Paste dari Accurate
- Script artefak: scripts/fr_module.js, scripts/update_fr.py, scripts/patch_fr_skip.py, scripts/test_fr_parsers.js, scripts/smoke_fr_browser.py, scripts/data/{lr_sep.txt,neraca_sep.txt,*.png}

---
Task ID: 3
Agent: main (Z.ai)
Task: (a) Ubah tema warna aplikasi menjadi merah maroon + warna penyeimbang; (b) Tambah fitur "Paste dari Accurate" di menu Hutang dan Piutang

Work Log:
- TEMA MAROON "Maroon Elegan" (scripts/apply_maroon_theme.py, baris COMBINED JSON di-skip agar data Excel embedded tak tersentuh):
  - Primary maroon #6D0F2B — sengaja dipilih SENADA dengan fill header Excel yang sudah embedded di data (#6D0F2B) sehingga menu custom & sheet Excel kini satu tema.
  - Maroon gelap #470A1D (sidebar, toast, gradient KPI), hover #8A1A38, light #FBE9EE/#F5D9E0, border #E0AEBB/#F0CDD6.
  - Warna penyeimbang: GOLD (#D4A72C logo chip & icon aktif & bar laba, KPI success gradient #C9A227→#8F6E12, tombol Simpan #B8912C, teks positif #8A6A12).
  - Latar cream hangat #F6F1E9; netral slate→stone (199 konversi kelas) untuk harmoni hangat; border #EAE2DB/#D9CEC6.
  - Sel input sheet-table/lr-table yang tadinya biru (#dbeafe) diseragamkan jadi kuning (#fef9c3) sesuai konvensi "Sel kuning = input manual"; focus ring #6D0F2B.
  - Total: 6 specific + 56 hex + 87 kelas Tailwind + 199 slate→stone + 4 teks UI ("Biru = omzet" → "Maroon = omzet", catatan sidebar). Verifikasi otomatis: nol warna lama tersisa di luar JSON.
- PASTE ACCURATE PIUTANG & HUTANG (section baru 13f + perluasan dialog + render):
  - Parser parseAccuratePiutangUtangText(text, kind): format "Daftar Piutang/Utang Usaha" — blok per pelanggan/supplier (baris tanpa angka), baris faktur = NoFaktur + Tanggal + [JT] + angka. Fleksibel: 3 angka (Jumlah/Dibayar/Sisa), 2 (Jumlah/Sisa→dibayar auto), 4+ (kolom Umur di tengah aman, ambil 3 terakhir), faktur angka murni (00009260901) vs angka ribuan (21.250.000 dibedakan), sen desimal, kurung negatif, tanggal dash-format, prefix "Pelanggan:/Supplier:/Nama:", nomor urut di depan. Header kolom dideteksi via token kunci (PU_KEYWORD_TOKENS) agar nama party yang kebetulan diawali kata "SUPPLIER" dsb. tidak ikut terskip.
  - showPasteAccurateDialog: tipe "piutang"/"hutang" (config, parse dispatch, preview tabel faktur + total sisa, save). Save: piutang → userEdits.extras.piutangFaktur (tabel baru "Faktur Piutang Belum Lunas (per pelanggan)" di menu Piutang + tombol hapus data paste); hutang → userEdits.extras.fakturBelumLunas (menimpa 22 faktur bawaan; judul tabel jadi "hasil paste Accurate"). Mode default Replace; Append menggabung per No. Faktur.
  - hitungUmurStatus(): umur & status TERLEWAT/BERJALAN kini dihitung DINAMIS dari jatuh tempo vs hari ini (tabel Hutang & Piutang) — sebelumnya statis dari snapshot 30 Sep.
  - Tombol "📋 Paste dari Accurate" di kedua menu; Reset Edit kini juga membersihkan override faktur (konfirmasi diperbarui).
  - FIX BUG (terdeteksi smoke test): tombol Reset Piutang tidak muncul bila hanya ada override faktur (hasEdit kini cek piutangBulan || piutangFaktur).
- Test: test_piutang_hutang_parser.js BARU 39 pass/0 fail (8 skenario: format standar, 2 angka, kolom umur, faktur angka murni+sen+kurung negatif, dash-date+prefix+nomor urut, Daftar Utang, looksLikeFakturToken, hitungUmurStatus dinamis); smoke_pu_browser.py BARU 40+ checks SEMUA PASS (tema: computed style body/sidebar/logo/aktif/KPI + nol kelas sky/emerald/violet; fitur: paste piutang end-to-end → tabel+localStorage+statusBar, paste hutang → replace+reset, reset piutang, regresi render semua menu); smoke_fr_browser.py 24/24 tetap PASS; regresi test_js_parser (868 tx, Rp 174.512.855,76), pembelian, persediaan 51, FR 63, piutang-hutang 34 — semua lulus; verify_syntax OK. /tmp/rincian.txt diregenerasi dari PDF upload (sesi lama hilang).
- Screenshot verifikasi visual: scripts/data/shot_{dashboard,piutang,hutang,labarugi}.png.

Stage Summary:
- File deliverable: /home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html (~1,26 MB, syntax OK)
- Aplikasi kini bertema maroon #6D0F2B + gold penyeimbang + latar cream, senada penuh dengan header Excel embedded.
- Menu Piutang: + tabel Faktur Piutang Belum Lunas (hasil paste) & tombol Paste dari Accurate; Menu Hutang: + tombol Paste dari Accurate (menimpa faktur bawaan); keduanya reset-able & umur/status dinamis.
- Script artefak: scripts/apply_maroon_theme.py, scripts/test_piutang_hutang_parser.js, scripts/smoke_pu_browser.py.
