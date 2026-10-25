// Test: paste PDF Agustus ke parser Penjualan (setelah fix agt:8)
const fs = require('fs');

const html = fs.readFileSync('/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html', 'utf-8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const scriptCode = scriptMatch[1];

// Extract the whole 13c. SMART PARSER section
const start = scriptCode.indexOf('// 13c. SMART PARSER');
const end = scriptCode.indexOf('function showPasteAccurateDialog');
if (start < 0 || end < 0) { console.error('section not found', start, end); process.exit(1); }
const parserCode = scriptCode.substring(start, end);

const wrappedCode = parserCode + '\nreturn { parseAccurateRincianText, parseAccurateDate };';
const F = new Function(wrappedCode)();

// Verify month map fix
console.log('--- Verify ACCURATE_MONTH_MAP ---');
console.log('  agt →', F.parseAccurateDate('06 Agt 2026'));
console.log('  agu →', F.parseAccurateDate('01 Agu 2026'));
console.log('  sep →', F.parseAccurateDate('01 Sep 2026'));
console.log('  okt →', F.parseAccurateDate('01 Okt 2026'));

// Load PDF text (extract from PDF on the fly using pdftotext if available, else use the
// text content from the user message which is sufficient to validate parsing).
// For simplicity, save a representative sample to /tmp and parse it.
const sample = `INDOSARI
Rincian Penjualan per Barang
Dari 01 Agu 2026 s/d 31 Agu 2026
Cabang : [Semua Cabang]
Nomor # Tanggal Keterangan Kuantitas Satuan Penjualan
ALKOHOL
00054260806 06 Agt 2026 5 Ltr 280.000
SI.2026.08.00001 06 Agt 2026 NB. 708 39 Ltr 2.184.000
SI.2026.08.00003 15 Agt 2026 NB. 711 22,5 Ltr 1.260.000
SI.2026.08.00005 19 Agt 2026 NB. 712 20 Ltr 1.120.000
148,5 8.076.000
AMONIAK RRC / AMONIUM
BICARBONATE (AMONIA KUE)
00115260813 13 Agt 2026 2 Kg 24.000
00251260831 31 Agt 2026 2 Kg 24.000
4 48.000
BENZOAT HOLLAND
00002260801 01 Agt 2026 0,25 Kg 18.500
00003260801 01 Agt 2026 2 Kg 146.000
SI.2026.08.00002 12 Agt 2026 NB. 709 500 Kg 18.000.000
58,25 4.133.500
ACCURATE Accounting System Report
Tercetak pada 25 October 2026 - 10:18
Halaman 1 dari 41
INDOSARI
Rincian Penjualan per Barang
Dari 01 Agu 2026 s/d 31 Agu 2026
Nomor # Tanggal Keterangan Kuantitas Satuan Penjualan
WARNA TIMBANG / SUNSEA @25 KG
(EGG YELLOW 2115 - KUNING TELUR)
00025260804 04 Agt 2026 1 Kg 42.000
00206260825 25 Agt 2026 0,25 Kg 10.500
SI.2026.08.00007 31 Agt 2026 NB. 714 125 Kg 4.375.000
129,65 4.570.000`;

const rows = F.parseAccurateRincianText(sample);
console.log('\n--- Parsing result ---');
console.log(`  ${rows.length} transaksi terparse`);
let totalQty = 0, totalAmt = 0;
const byProduct = {};
for (const r of rows) {
  const amt = (r.kuantitas || 0) * (r.hargaSatuan || 0);
  totalQty += r.kuantitas || 0;
  totalAmt += amt;
  byProduct[r.namaBarang] = (byProduct[r.namaBarang] || 0) + amt;
}
console.log(`  Total qty: ${totalQty}`);
console.log(`  Total amount: Rp ${totalAmt.toLocaleString('id-ID')}`);
console.log(`  Sample row 0:`, rows[0]);
const nbRowSample = rows.find(r => r.kategori === 'NOTA BESAR');
console.log(`  Sample NB row:`, nbRowSample);

console.log('\n--- Per-product summary ---');
for (const [p, a] of Object.entries(byProduct)) {
  console.log(`  ${p}: Rp ${a.toLocaleString('id-ID')}`);
}

const expectedTotal = 4844000 + 48000 + 18164500 + 4427500; // ALKOHOL(4 lines) + AMONIAK + BENZOAT(3 lines) + WARNA EGG(3 lines)
console.log(`\n--- Validation ---`);
console.log(`  Expected (truncated 12 lines): Rp ${expectedTotal.toLocaleString('id-ID')}`);
console.log(`  Got: Rp ${totalAmt.toLocaleString('id-ID')}`);
console.log(`  Match: ${totalAmt === expectedTotal ? '✓ YES' : '✗ NO'}`);

const nbRowSample2 = rows.find(r => r.kategori === 'NOTA BESAR');
const allDatesValid = rows.every(r => r.tanggal && r.tanggal.startsWith('2026-08'));
const allNBTagged = rows.filter(r => r.kategori === 'NOTA BESAR').every(r => r.catatan && r.catatan.startsWith('NB.'));
console.log(`\n--- Quality checks ---`);
console.log(`  All 12 dates parsed as 2026-08-xx: ${allDatesValid ? '✓' : '✗'}`);
console.log(`  All NOTA BESAR rows have NB. catatan: ${allNBTagged ? '✓' : '✗'}`);
console.log(`  Multi-line product name "AMONIAK RRC / AMONIUM BICARBONATE (AMONIA KUE)" joined: ${byProduct['AMONIAK RRC / AMONIUM BICARBONATE (AMONIA KUE)'] ? '✓' : '✗'}`);
console.log(`  Multi-line product name "WARNA TIMBANG / SUNSEA @25 KG (EGG YELLOW 2115 - KUNING TELUR)" joined: ${byProduct['WARNA TIMBANG / SUNSEA @25 KG (EGG YELLOW 2115 - KUNING TELUR)'] ? '✓' : '✗'}`);

const allOk = totalAmt === expectedTotal && allDatesValid && allNBTagged
  && byProduct['AMONIAK RRC / AMONIUM BICARBONATE (AMONIA KUE)']
  && byProduct['WARNA TIMBANG / SUNSEA @25 KG (EGG YELLOW 2115 - KUNING TELUR)'];

console.log(`\n${allOk ? '✓ ALL TESTS PASS' : '✗ TESTS FAILED'}`);
process.exit(allOk ? 0 : 1);
