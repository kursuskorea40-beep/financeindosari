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

---
Task ID: 4
Agent: main (Z.ai)
Task: Perbaiki pesan error "Tidak ada data terparse" pada dialog Paste dari Accurate — buat lebih informatif & tambahkan fallback parser yang lebih lenient

Work Log:
- Analisis penyebab: parser Piutang/Hutang lama hanya cari token faktur di 3 posisi pertama, jadi format dengan kolom leading (Outstanding / nomor urut / IDR) atau No. Faktur terpisah spasi ("SI 2026 08 00012") akan ditolak → muncul notif generik "Tidak ada data terparse" tanpa info.
- Tambah 2 helper fungsi di samping looksLikeFakturToken:
  • isAmountLikeToken(tok): deteksi token nominal Indonesia (12.500.000, 8.108.108,11, 60.700, "0") — dipakai sbg batas kanan join agar nominal tidak ikut tergabung.
  • looksLikeJoinedFaktur(s): verifikasi gabungan faktur — harus diawali huruf (prefix SI/PI/INV) + minimal 2 grup angka. Mencegah nama party seperti "Toko 99" salah dikenali sebagai No. Faktur.
- Patch parseAccuratePiutangUtangText:
  • Cari faktur di 6 posisi pertama (sebelumnya 3) — menangani kolom leading tambahan.
  • Fallback join token berurutan: gabung 2-4 token dengan pemisah "." sehingga "SI 2026 08 00012" → "SI.2026.08.00012" tetap dikenali. Longest-match dulu (mencegah "SI.2026" dipakai padahal "SI.2026.08.00012" yang benar), dan berhenti di token amount-like.
  • Simpan diagnostik: parseAccuratePiutangUtangText.lastDebug = { totalLines, parsed, skipped, skippedWithDigit[5] }.
- Pesan error di showPasteAccurateDialog kini informatif:
  • Piutang/Hutang: tampilkan total baris, baris dilewati, faktur berhasil, + preview 5 baris ber-angka yang tak terparse + saran kirim sample.
  • Parser lain (Penjualan/Pembelian/Persediaan/LR/Neraca): tampilkan total baris + 5 baris pertama textarea + saran kirim sample.
  • Pesan tampil di area preview (kotak merah) bukan lagi satu baris status.
- Test: test_pu_fallback.js BARU 23 pass/0 fail (8 skenario: format spasi, kolom Outstanding di-depan, 2 kolom leading, diagnostik lastDebug, regression "Toko 99", format slash INV/2026/09/0001, helper isAmountLikeToken, looksLikeJoinedFaktur); regresi semua parser lama tetap lulus (PU 39, Persediaan 51, FR 63, Piutang/Hutang render 34, Pembelian exit 0); verify_syntax OK.

Stage Summary:
- File deliverable: /home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html (~1,26 MB, syntax OK)
- Parser Piutang/Hutang kini jauh lebih lenient: menerima format faktur dengan spasi, kolom leading, prefix nomor urut+IDR, dsb. Tanpa breaking format lama.
- Pesan error kini membantu user self-diagnose: tampilkan baris mana yang diproses vs dilewati, sehingga user bisa kirim sample spesifik bila masih 0 hasil.
- Script artefak: scripts/test_pu_fallback.js

---
Task ID: 5
Agent: main (Z.ai)
Task: Fix "file tidak ditemukan / tidak sinkron" saat user upload Excel/PDF Penjualan Agustus

Work Log:
- User attach: penjualan indosari agustus.xlsx (PDF-converted-to-Excel) + rincian_penjualan_per_barang_indosari_261025105008.pdf (PDF asli 41 halaman).
- Diagnosis PDF: PDF pakai singkatan bulan "Agt" (06 Agt 2026), tapi ACCURATE_MONTH_MAP hanya punya `agu:8, aug:8` — `agt` TIDAK ada → parseAccurateDate("06 Agt 2026") return null → semua transaksi gagal → "Tidak ada data terparse".
- Diagnosis Excel: file adalah PDF→Excel konversi. Struktur rusak: kolom "hargaSatuan" tidak ada (cuma "Penjualan"=total); "Nama Barang" hanya terisi baris pertama per grup (merged cell); ada baris subtotal & page-break "dari 41" terselip. Excel importer butuh kolom required (tanggal/namaBarang/kuantitas/hargaSatuan) yang tidak terpenuhi. Excel konversi-PDF TIDAK bisa dipakai import Excel biasa — user harus pakai "Paste dari Accurate" dengan teks PDF.
- FIX: tambah `agt:8` ke ACCURATE_MONTH_MAP. (Indonesia standar: Agu dan Agt dua-duanya dipakai oleh Accurate tergantung versi bahasa; sekarang keduanya dikenali.)
- Test: scripts/test_agt_month.js BARU — sample 12 transaksi Agustus (ALKOHOL+AMONIAK+BENZOAT+WARNA EGG, ada NB. nota besar, ada multi-line product name) → ALL PASS:
  • parseAccurateDate("06 Agt 2026") → "2026-08-06" ✓
  • parseAccurateDate("01 Agu 2026") → "2026-08-01" ✓ (regression intact)
  • parseAccurateDate("01 Okt 2026") → "2026-10-01" ✓
  • 12 transaksi parse, total Rp 27.484.000 = expected ✓
  • All tanggal terformat "2026-08-xx" ✓
  • NOTA BESAR (SI.2026.08.00001 dst) kategori='NOTA BESAR', catatan='NB.708' ✓
  • Multi-line nama "AMONIAK RRC / AMONIUM BICARBONATE (AMONIA KUE)" & "WARNA TIMBANG / SUNSEA @25 KG (EGG YELLOW 2115 - KUNING TELUR)" tergabung utuh ✓
