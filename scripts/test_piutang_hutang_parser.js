// Unit test parser 13f: parseAccuratePiutangUtangText + hitungUmurStatus
const fs = require('fs');

const html = fs.readFileSync('/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html', 'utf-8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) { console.error('Could not extract inline script'); process.exit(1); }
const scriptCode = scriptMatch[1];

// --- Ekstrak section 13f (parser PU) ---
const puStart = scriptCode.indexOf('// 13f. SMART PARSER');
const puEnd = scriptCode.indexOf('function showPasteAccurateDialog');
if (puStart < 0 || puEnd < 0) { console.error('PU section not found', puStart, puEnd); process.exit(1); }
const puCode = scriptCode.substring(scriptCode.lastIndexOf('// ====', puStart), puEnd);

// --- parseAccurateNumber + parseAccurateDate dari 13c ---
const panMatch = scriptCode.match(/function parseAccurateNumber\(s\) \{[\s\S]*?\n\}/);
const padMatch = scriptCode.match(/function parseAccurateDate\(s\) \{[\s\S]*?\n\}/);
const monthMapMatch = scriptCode.match(/const ACCURATE_MONTH_MAP = \{[\s\S]*?\};/);
if (!panMatch || !padMatch || !monthMapMatch) { console.error('helper parsers not found'); process.exit(1); }

// --- hitungUmurStatus dari section 12 ---
const husMatch = scriptCode.match(/function hitungUmurStatus\(f\) \{[\s\S]*?\n\}/);
if (!husMatch) { console.error('hitungUmurStatus not found'); process.exit(1); }

const wrappedCode = monthMapMatch[0] + '\n' + panMatch[0] + '\n' + padMatch[0] + '\n' + husMatch[0] + '\n' + puCode + `
return { parseAccuratePiutangUtangText, looksLikeFakturToken, hitungUmurStatus, parseAccurateNumber };`;
const F = new Function(wrappedCode)();

let pass = 0, fail = 0;
function ok(cond, name, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra !== undefined ? '  →  ' + JSON.stringify(extra) : '')); }
}
function near(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 0.005 : tol); }

// ============ A. Laporan "Daftar Piutang Usaha" lengkap ============
console.log('\n[A] Daftar Piutang Usaha — format standar Accurate');
const teksPiu = `INDOSARI
Daftar Piutang Usaha
Per Tgl. 30 Sep 2026
Cabang: Utama
No. Faktur    Tanggal      Jatuh Tempo      Jumlah     Dibayar        Sisa

TOKO MAKMUR SEJAHTERA
SI.2026.08.00012  15 Aug 2026  14 Sep 2026  12.500.000  0  12.500.000
SI.2026.09.00031  05 Sep 2026  05 Okt 2026  8.750.000  0  8.750.000
Subtotal                    21.250.000  0  21.250.000

CV SINAR JAYA
SI.2026.07.00004  20 Jul 2026  19 Aug 2026  21.250.000  5.000.000  16.250.000
Subtotal                    21.250.000  5.000.000  16.250.000

TOTAL                          42.500.000  5.000.000  37.500.000`;
const rowsPiu = F.parseAccuratePiutangUtangText(teksPiu, 'piutang');
ok(rowsPiu.length === 3, '3 faktur terparse (subtotal/total/header dilewati)', rowsPiu.length);
ok(rowsPiu[0].party === 'TOKO MAKMUR SEJAHTERA', 'party 1 = TOKO MAKMUR SEJAHTERA', rowsPiu[0].party);
ok(rowsPiu[2].party === 'CV SINAR JAYA', 'party 3 = CV SINAR JAYA', rowsPiu[2].party);
ok(rowsPiu[0].noFaktur === 'SI.2026.08.00012', 'noFaktur benar', rowsPiu[0].noFaktur);
ok(rowsPiu[0].tanggal === '2026-08-15', 'tanggal faktur 2026-08-15', rowsPiu[0].tanggal);
ok(rowsPiu[0].jatuhTempo === '2026-09-14', 'jatuh tempo 2026-09-14', rowsPiu[0].jatuhTempo);
ok(near(rowsPiu[0].jumlah, 12500000) && near(rowsPiu[0].dibayar, 0) && near(rowsPiu[0].sisa, 12500000), 'jumlah/dibayar/sisa baris 1', rowsPiu[0]);
ok(near(rowsPiu[2].dibayar, 5000000) && near(rowsPiu[2].sisa, 16250000), 'baris 3 ada pembayaran parsial', rowsPiu[2]);
const totSisa = rowsPiu.reduce((s, r) => s + r.sisa, 0);
ok(near(totSisa, 37500000), 'total sisa = 37.500.000', totSisa);

// ============ B. Format 2 angka (Jumlah + Sisa tanpa Dibayar) ============
console.log('\n[B] Format 2 angka (Jumlah + Sisa)');
const rowsB = F.parseAccuratePiutangUtangText(`
PT MAJU BERSAMA
SI.2026.09.00050  10 Sep 2026  10 Okt 2026  3.000.000  1.000.000`, 'piutang');
ok(rowsB.length === 1, '1 faktur', rowsB.length);
ok(near(rowsB[0].jumlah, 3000000), 'jumlah = 3.000.000', rowsB[0].jumlah);
ok(near(rowsB[0].sisa, 1000000), 'sisa = 1.000.000', rowsB[0].sisa);
ok(near(rowsB[0].dibayar, 2000000), 'dibayar auto = jumlah - sisa = 2.000.000', rowsB[0].dibayar);

