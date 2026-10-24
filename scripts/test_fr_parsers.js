// Test parser Laba Rugi & Neraca (paste Accurate) terhadap teks PDF asli
const fs = require('fs');

const html = fs.readFileSync('/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html', 'utf-8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) { console.error('Could not extract inline script'); process.exit(1); }
const scriptCode = scriptMatch[1];

// --- Ekstrak section 9 (FR) + parseAccurateNumber (section 13c) ---
const frStart = scriptCode.indexOf('// 9. LABA RUGI & NERACA');
const frEnd = scriptCode.indexOf('// 10. RINCIAN PENJUALAN');
if (frStart < 0 || frEnd < 0) { console.error('FR section not found', frStart, frEnd); process.exit(1); }
const frCode = scriptCode.substring(scriptCode.lastIndexOf('// ====', frStart), frEnd);

const panMatch = scriptCode.match(/function parseAccurateNumber\(s\) \{[\s\S]*?\n\}/);
if (!panMatch) { console.error('parseAccurateNumber not found'); process.exit(1); }

// --- Stub global yang dipakai section FR ---
const stubs = `
let userEdits = { extras: {} };
function saveEdits(e) {}
function hfGet() { return null; }
function showToast() {}
`;

const wrappedCode = stubs + frCode + '\n' + panMatch[0] + `
return { LR_ROWS_SEP, NERACA_ROWS_SEP, frDeepCopyRows, frZeroRows, frSumScope, frTotalValue,
  fmtFRNum, frNormName, isFRReportNoise, parseAccurateFRText, parseAccurateLabaRugiText,
  parseAccurateNeracaText, getLabaRugiBulan, saveLabaRugiBulan, getNeracaBulan,
  saveNeracaBulan, frMergeRows, frIsDefault, frClearSaved, parseAccurateNumber, userEdits };`;
const factory = new Function(wrappedCode);
const F = factory();

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  →  ' + extra : '')); }
}
function near(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 0.005 : tol); }
const V = (rows, id) => { const r = rows.find(x => x.id === id); return r ? F.frTotalValue(r, rows) : 0; };
const item = (rows, name) => rows.find(r => r.t === 'item' && F.frNormName(r.name) === F.frNormName(name));

// ============ A. Template default September (data Accurate) ============
console.log('\n[A] Template Laba Rugi September (embedded)');
const lrSep = F.frDeepCopyRows(F.LR_ROWS_SEP);
ok(V(lrSep, 'jp') === 174512860, 'Jumlah Pendapatan = 174.512.860', V(lrSep, 'jp'));
ok(near(V(lrSep, 'lk'), 34355002.93), 'Laba Kotor = 34.355.002,93', V(lrSep, 'lk'));
ok(near(V(lrSep, 'jbo'), 23232450.48), 'Jumlah Beban Operasional = 23.232.450,48', V(lrSep, 'jbo'));
ok(near(V(lrSep, 'po'), 11122552.45, 0.01), 'Pendapatan Operasional ≈ 11.122.552,44 (±0,01 pembulatan)', V(lrSep, 'po'));
ok(near(V(lrSep, 'jno'), 2844540), 'Jumlah Non Operasional = 2.844.540', V(lrSep, 'jno'));
ok(near(V(lrSep, 'lb'), 13967092.45, 0.01), 'Laba Bersih ≈ 13.967.092,44 (±0,01 pembulatan)', V(lrSep, 'lb'));
ok(near(V(lrSep, 'po0'), 174512860), 'Pendapatan Operasional (induk) = 174.512.860', V(lrSep, 'po0'));

console.log('\n[B] Template Neraca September (embedded)');
const nerSep = F.frDeepCopyRows(F.NERACA_ROWS_SEP);
ok(near(V(nerSep, 'jkas'), 15687880.5), 'Jumlah Kas dan Setara Kas = 15.687.880,5', V(nerSep, 'jkas'));
ok(near(V(nerSep, 'jal'), 371597914.6), 'JUMLAH ASET LANCAR = 371.597.914,6', V(nerSep, 'jal'));
ok(near(V(nerSep, 'jatl'), 550000000), 'JUMLAH ASET TIDAK LANCAR = 550.000.000', V(nerSep, 'jatl'));
ok(near(V(nerSep, 'jas'), 921597914.6), 'JUMLAH ASET = 921.597.914,6', V(nerSep, 'jas'));
ok(near(V(nerSep, 'jkjp'), 182300119.72), 'JUMLAH KEWAJIBAN JANGKA PENDEK = 182.300.119,72', V(nerSep, 'jkjp'));
ok(near(V(nerSep, 'jk'), 182300119.72), 'JUMLAH KEWAJIBAN = 182.300.119,72', V(nerSep, 'jk'));
ok(near(V(nerSep, 'jmod'), 659322106.95), 'Modal = 659.322.106,95', V(nerSep, 'jmod'));
ok(near(V(nerSep, 'jek'), 739297794.88), 'Jumlah Ekuitas = 739.297.794,88', V(nerSep, 'jek'));
ok(near(V(nerSep, 'jle'), 921597914.6), 'JUMLAH LIABILITAS DAN EKUITAS = 921.597.914,6', V(nerSep, 'jle'));
ok(near(V(nerSep, 'jas') - V(nerSep, 'jle'), 0, 0.01), 'Neraca SEIMBANG (Aset = Liab + Ekuitas)');