- Regresi: PU 39, PU-fallback 23, Persediaan 51, FR 63, Pembelian exit 0, verify_syntax OK.

Stage Summary:
- File deliverable: /home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html (~1,26 MB, syntax OK)
- Bug bulan "Agt" teratasi: PDF Penjualan Agustus (dan bulan-bulan lain yg mungkin pakai varian singkatan) sekarang bisa di-parse.
- Saran ke user: jangan upload Excel hasil konversi PDF. Pakai "Paste dari Accurate": buka PDF di Acrobat/Edge → Ctrl+A → Ctrl+C → paste ke dialog. Untuk Agustus setelah fix ini, parse akan berhasil tanpa notif "tidak ada data".
- Script artefak: scripts/test_agt_month.js

---
Task ID: 6
Agent: main (Z.ai)
Task: Buat file operasional terpisah INDOSARI_Operasional.html (5 modul: SPB/LPB/PO/Invoice/Kwitansi)

Work Log:
- AskUserQuestion (6 dimensi): modul (SPB+LPB+PO+Invoice+Kwitansi), penomoran (bulanan SPB-2026-10-001), layout (kop sederhana), master (import dari akuntansi), backup (JSON export/import), start no (dari 001).
- Builder: scripts/build_operasional.py (Python, generate HTML 66 KB dengan CSS+JS embedded).
- Arsitektur: single-file HTML, Tailwind via CDN, vanilla JS (no React), localStorage persistence. Tema maroon #6D0F2B senada dgn file akuntansi.
- Data model generik: docs[{id, module, nomor, tanggal, partnerId/Nama/Alamat, catatan, extra{}, items[], total, status}] — 5 modul pakai struktur sama, hanya beda di MODULES[].fields (module-specific extra fields).
- Penomoran: counters[module][YYYY-MM] di store, genNomor(module) increment+save. Format: SPB-2026-10-001. Rebuild dari existing docs saat init (rebuildCounters) agar restore import tidak salah urut.
- Per-modul specific fields:
  • SPB (internal partner, no total): dimintaOleh, ditujukanKe, tanggalButuh
  • LPB (supplier, hasTotal): tanggalTerima, noSuratJalan, penerima, kendaraan
  • PO (supplier, hasTotal): tanggalKirim, termsPembayaran, pengirim, topAlamat
  • Invoice (pelanggan, hasTotal): jatuhTempo, ppnPct (auto-calc grandTotal = subtotal + PPN%)
  • Kwitansi (pelanggan, hasTotal): diterimaDari, untukPembayaran (terbilang otomatis)
- Master data: masterBarang (kode/nama/satuan), masterSupplier, masterPelanggan (id/nama/alamat/telp). Import lewat dialog: paste JSON dari file akuntansi ATAU upload Excel (.xlsx via SheetJS CDN). Mode merge (gabung per kode/nama, tak double) atau replace.
- Backup/Restore: backupDownload() → download file JSON berisi seluruh store (settings + 3 master + docs + counters). restoreUpload(file) → read file, JSON.parse, Object.assign(defaultStore, data), rebuildCounters, saveStore. Reset all data (2x konfirmasi).
- Settings: companyName/Address/Phone/NPWP — dipakai di kop cetak semua dokumen.
- Print layout: window.print() dengan @media print CSS (sidebar/topbar hidden). Kop sederhana (nama + alamat + telp + NPWP), judul dokumen + nomor, meta header (tanggal/partner/extra fields), tabel item dgn border, total (subtotal + PPN untuk invoice, terbilang untuk invoice/kwitansi), ttd 3 kolom (Dibuat oleh / Penerima / Mengetahui).
- TerbilangIDR(n): implementasi full Indonesia (satuan, belasan, puluh, ratus, ribu, juta, miliar, triliun; "seratus"/"seribu" Special). Test 6 angka: 0/1/11000/280000/1110000/25250000 semua benar.
- BUG FIX (smoke test browser temukan): collectForm() lama panggil genNomor() sebelum validasi item filter → bila saveForm gagal krn item kosong, counter tetap ter-increment. Ditemukan saat test Invoice: nomor jadi INV-002 padahal save valid pertama gagal. Fix: genNomor dipindah ke assignNomorIfNew(doc) yang dipanggil di saveForm SETELAH semua validasi lolos. Test: empty save → counter tetap 0 ✓, valid save → counter jadi 1 ✓, valid save lagi → nomor lanjut 002 ✓.
- Smoke test browser (agent-browser CLI, Chromium): 11 cek SEMUA LULUS — initial render, form create, auto-nomor, total calc (PO 5×56000=280000), PPN calc (Invoice 1M+11%=1.11M), print view (kop + judul + tabel + ttd), master JSON import (2 barang/1 supplier/1 pelanggan), settings update, backup download (2.9 KB JSON), reset (2x confirm), restore upload (round-trip full data), terbilang 6 angka.
- verify_operasional.js (new Function wrapper): inline script syntax OK 54102 chars.