// ============ C. Kolom umur di tengah (4 angka) ============
console.log('\n[C] Kolom Umur di tengah (4 angka → 3 terakhir = Jumlah/Dibayar/Sisa)');
const rowsC = F.parseAccuratePiutangUtangText(`
TOKO AMAN JAYA
SI.2026.06.00001  01 Jun 2026  01 Jul 2026  96  5.000.000  2.000.000  3.000.000`, 'piutang');
ok(rowsC.length === 1, '1 faktur', rowsC.length);
ok(near(rowsC[0].jumlah, 5000000) && near(rowsC[0].dibayar, 2000000) && near(rowsC[0].sisa, 3000000), 'umur 96 dilewati, 3 angka terakhir benar', rowsC[0]);

// ============ D. Faktur angka murni + desimal + kurung negatif ============
console.log('\n[D] Faktur angka murni, sen desimal, kurung negatif');
const rowsD = F.parseAccuratePiutangUtangText(`
BINTANG TIMUR MITRA ABADI, PT
00009260901  24 Aug 2026  23 Sep 2026  8.108.108,11  0  8.108.108,11
00009260902  25 Aug 2026  24 Sep 2026  (60.700)  (60.700)`, 'hutang');
ok(rowsD.length === 2, '2 faktur', rowsD.length);
ok(rowsD[0].noFaktur === '00009260901', 'faktur angka murni terbaca', rowsD[0].noFaktur);
ok(near(rowsD[0].sisa, 8108108.11), 'sen desimal 8.108.108,11', rowsD[0].sisa);
ok(near(rowsD[1].sisa, -60700), 'kurung = negatif -60.700 (format Indonesia)', rowsD[1].sisa);

// ============ E. Tanggal bergaris + prefix party + nomor urut ============
console.log('\n[E] Tanggal 01-Sep-2026, prefix "Pelanggan:", nomor urut di depan');
const rowsE = F.parseAccuratePiutangUtangText(`
INDOSARI
Daftar Piutang Usaha
Per Tgl. 30 Sep 2026
No. Faktur    Tanggal      Jatuh Tempo    Jumlah      Dibayar      Sisa
Pelanggan: TOKO BARU LANCAR
1  SI.2026.09.00077  01-Sep-2026  01-Okt-2026  999.500  0  999.500`, 'piutang');
ok(rowsE.length === 1, '1 faktur (header lengkap dilewati)', rowsE.length);
ok(rowsE[0].party === 'TOKO BARU LANCAR', 'party dari prefix Pelanggan:', rowsE[0].party);
ok(rowsE[0].noFaktur === 'SI.2026.09.00077', 'noFaktur dilewati kolom urut', rowsE[0].noFaktur);
ok(rowsE[0].tanggal === '2026-09-01', 'tanggal dash-format', rowsE[0].tanggal);
ok(rowsE[0].jatuhTempo === '2026-10-01', 'jatuh tempo dash-format', rowsE[0].jatuhTempo);
ok(near(rowsE[0].sisa, 999500), 'sisa 999.500', rowsE[0].sisa);

// ============ F. Daftar Utang Usaha ============
console.log('\n[F] Daftar Utang Usaha (hutang)');
const rowsF = F.parseAccuratePiutangUtangText(`
INDOSARI
Daftar Utang Usaha
Per Tgl. 30 Sep 2026

BIRAN
PI.2026.08.000145  22 Aug 2026  21 Sep 2026  550.000  0  550.000

SUPPLIER SERGAP
PI.2026.09.000162  16 Sep 2026  16 Okt 2026  8.108.108,11  0  8.108.108,11`, 'hutang');
ok(rowsF.length === 2, '2 faktur supplier', rowsF.length);
ok(rowsF[0].party === 'BIRAN' && rowsF[1].party === 'SUPPLIER SERGAP', 'party supplier benar', rowsF.map(r=>r.party));
ok(near(rowsF.reduce((s,r)=>s+r.sisa,0), 8658108.11), 'total hutang 8.658.108,11', rowsF.reduce((s,r)=>s+r.sisa,0));

// ============ G. looksLikeFakturToken ============
console.log('\n[G] looksLikeFakturToken');
ok(F.looksLikeFakturToken('PI.2026.09.000146') === true, 'PI.2026.09.000146 = faktur');
ok(F.looksLikeFakturToken('00009260901') === true, '00009260901 = faktur');
ok(F.looksLikeFakturToken('21.250.000') === false, '21.250.000 = angka, bukan faktur');
ok(F.looksLikeFakturToken('96') === false, '96 = angka, bukan faktur');
ok(F.looksLikeFakturToken('IDR') === false, 'IDR bukan faktur');
ok(F.looksLikeFakturToken('12.500') === false, '12.500 = angka, bukan faktur');

// ============ H. hitungUmurStatus dinamis ============
console.log('\n[H] hitungUmurStatus (dinamis vs hari ini)');
const d = (off) => { const t = new Date(); t.setHours(0,0,0,0); t.setDate(t.getDate() + off); return t.toISOString().slice(0,10); };
const s1 = F.hitungUmurStatus({ tanggal: d(-40), jatuhTempo: d(-10), umur: 99, status: 'BERJALAN' });
ok(s1.status === 'TERLEWAT', 'jatuh tempo lewat 10 hari → TERLEWAT', s1);
ok(s1.umur === 40, 'umur dihitung dari tanggal faktur = 40', s1.umur);
const s2 = F.hitungUmurStatus({ tanggal: d(-5), jatuhTempo: d(10) });
ok(s2.status === 'BERJALAN', 'jatuh tempo 10 hari lagi → BERJALAN', s2);
ok(s2.umur === 5, 'umur = 5 hari', s2.umur);
const s3 = F.hitungUmurStatus({ tanggal: '', jatuhTempo: '', umur: 14, status: 'BERJALAN' });
ok(s3.status === 'BERJALAN' && s3.umur === 14, 'tanpa tanggal → fallback data asli', s3);

console.log('\n' + '='.repeat(48));
console.log(`TOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