// ============ C. Paste parser Laba Rugi dari teks PDF ============
console.log('\n[C] Parse Accurate "Laba/Rugi (Standar)" Sep');
const lrText = fs.readFileSync('/home/z/my-project/scripts/data/lr_sep.txt', 'utf-8');
const lrParsed = F.parseAccurateLabaRugiText(lrText);
ok(lrParsed.length > 0, 'Parse menghasilkan rows', lrParsed.length);
const lrCustom = lrParsed.filter(r => r.custom);
ok(lrCustom.length === 0, 'Tidak ada akun asing yang ditambahkan', lrCustom.map(r => r.name).join('; '));
ok(item(lrParsed, 'Penjualan').v === 174564635, 'Penjualan = 174.564.635', item(lrParsed, 'Penjualan').v);
ok(item(lrParsed, 'Diskon Penjualan').v === -51775, 'Diskon Penjualan = -51.775', item(lrParsed, 'Diskon Penjualan').v);
ok(near(item(lrParsed, 'Beban Pokok Penjualan').v, 140157857.07), 'BPP = 140.157.857,07', item(lrParsed, 'Beban Pokok Penjualan').v);
ok(item(lrParsed, 'Beban Gaji & Upah').v === 21000000, 'Beban Gaji & Upah = 21.000.000');
ok(near(item(lrParsed, 'Beban Selisih Stock').v, -56460.52), 'Beban Selisih Stock = -56.460,52', item(lrParsed, 'Beban Selisih Stock').v);
ok(item(lrParsed, 'Pendapatan Diluar Usaha').v === 4587500, 'Pendapatan Diluar Usaha = 4.587.500 (alias Lainnya dipetakan)');
ok(item(lrParsed, 'Beban Diluar Usaha').v === 1742960, 'Beban Diluar Usaha = 1.742.960');
ok(V(lrParsed, 'jp') === 174512860, 'Jumlah Pendapatan = 174.512.860', V(lrParsed, 'jp'));
ok(near(V(lrParsed, 'lk'), 34355002.93), 'Laba Kotor = 34.355.002,93', V(lrParsed, 'lk'));
ok(near(V(lrParsed, 'lb'), 13967092.45, 0.01), 'Laba Bersih ≈ 13.967.092,44', V(lrParsed, 'lb'));

// ============ D. Paste parser Neraca dari teks PDF ============
console.log('\n[D] Parse Accurate "Neraca (Standar)" Sep (2 halaman)');
const nerText = fs.readFileSync('/home/z/my-project/scripts/data/neraca_sep.txt', 'utf-8');
const nerParsed = F.parseAccurateNeracaText(nerText);
ok(nerParsed.length > 0, 'Parse menghasilkan rows', nerParsed.length);
const nerCustom = nerParsed.filter(r => r.custom);
ok(nerCustom.length === 0, 'Kas & Bank / Piutang IDR / -0 dll tidak dobel hitung', nerCustom.map(r => r.name + '=' + r.v).join('; '));
ok(item(nerParsed, 'Kas Kecil').v === 1000000, 'Kas Kecil = 1.000.000');
ok(near(item(nerParsed, 'Kas Besar').v, 14468580.5), 'Kas Besar = 14.468.580,5');
ok(item(nerParsed, 'Selisih kas & Bank').v === -60700, 'Selisih kas & Bank = -60.700');
ok(item(nerParsed, 'Piutang Usaha').v === 36769260, 'Piutang Usaha = 36.769.260 (IDR digabung)');
ok(near(item(nerParsed, 'Persediaan').v, 121310270.1), 'Persediaan = 121.310.270,1');
ok(item(nerParsed, 'PPN Masukan').v === 197830504, 'PPN Masukan = 197.830.504');
ok(near(item(nerParsed, 'Utang Usaha').v, 173508611.72), 'Utang Usaha = 173.508.611,72');
ok(near(item(nerParsed, 'Equitas Saldo Awal').v, 825637777.72), 'Equitas Saldo Awal = 825.637.777,72');
ok(near(item(nerParsed, 'Laba Ditahan').v, -166315670.77), 'Laba Ditahan = -166.315.670,77');
ok(near(V(nerParsed, 'jas'), 921597914.6), 'JUMLAH ASET = 921.597.914,6', V(nerParsed, 'jas'));
ok(near(V(nerParsed, 'jk'), 182300119.72), 'JUMLAH KEWAJIBAN = 182.300.119,72', V(nerParsed, 'jk'));
ok(near(V(nerParsed, 'jek'), 739297794.88), 'Jumlah Ekuitas = 739.297.794,88', V(nerParsed, 'jek'));
ok(near(V(nerParsed, 'jle'), 921597914.6), 'JUMLAH LIAB & EKUITAS = 921.597.914,6', V(nerParsed, 'jle'));
ok(near(V(nerParsed, 'jas') - V(nerParsed, 'jle'), 0, 0.01), 'Neraca hasil paste SEIMBANG');