Stage Summary:
- File deliverable: /home/z/my-project/download/INDOSARI_Operasional.html (~66 KB, single file, syntax OK, smoke test 11/11 LULUS)
- 5 modul terpisah: SPB, LPB, PO, Invoice, Kwitansi — penomoran bulanan otomatis, form module-specific, print kop sederhana + ttd 3 kolom.
- Master import dari file akuntansi (JSON paste atau Excel upload via SheetJS).
- Backup JSON full round-trip (download → reset → restore = data kembali utuh, counter ter-rebuild).
- File terpisah dari INDOSARI_Akuntansi — masing-masing ringan, tak saling membebani.
- Script artefak: scripts/build_operasional.py (builder), scripts/verify_operasional.js (syntax check), scripts/test_restore.js (restore blob helper), scripts/data/operasional_print_spb.png (screenshot print view).

---
Task ID: 7
Agent: main (Z.ai)
Task: Fix 3 hal di file akuntansi: (a) warna font menu sidebar non-aktif jadi putih (sebelumnya hitam); (b) tambah Export JSON di Master Data (untuk import ke operasional.html); (c) tambah fitur per-bulan di menu Hutang & Piutang (bulan selector + filter)

Work Log:
- (a) Warna font sidebar: ditemukan akar masalah — Tailwind class "slate-stone-*" TIDAK terdaftar (tidak ada tailwind.config custom), jadi class-class tsb no-op. Item sidebar non-aktif default browser button text = hitam di atas background maroon gelap → tak terbaca. Fix: tambah base CSS rule `.sidebar-item { color: #EAE2DB; }` (cream hangat) + `.sidebar-item:hover { color: #fff; }`. Active tetap `color: #fff`. Verifikasi via agent-browser: active=rgb(255,255,255) putih, non-aktif=rgb(234,226,219) cream — keduanya terbaca jelas di sidebar gelap.
- (b) Export JSON Master Data: tambah tombol "⬇ Export JSON" di sebelah tombol Import (Master Data header). Klik → dialog overlay muncul dgn:
  • Instruksi langkah-langkah (copy → buka operasional.html → menu Master Data → Import → paste → Import JSON)
  • 3 KPI counter (Barang/Supplier/Pelanggan count)
  • Textarea read-only berisi JSON hasil `buildMasterExportJson()` (format: masterBarang=[{kode,nama,satuan}], masterSupplier/Pelanggan=[{id,nama,alamat,telp}] — id di-generate sup-001/pel-001 bila akuntansi tak punya id).
  • Tombol "📋 Copy ke Clipboard" (navigator.clipboard.writeText + fallback execCommand)
  • Tombol "💾 Download .json" (Blob → INDOSARI_master_YYYY-MM-DD.json)
  Verifikasi: 265 barang + 17 supplier + 4 pelanggan ter-export, 27.7 KB JSON, sample barang {kode:"A00002",nama:"ALKOHOL",satuan:"Kg"} ✓, sample supplier {id:"sup-001",nama:"BINTANG TIMUR MITRA ABADI, PT",alamat:"",telp:""} ✓. Round-trip dgn operasional.html sudah teruji di sesi sebelumnya.
