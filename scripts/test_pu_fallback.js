// Test robustness patches: faktur dengan spasi + diagnostik + posisi 5 token
const fs = require('fs');

const html = fs.readFileSync('/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html', 'utf-8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const scriptCode = scriptMatch[1];

const puStart = scriptCode.indexOf('// 13f. SMART PARSER');
const puEnd = scriptCode.indexOf('function showPasteAccurateDialog');
const puCode = scriptCode.substring(scriptCode.lastIndexOf('// ====', puStart), puEnd);

const panMatch = scriptCode.match(/function parseAccurateNumber\(s\) \{[\s\S]*?\n\}/);
const padMatch = scriptCode.match(/function parseAccurateDate\(s\) \{[\s\S]*?\n\}/);
const monthMapMatch = scriptCode.match(/const ACCURATE_MONTH_MAP = \{[\s\S]*?\};/);

const wrappedCode = monthMapMatch[0] + '\n' + panMatch[0] + '\n' + padMatch[0] + '\n' + puCode +
  `\nreturn { parseAccuratePiutangUtangText, looksLikeFakturToken, looksLikeJoinedFaktur, isAmountLikeToken };`;
const F = new Function(wrappedCode)();

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : '')); }
}
function near(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 0.005 : tol); }

// === I. Faktur dengan spasi "SI 2026 08 00012" ===
console.log('\n[I] Faktur format spasi: "SI 2026 08 00012"');
const rowsI = F.parseAccuratePiutangUtangText(`
TOKO MAKMUR
SI 2026 08 00012  15 Aug 2026  14 Sep 2026  12.500.000  0  12.500.000`, 'piutang');
ok(rowsI.length === 1, '1 faktur dengan format spasi', rowsI.length);
if (rowsI[0]) {
  ok(rowsI[0].noFaktur === 'SI.2026.08.00012', 'noFaktur digabung: SI.2026.08.00012', rowsI[0].noFaktur);
  ok(near(rowsI[0].sisa, 12500000), 'sisa = 12.500.000', rowsI[0].sisa);
}

// === J. Faktur di posisi >3 (Outstanding di depan) ===
console.log('\n[J] Faktur setelah kolom leading "Outstanding"');
const rowsJ = F.parseAccuratePiutangUtangText(`
CV BINTANG JAYA ABADI
Outstanding   SI.2026.07.00008   20 Jul 2026   19 Aug 2026   21.250.000   0   21.250.000`, 'piutang');
ok(rowsJ.length === 1, '1 faktur (kolom "Outstanding" di-depan dilewati)', rowsJ.length);
if (rowsJ[0]) {
  ok(rowsJ[0].noFaktur === 'SI.2026.07.00008', 'noFaktur benar', rowsJ[0].noFaktur);
  ok(near(rowsJ[0].sisa, 21250000), 'sisa = 21.250.000', rowsJ[0].sisa);
}

// === K. Faktur dengan prefix 2-kolom ===
console.log('\n[K] Faktur dengan 2 kolom leading');
const rowsK = F.parseAccuratePiutangUtangText(`
CV BINTANG JAYA ABADI
1  IDR  PI.2026.09.00015  05 Sep 2026  05 Okt 2026  3.500.000  1.000.000  2.500.000`, 'hutang');
ok(rowsK.length === 1, '1 faktur (2 kolom leading: urut + IDR)', rowsK.length);
if (rowsK[0]) {
  ok(rowsK[0].noFaktur === 'PI.2026.09.00015', 'noFaktur benar', rowsK[0].noFaktur);
  ok(near(rowsK[0].sisa, 2500000), 'sisa = 2.500.000', rowsK[0].sisa);
}

// === L. Diagnostik: 0 hasil tersimpan ke lastDebug ===
console.log('\n[L] lastDebug disimpan bila 0 faktur');
const rowsL = F.parseAccuratePiutangUtangText(`
INDOSARI
Daftar Piutang Usaha
Per Tgl. 30 Sep 2026

Toko 99
Hanya kalimat tanpa faktur sama sekali.`, 'piutang');
ok(rowsL.length === 0, '0 hasil (parser tidak crash)', rowsL.length);
ok(F.parseAccuratePiutangUtangText.lastDebug !== undefined, 'lastDebug terisi', typeof F.parseAccuratePiutangUtangText.lastDebug);
if (F.parseAccuratePiutangUtangText.lastDebug) {
  ok(F.parseAccuratePiutangUtangText.lastDebug.totalLines === 7, 'totalLines = 7', F.parseAccuratePiutangUtangText.lastDebug.totalLines);
  ok(Array.isArray(F.parseAccuratePiutangUtangText.lastDebug.skippedWithDigit), 'skippedWithDigit array', F.parseAccuratePiutangUtangText.lastDebug.skippedWithDigit);
}

// === M. Regression: nama party dengan angka "Toko 99" TIDAK boleh dikenali sebagai faktur ===
console.log('\n[M] Regression: "Toko 99" tidak boleh jadi faktur');
ok(F.looksLikeJoinedFaktur('Toko.99') === false, 'Toko.99 ditolak (hanya 1 grup angka)', F.looksLikeJoinedFaktur('Toko.99'));
ok(F.looksLikeJoinedFaktur('SI.2026.08.00012') === true, 'SI.2026.08.00012 diterima', F.looksLikeJoinedFaktur('SI.2026.08.00012'));
ok(F.looksLikeJoinedFaktur('PI.2026.09.00015') === true, 'PI.2026.09.00015 diterima', F.looksLikeJoinedFaktur('PI.2026.09.00015'));
ok(F.isAmountLikeToken('12.500.000') === true, '12.500.000 = amount-like', F.isAmountLikeToken('12.500.000'));
ok(F.isAmountLikeToken('0') === true, '"0" = amount-like', F.isAmountLikeToken('0'));
ok(F.isAmountLikeToken('00012') === false, '00012 bukan amount-like', F.isAmountLikeToken('00012'));
ok(F.isAmountLikeToken('2026') === false, '2026 bukan amount-like', F.isAmountLikeToken('2026'));

// === N. Format alternatif: "INV/2026/09/0001" (slash separator) ===
console.log('\n[N] Format INV/2026/09/0001 (slash separator)');
const rowsN = F.parseAccuratePiutangUtangText(`
PT MAJU JAYA
INV/2026/09/0001  10 Sep 2026  10 Okt 2026  5.000.000  0  5.000.000`, 'piutang');
ok(rowsN.length === 1, '1 faktur slash-format', rowsN.length);
if (rowsN[0]) {
  ok(rowsN[0].noFaktur === 'INV/2026/09/0001', 'noFaktur slash-format dikenali', rowsN[0].noFaktur);
  ok(near(rowsN[0].sisa, 5000000), 'sisa = 5.000.000', rowsN[0].sisa);
}

console.log('\n' + '='.repeat(48));
console.log(`TOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);