// ============ E. Akun tak dikenal otomatis ditambahkan ============
console.log('\n[E] Akun tak dikenal & nilai dalam kurung');
const lrText2 = lrText.replace('Beban Listrik 782.931', 'Beban Listrik 782.931\nBeban Bonus Karyawan 500.000');
const lrParsed2 = F.parseAccurateLabaRugiText(lrText2);
const bonus = lrParsed2.find(r => r.custom && F.frNormName(r.name) === 'beban bonus karyawan');
ok(!!bonus, 'Akun baru "Beban Bonus Karyawan" ditambahkan');
ok(bonus && bonus.sc.includes('ops'), 'Scope akun baru = beban operasional', bonus && bonus.sc);
const listrikIdx = lrParsed2.findIndex(r => F.frNormName(r.name) === 'beban listrik');
ok(bonus && lrParsed2.indexOf(bonus) === listrikIdx + 1, 'Akun baru disisipkan tepat setelah Beban Listrik');
ok(near(V(lrParsed2, 'jbo'), 23732450.48), 'Jumlah Beban Operasional ikut bertambah', V(lrParsed2, 'jbo'));

const nerText2 = nerText.replace('Selisih kas & Bank -60.700', 'Selisih kas & Bank (60.700)');
const nerParsed2 = F.parseAccurateNeracaText(nerText2);
ok(item(nerParsed2, 'Selisih kas & Bank').v === -60700, 'Nilai dalam kurung (60.700) = negatif -60.700', item(nerParsed2, 'Selisih kas & Bank').v);

// ============ F. Bulan tanpa data = nol, storage, merge ============
console.log('\n[F] Bulan lain, storage, dan merge');
const lrJan = F.getLabaRugiBulan(1);
ok(lrJan.every(r => r.t !== 'item' || r.v === 0), 'Laba Rugi Januari (tanpa data HF) = nol semua');
const nerMei = F.getNeracaBulan(5);
ok(nerMei.every(r => r.t !== 'item' || r.v === 0), 'Neraca Mei (tanpa data) = nol semua');
const lrSep2 = F.getLabaRugiBulan(9);
ok(item(lrSep2, 'Penjualan').v === 174564635, 'Laba Rugi September default = data Accurate');
const nerSep2 = F.getNeracaBulan(9);
ok(near(item(nerSep2, 'Piutang Usaha').v, 36769260), 'Neraca September default = data Accurate');

F.saveLabaRugiBulan(10, lrParsed2);
ok(F.userEdits.extras.labaRugiPerBulan['10'].length === lrParsed2.length, 'saveLabaRugiBulan menyimpan ke userEdits');
const lrOkt = F.getLabaRugiBulan(10);
ok(item(lrOkt, 'Beban Bonus Karyawan').v === 500000, 'getLabaRugiBulan membaca override bulan tersimpan');
F.frClearSaved('lr', 10);
ok(F.frIsDefault('lr', 10), 'frClearSaved menghapus override (kembali default)');

const merged = F.frMergeRows(lrSep, lrParsed2);
ok(item(merged, 'Beban Bonus Karyawan') && item(merged, 'Beban Bonus Karyawan').v === 500000, 'frMergeRows (append): akun baru masuk');
ok(item(merged, 'Penjualan').v === 174564635, 'frMergeRows: nilai akun lama ter-update');
ok(merged.find(r => r.id === 'lb') !== undefined, 'frMergeRows: baris total template tetap ada');

// fmtFRNum
ok(F.fmtFRNum(-51775) === '-51.775', 'fmtFRNum negatif = -51.775', F.fmtFRNum(-51775));
ok(F.fmtFRNum(15687880.5) === '15.687.880,5', 'fmtFRNum desimal = 15.687.880,5', F.fmtFRNum(15687880.5));
ok(F.fmtFRNum(0) === '0', 'fmtFRNum nol = 0');

console.log('\n========================================');
console.log('TOTAL: ' + pass + ' pass, ' + fail + ' fail');
process.exit(fail > 0 ? 1 : 0);