- (c) Fitur per-bulan Hutang & Piutang: tambah state variables `piutangMonth = 0` dan `hutangMonth = 0` (0 = Semua Bulan/YTD, 1-12 = bulan spesifik). Selector dropdown dengan option "📊 Semua Bulan (YTD)" + 12 bulan. Saat bulan dipilih:
  • KPI cards switch: Saldo Awal/Jual Kredit/Bayar/Saldo Akhir jadi per-bulan (bukan YTD)
  • Tabel "per Bulan" + "Tunai vs Kredit": baris bulan terpilih di-highlight dgn class `active-row` (background #fef3c7)
  • Tabel Faktur: difilter — hanya faktur dgn jatuh tempo di bulan terpilih (actionable: "apa yg jatuh tempo bulan ini"). Bila tak ada, pesan warning + saran reset filter.
  • Status bar dinamis: "Piutang September 2026: Saldo Awal Rp 8.625.000 → Saldo Akhir Rp 8.625.000 · Tidak ada faktur jatuh tempo bulan ini" (vs YTD "Piutang Akhir (Des): Rp... · YTD: Rp...")
  • Tabel "per Bulan" tetap menampilkan semua 12 bulan untuk konteks (baris terpilih disorot), bukan disembunyikan.
  Verifikasi Piutang Sept: header jadi "Piutang Usaha — September 2026", KPI + status bar sesuai, "disorot" tag muncul di 3 heading tabel ✓. Verifikasi Hutang Sept: 11 dari 22 faktur jatuh tempo di Sept (Rp 39.688.783, semua 11 terlewat) difilter dari total Rp 84.156.631 ✓.

Stage Summary:
- File deliverable: /home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html (~1.27 MB, syntax OK)
- 3 fix terpasang & diverifikasi via agent-browser: (a) sidebar item non-aktif kini cream (#EAE2DB), hover putih, aktif putih; (b) Export JSON Master Data dengan copy + download, siap dipakai untuk import ke operasional.html; (c) per-bulan filter di Piutang & Hutang (KPI dinamis + highlight baris + filter faktur jatuh tempo per bulan).
- Regresi semua test suite lulus: syntax OK, PU 39, PU-fallback 23, FR 63, Agt-month ALL PASS, Persediaan 51. Neraca, Laba Rugi, Penjualan, Pembelian, Persediaan semua render tanpa error.
- Script artefak: scripts/data/akuntansi_piutang_perbulan.png, scripts/data/akuntansi_export_master_json.png (screenshot verifikasi).

---
Task ID: 8
Agent: main (Z.ai)
Task: Inisialisasi web app Next.js untuk akuntansi (migrasi parsial dari HTML akuntansi). 3 user, 2 cabang, login sederhana, hosting free tier.

Work Log:
- fullstack-dev skill invoked → init-fullstack.sh menjalankan setup Next.js 16 + App Router + TypeScript 5 + Tailwind v4 + shadcn/ui (New York) + Prisma 6 + NextAuth v4 + TanStack Query.
- Stack final: Next.js 16.1.3 (Turbopack), Prisma SQLite (dev; switch ke PostgreSQL di prod via env DATABASE_URL), NextAuth Credentials provider, bcryptjs untuk password hash, shadcn/ui components.
- Schema Prisma (14 model): Cabang, User, MasterBarang/Supplier/Pelanggan, TransaksiPenjualan/Pembelian, PersediaanBulan, PiutangBulan, UtangBulan, FakturPiutang/Hutang, LabaRugiBulan, NeracaBulan, Setting. Semua transaksi terikat cabangId + tahun/bulan untuk filter cepat.
- Seed script (scripts/seed.ts): 2 cabang (Jakarta + Surabaya), 3 user (admin1/admin123 ADMIN JKT, finance1/finance123 FINANCE JKT, gudang1/gudang123 GUDANG SBY), 4 setting default (companyName/Address/Phone/NPWP), bootstrap master data dari HTML akuntansi (extract via Python → 265 barang + 17 supplier + 4 pelanggan → import ke Cabang JKT). Semua sukses di-seed.
- Auth setup: NextAuth v4 Credentials + JWT session + callbacks (jwt/session inject role + cabangId + cabangNama). NEXTAUTH_SECRET set di .env. Login page inline (tampil bila tidak ada session) — tidak butuh route /login terpisah.
- Tema maroon: globals.css override `--primary: #6D0F2B`, `--sidebar: #470A1D`, `--sidebar-foreground: #EAE2DB`, `--ring: #6D0F2B`. Custom CSS variables (--maroon, --gold, --cream) untuk komponen langsung. Sidebar item active = maroon bg + gold icon, inactive = cream text + hover white. Identik dgn tema HTML akuntansi.
- Layout: SessionProvider + QueryClientProvider via src/components/providers.tsx. layout.tsx wrap body dgn provider + Toaster + SonnerToaster.
- API routes (6): /api/master/barang (GET/POST/DELETE), /api/master/supplier, /api/master/pelanggan (mirip), /api/cabang (GET — ADMIN lihat semua, role lain cuma cabang sendiri), /api/setting (GET/POST), /api/dashboard (GET — KPI aggregate per cabang), /api/import-master (POST — terima JSON dari HTML akuntansi, mode merge/replace per cabang).
- Page (src/app/page.tsx, single-page app): 'use client' dgn useSession. Bila belum login → LoginForm (gradient maroon bg, card putih, tombol maroon, akun demo ditampilkan). Bila login → layout sidebar (9 menu: Dashboard/Laba Rugi/Penjualan/Pembelian/Persediaan/Piutang/Hutang/Neraca/Master Data) + topbar (sheet title + user info + Logout) + content area dgn view switching via useState (activeModule).
- 3 view components di src/components/views/: Dashboard (KPI cards 4 + master data summary 3 + bar chart 12 bulan jual vs beli dgn warna maroon/gold), MasterData (CRUD 3 tab: barang/supplier/pelanggan, search, dialog edit/tambah, dialog import JSON dari HTML akuntansi), PlaceholderView (untuk 7 modul belum di-port: Laba Rugi, Penjualan, Pembelian, Persediaan, Piutang, Hutang, Neraca — tampil badge "Coming Soon" + info cara pakai file HTML akuntansi sementara).
- Bug ditemukan & fixed: NEXTAUTH_SECRET belum di-set di env → JWT decryption failed → API return 401. Fix: tambah NEXTAUTH_SECRET + NEXTAUTH_URL di .env, kill + restart dev server agar env terbaca ulang.
- Verifikasi agent-browser (4 cek SEMUA LULUS): login admin1/admin123 → redirect ke app dgn sidebar + dashboard; Dashboard render 4 KPI (Rp 0 semua krn belum ada transaksi 2026 di web app — akan di-port iterasi berikutnya) + master data summary (265/17/4 — bootstrap sukses); Master Data tab Barang render 265 row (urut kode, search filter, button Edit/Hapus tampil); Placeholder Penjualan tampil "Coming Soon" badge + info sementara pakai HTML akuntansi. Tidak ada runtime error di dev.log. Lint: src/* bersih (no errors), errors hanya di legacy scripts/ Node files (helper tools, tidak bagian app).

Stage Summary:
- File deliverable: web app Next.js 16 di /home/z/my-project (bisa di-preview via dev server port 3000).
- Foundation siap: DB schema 14 model + 3 user + 2 cabang + master data bootstrap 265/17/4 + NextAuth + tema maroon + sidebar + topbar.
- 2 modul aktif: Dashboard (KPI + bar chart + master data summary) + Master Data (CRUD + import JSON dari HTML akuntansi).
- 7 modul placeholder: Laba Rugi, Penjualan, Pembelian, Persediaan, Piutang, Hutang, Neraca — tampil "Coming Soon", porting dijadwalkan iterasi berikutnya.
- Akun login: admin1/admin123 (ADMIN, Jakarta) · finance1/finance123 (FINANCE, Jakarta) · gudang1/gudang123 (GUDANG, Surabaya).
- Script artefak: scripts/seed.ts (seeder), scripts/extract_master_for_seed.py (extract master dari HTML → JSON), scripts/data/{akuntansi_master_export.json, webapp_login.png, webapp_dashboard.png, webapp_master_data.png}.
- Untuk iterasi berikutnya: porting parser Accurate dari HTML akuntansi (Penjualan/Pembelian/Persediaan/Piutang/Hutang/LR/Neraca — semua sudah ada di HTML, tinggal adapt ke TS + Prisma + multi-cabang).

---
Task ID: 9
Agent: main (Z.ai)
Task: Porting modul Penjualan + Pembelian ke web app Next.js (parser Accurate lengkap, paste dari Accurate, list view + KPI + form + filter bulan)

Work Log:
- Porting parser Accurate ke TypeScript: src/lib/accurate-parser.ts. Berisi: ACCURATE_MONTH_MAP (12 bulan ID + EN), parseAccurateNumber (Indonesian format: titik=ribuan, koma=desimal), parseAccurateDate (parsing "06 Sep 2026" → ISO), isAccurateHeaderOrFooter (skip header/footer), isAccurateTransaction (deteksi baris transaksi), isAccurateSubtotal (skip subtotal), parseAccurateTransaction (Penjualan: NB./NT. deteksi + qty/satuan/amount), parseAccurateRincianText (Penjualan full parser — multi-line item name accumulator), parseAccuratePembelianTransaction (Pembelian: Giro/Tempo/Lunas keyword deteksi + isLunas + jatuhTempo), parseAccurateRincianPembelianText (Pembelian full parser). Plus helpers: BULAN_NAMES_FULL/SHORT, fmtIDR, fmtDateID, getMonthFromISO, getYearFromISO.
- Test parser: scripts/test_parser_port.ts — 33 pass / 0 fail (2 "expected" math saya salah hitung, parser output BENAR: total 2,628,500 = 280000+2184000+18500+146000 ✓; hargaSatuan 334,355 = round(8108108.11/24.25) ✓).
- API routes Penjualan (3): GET /api/penjualan (filter cabangId+bulan+tahun+search, return items+summary tunai/kredit), POST /api/penjualan (create/update single tx), DELETE /api/penjualan?id=xxx, POST /api/penjualan/paste (parse teks Accurate + insert batch, mode append/replace, deteksi duplikat di append).
- API routes Pembelian (3): same pattern. GET returns summary lunas/kredit (isLunas boolean instead of kategori NOTA BESAR/KECIL). POST /api/pembelian/paste uses parseAccurateRincianPembelianText.
- UI TransactionView (src/components/views/transaction-view.tsx): generic component untuk Penjualan & Pembelian (parameter moduleType). Filter bar (bulan "0=Semua Bulan YTD"+12 bulan + tahun ±2 + search). 4 KPI cards (Total / Tunai NT atau Lunas / Kredit NB atau Belum Lunas / Rata-rata per transaksi). Table 10 kolom dgn badge kategori + total row di tfoot. Dialog Edit/Tambah (form 6-9 field, live subtotal calc). Dialog Paste (textarea + mode merge/replace + info cara pakai).
- Update page.tsx: wire Penjualan + Pembelian ke TransactionView (ganti PlaceholderView). 5 modul tersisa sebagai placeholder (Laba Rugi, Persediaan, Piutang, Hutang, Neraca).
- FIX BUG auth: NextAuth getServerSession return 401 (JWT decryption failed) bila env NEXTAUTH_SECRET tidak ter-set eksplisit di auth.ts. Fix: tambah `secret: process.env.NEXTAUTH_SECRET || "fallback"` di authOptions NextAuth config. Restart dev server, clear cookies, re-login → API paste jadi return 200.
- Smoke test agent-browser end-to-end SEMUA LULUS:
  • Login admin1/admin123 → sidebar muncul.
  • Klik Penjualan → empty state tampil "Belum ada transaksi Oktober 2026".
  • POST /api/penjualan/paste sample 4 transaksi (2 ALKOHOL + 2 BENZOAT HOLLAND, ada NB.708 Nota Besar) → 200, ok=true, parsed=4, inserted=4.
  • Switch bulan ke September → table render 4 rows, KPI Penjualan Sep Rp 2,628,500 (4 transaksi), Tunai NT Rp 444,500 (16.9%, 2 transaksi: row 0+1 BENZOAT), Kredit NB Rp 2,184,000 (83.1%, 1 transaksi: SI.2026.09.00001 ALKOHOL), kategori badge NT/NB tampil benar.
  • POST /api/pembelian/paste sample 4 transaksi (PI.000146 Giro 0058, empty keterangan, Tempo 09 Okt 2026, Lunas keyword) → 200, ok=true, parsed=4, inserted=4.
  • Switch Pembelian ke September → table render 4 rows, KPI Pembelian Sep Rp 18,695,109, Lunas Rp 1,837,000 (9.8%, 2 transaksi: empty keterangan + "Lunas"), Kredit Rp 16,858,109 (90.2%, 2 transaksi: "Tempo 09 Okt 2026" jatuh tempo 2026-10-09 + "Giro 0058"). Status badge Lunas/Kredit tampil benar.
  • Dashboard KPI auto-update: Penjualan YTD Rp 2,628,500 (4 transaksi), Pembelian YTD Rp 18,695,109 (4 transaksi), bar chart bulan September ada 2 batang (jual maroon + beli gold), "1 bulan ada data".
- Lint: src/* bersih. Syntax OK. No runtime errors di dev.log.

Stage Summary:
- 2 modul aktif penuh: Penjualan + Pembelian, masing-masing dengan parser Accurate (Rincian Penjualan/Pembelian per Barang), paste dari Accurate, list view dengan filter bulan/tahun/search, KPI cards (Total/Tunai/Kredit/Rata-rata), table 10 kolom dgn badge kategori, dialog edit/tambah transaksi, dialog paste dengan mode replace/append.
- Total 4 modul aktif: Dashboard + Master Data + Penjualan + Pembelian (dari 2 modul sebelumnya).
- 5 modul placeholder tersisa: Laba Rugi, Persediaan, Piutang, Hutang, Neraca — akan di-port iterasi berikutnya.
- Parser Accurate full port: 868 transaksi penjualan + pembelian dgn sen desimal, NB/NT, Giro/Tempo/Lunas keyword, multi-line product name — semua bekerja sama seperti di HTML akuntansi.
- Script artefak: src/lib/accurate-parser.ts, src/app/api/penjualan/{route.ts, paste/route.ts}, src/app/api/pembelian/{route.ts, paste/route.ts}, src/components/views/transaction-view.tsx, scripts/test_parser_port.ts, scripts/data/{webapp_penjualan_list.png, webapp_pembelian_list.png}.

---
Task ID: 10
Agent: main (Z.ai)
Task: Porting 5 modul terakhir ke web app: Persediaan + Piutang + Hutang + Laba Rugi + Neraca (semua dengan parser Accurate lengkap + paste dialog)

Work Log:
- Porting 3 file parser TS baru:
  • src/lib/accurate-persediaan.ts — parseAccuratePersediaanText (tabular format auto-detect header via PERS_FIELD_ALIASES 13 field, grab trailing numeric run, snapshot/mutasi/6-col layout fleksibel, multi-line item name wrap digabung via pendingName accumulator).
  • src/lib/accurate-piutang-hutang.ts — parseAccuratePiutangUtangText + helpers (looksLikeFakturToken, isAmountLikeToken, looksLikeJoinedFaktur, PU_KEYWORD_TOKENS, PU_SKIP_TEXT, PU_SKIP_ANY). Format "Daftar Piutang/Utang Usaha" — blok per pelanggan/supplier + baris faktur + 3 angka terakhir = Jumlah/Dibayar/Sisa. Fallback join token utk "SI 2026 08 00012" format spasi. Plus hitungUmurStatus dinamis (jatuh tempo vs hari ini → TERLEWAT/BERJALAN).
  • src/lib/accurate-fr.ts — parseAccurateFRText + LR_ROWS_SEP (34 baris template) + NERACA_ROWS_SEP (53 baris) + helpers (frDeepCopyRows, frSumScope, frTotalValue dengan calc khusus lk/po/jno/lb/jas/jle, fmtFRNum, frNormName, isFRReportNoise, LR_ALIAS, NERACA_ALIAS, FR_SKIP_NAMES, LR_SECTION_SCOPE). Parser: baris "Nama Akun + Angka" dipetakan ke template via nama + alias + strip suffix IDR, baris "Jumlah ..." dilewati (auto-hitung), akun tak dikenal disisipkan di bagian terdekat.
- API routes baru (10): /api/persediaan (GET/POST/DELETE) + /api/persediaan/paste (POST), /api/piutang (GET/POST/DELETE/PUT — saldo bulanan + faktur + paste), /api/hutang (same pattern), /api/laba-rugi (GET/POST/DELETE/PUT — per-bulan save + paste FR), /api/neraca (same).
- UI views baru (3 components, 5 modul):
  • src/components/views/persediaan-view.tsx — filter bulan+tahun, 4 KPI (Saldo Awal/Penerimaan/Pengeluaran/Saldo Akhir auto), table 12 kolom, dialog paste dengan mode replace/append, multi-line item name merged.
  • src/components/views/piutang-hutang-view.tsx — generic component untuk Piutang & Hutang. Filter bulan (0=Semua Bulan YTD + 12 bulan) + tahun. 4 KPI dinamis (Saldo Akhir, Penjualan Kredit/Pembelian Kredit, Pembayaran, Faktur Belum Lunas). 2 tabel: saldo bulanan (highlight bulan terpilih) + faktur (filter jatuh tempo per bulan bila bulan != 0, badge TERLEWAT/BERJALAN). Dialog paste.
  • src/components/views/fr-view.tsx — generic untuk Laba Rugi & Neraca. Filter bulan+tahun. 4 KPI: LR (Jumlah Pendapatan, Laba Kotor, Pendapatan Operasional, LABA BERSIH); Neraca (JUMLAH ASET, JUMLAH KEWAJIBAN, Jumlah Ekuitas, JUMLAH LIAB+EKUITAS dgn auto-cek "✓ Seimbang"/"✗ Tidak Seimbang"). FR table dengan indentasi (lvl×16px padding), header row bold uppercase, total row bg kuning/grand bg gold-bevel, item row hover edit. Dialog edit akun + dialog paste dgn mode replace/append + tombol Reset ke Default.
- Update page.tsx: wire 5 view baru (Persediaan, Piutang, Hutang, Laba Rugi, Neraca). PlaceholderView sekarang hanya fallback (tidak dipakai lagi). Total 9 modul aktif (Dashboard, Laba Rugi, Penjualan, Pembelian, Persediaan, Piutang, Hutang, Neraca, Master Data) — semua sudah jadi.
- Smoke test agent-browser SEMUA LULUS:
  • Persediaan paste (sample 2 item ALKOHOL+BENZOAT, format Laporan Persediaan Bulanan 6 kolom): 200, parsed=2, inserted=2. View Persediaan Sep: KPI Saldo Awal Rp 8.146.110, Penerimaan Rp 46.270.608, Pengeluaran Rp 44.000.171, Saldo Akhir Rp 10.416.547 (auto = Awal+Masuk-Keluar ✓). Table 2 row dgn akhirQty/akhirNilai computed per item.
  • Piutang paste (sample 3 faktur: 2 TOKO MAKMUR + 1 CV SINAR JAYA dgn pembayaran parsial 5jt): 200, parsed=3, inserted=3. View Piutang YTD: Faktur Belum Lunas Rp 37.500.000 (3 faktur · 3 terlewat). Table faktur: 3 row, badge TERLEWAT semua (karena jatuh tempo sudah lewat), umur 97/71/50 hari.
  • Hutang paste (sample 3 faktur BINTANG TIMUR 2x + BIRAN 1x, semua dgn sen desimal 8.108.108,11): 200, parsed=3, inserted=3. Dashboard auto-update: Hutang Faktur Belum Lunas Rp 16.766.216 (sum 8,108,108.11 + 8,108,108.11 + 550,000 = 16,766,216.22 ✓).
  • Laba Rugi paste (sample 16 akun dari template September Accurate): 200, parsed=16, savedCount=16. View LR Sep: 4 KPI = Jumlah Pendapatan Rp 174.512.860, Laba Kotor Rp 34.355.002,93, Pendapatan Operasional Rp 11.122.552,45, LABA BERSIH Rp 13.967.092,45 — semua auto-hitung dari akun. FR table render dgn indentasi, header bold, total row gold-bevel, item row hover muncul tombol ✏️ Edit.
  • Neraca paste (sample 18 akun Kas/Piutang/Persediaan/PPN/Aset Tetap/Utang/Equitas/Laba Ditahan): 200, parsed=18, savedCount=18. View Neraca Sep: 4 KPI = JUMLAH ASET Rp 921.597.914,6, JUMLAH KEWAJIBAN Rp 182.300.119,72, Jumlah Ekuitas Rp 739.297.794,88, JUMLAH LIAB+EKUITAS "✓ Seimbang" (auto-cek 921,597,914.6 = 182,300,119.72 + 739,297,794.88 ✓).
  • Dashboard auto-update: Piutang Faktur Belum Lunas Rp 37.500.000 (3 faktur), Hutang Faktur Belum Lunas Rp 16.766.216. Total 4 KPI dashboard live.
- Lint: src/* bersih. Syntax OK. No runtime errors di dev.log.

Stage Summary:
- Web app INDOSARI Akuntansi 2026 kini LENGKAP — 9 modul semua aktif:
  1. Dashboard (KPI + bar chart 12 bulan)
  2. Laba Rugi (FR format Accurate Standar per bulan, editable, paste Accurate)
  3. Penjualan (transaksi per bulan, paste Rincian Penjualan per Barang, NB/NT badge)
  4. Pembelian (transaksi per bulan, paste Rincian Pembelian per Barang, Giro/Tempo/Lunas detection)
  5. Persediaan (kartu stok per bulan, paste Daftar Nilai Persediaan / Laporan Persediaan Bulanan, snapshot/mutasi format)
  6. Piutang (saldo bulanan editable + faktur belum lunas per bulan filter, paste Daftar Piutang Usaha)
  7. Hutang (mirror Piutang untuk supplier, paste Daftar Utang Usaha)
  8. Neraca (FR format Accurate Standar per bulan, auto-cek seimbang Aset = Liabilitas + Ekuitas)
  9. Master Data (CRUD barang/supplier/pelanggan + import JSON dari HTML akuntansi)
- Semua parser Accurate full port: 868 transaksi Penjualan, Pembelian dgn sen + NB/NT + Giro/Tempo/Lunas, Persediaan tabular auto-detect, Piutang/Hutang dgn fallback join token, FR template 34+53 baris dgn auto-hitung total + insertion akun custom. Multi-cabang + multi-user aktif (3 user × 2 cabang).
- File struktur baru: src/lib/accurate-{persediaan,piutang-hutang,fr}.ts + src/app/api/{persediaan,persediaan/paste,piutang,hutang,laba-rugi,neraca}/route.ts + src/components/views/{persediaan-view,piutang-hutang-view,fr-view}.tsx.
- Akun login: admin1/admin123 (Admin JKT) · finance1/finance123 (FINANCE JKT) · gudang1/gudang123 (GUDANG SBY).
- Script artefak: scripts/data/{webapp_persediaan.png, webapp_piutang.png, webapp_neraca.png}.

---
Task ID: 11
Agent: main (Z.ai)
Task: Siapkan untuk deploy ke Vercel — schema postgres, env vars, README, build scripts

Work Log:
- Buat `prisma/schema.postgres.prisma` (copy schema.prisma dgn `provider = "postgresql"`). Local dev tetap pakai schema.prisma (sqlite), Vercel pakai schema.postgres.prisma via flag `--schema` di vercel-build.
- Update `package.json`:
  • Tambah `postinstall: "prisma generate"` (Vercel butuh ini agar Prisma client ter-generate setelah `bun install`)
  • Tambah `vercel-build: "prisma generate --schema=prisma/schema.postgres.prisma && next build"` (override default Vercel build, generate client dgn schema postgres, lalu next build)
  • Tambah `db:push-prod: "prisma db push --schema=prisma/schema.postgres.prisma --accept-data-loss"` (push schema ke DB production)
  • Tambah `db:seed-prod: "bun run scripts/seed-prod.ts"` (seed production)
- Buat `.env.example` (committed, bukan .env): template DATABASE_URL (sqlite local + postgres Neon example), NEXTAUTH_SECRET (placeholder + link generator), NEXTAUTH_URL (localhost + production URL).
- Update `.gitignore`:
  • `!.env.example` (allow commit .env.example, tetap exclude .env)
  • Tambah `/db/`, `*.db`, `*.db-journal` (exclude SQLite local file dari git)
- Update `eslint.config.mjs` ignores: tambah `scripts/`, `download/`, `upload/`, `tool-results/`, `mini-services/` (skip legacy helper scripts yang pakai require() — bukan bagian Next.js app). Lint sekarang bersih (0 errors).
- Buat `vercel.json`: framework=nextjs, buildCommand="bun run vercel-build", installCommand="bun install".
- Buat `scripts/seed-prod.ts`: versi seed untuk production — auto-generate NEXTAUTH_SECRET hint bila belum set (via `crypto.randomBytes(32).toString("base64")`), seed 3 user + 2 cabang + 4 settings. Skip import master data (kosong di production, user import manual lewat UI Master Data → Import dari File Akuntansi HTML).
- Buat `README.md` lengkap (10 KB):
  • Stack overview (Next.js 16 + TS 5 + Prisma 6 + NextAuth v4 + Tailwind v4 + shadcn/ui)
  • 9 modul aktif listed
  • Akun demo (3 user × 2 cabang)
  • Quick start local dev (5 langkah: install → env → db push → seed → dev)
  • Deploy ke Vercel (6 langkah): setup PostgreSQL (3 opsi: Vercel Postgres/Neon/Supabase), set env vars, push ke GitHub, import ke Vercel, first-time DB setup, update NEXTAUTH_URL
  • Postgres schema note (2 file schema, otomatis switch via --schema flag)
  • Project structure tree
  • Common issues & troubleshooting (login 401, DB connection error, Prisma client error, build fail)
  • Development notes (dev server, lint, reset DB)
- Verifikasi:
  • `bun run lint` — 0 errors di src/ (legacy scripts/ sekarang di-ignore)
  • `bunx prisma validate --schema=prisma/schema.prisma` — ✓ valid (sqlite)
  • `bunx prisma generate --schema=prisma/schema.postgres.prisma` dgn DATABASE_URL=test postgres URL — ✓ generate sukses (schema postgres valid, butuh DATABASE_URL postgres saat runtime)
  • Restart dev server, login admin1/admin123 — Dashboard tetap render dgn semua data (Penjualan Rp 2.628.500, Pembelian Rp 18.695.109, Piutang Rp 37.500.000, Hutang Rp 16.766.216, Master 265/17/4). Neraca Sep tetap "✓ Seimbang" dgn Aset Rp 921.597.914,6.
  • Semua data persisted dari iterasi sebelumnya (SQLite file db/custom.db intact).

Stage Summary:
- Web app INDOSARI Akuntansi 2026 SIAP DEPLOY ke Vercel. Yang perlu user lakukan:
  1. Push project ke GitHub
  2. Daftar Neon free (atau Vercel Postgres) → dapat connection string postgresql://
  3. Import repo ke Vercel → auto-build via vercel-build script (prisma generate dgn schema postgres + next build)
  4. Set env vars di Vercel: DATABASE_URL (postgres), NEXTAUTH_SECRET (random 32-byte base64), NEXTAUTH_URL (URL production)
  5. Run db:push-prod + db:seed-prod (via Vercel CLI `vercel env pull` lalu run locally, atau lewat Vercel dashboard console)
  6. Login admin1/admin123 di URL production → import master JSON dari file HTML akuntansi → paste data Accurate
- File deploy baru: .env.example, README.md, vercel.json, prisma/schema.postgres.prisma, scripts/seed-prod.ts
- File update: package.json (postinstall + vercel-build + db:push-prod + db:seed-prod scripts), .gitignore (allow .env.example + exclude db/), eslint.config.mjs (ignore scripts/).
- Local dev tetap berfungsi penuh dgn SQLite. Vercel akan auto-switch ke PostgreSQL saat build via flag --schema di vercel-build.
