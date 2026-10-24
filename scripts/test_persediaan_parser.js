// Test the Persediaan parser with sample data
const fs = require('fs');

const html = fs.readFileSync('/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html', 'utf-8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const scriptCode = scriptMatch[1];

global.document = {
  getElementById: () => ({ textContent: "", value: "", onchange: null, onclick: null, oninput: null, innerHTML: "", classList: { add: ()=>{}, remove: ()=>{}, contains: ()=>false }, style: {}, appendChild: ()=>{}, querySelectorAll: () => [], setSelectionRange: ()=>{} }),
  createElement: () => ({ className: "", value: "", type: "", inputMode: "", onclick: null, oninput: null, onblur: null, onkeydown: null, dataset: {}, appendChild: ()=>{}, focus: ()=>{}, select: ()=>{}, click: ()=>{}, href: "", download: "" }),
  body: { insertAdjacentHTML: () => {} },
};
global.localStorage = { getItem: () => null, setItem: () => {} };
global.window = { print: () => {}, location: {} };
global.HyperFormula = { buildFromSheets: () => ({ doesSheetExist: ()=>false, getSheetId: ()=>0, getCellValue: ()=>null, setCellContents: ()=>{}, recompute: ()=>{} }), };
global.Papa = { parse: () => {}, unparse: () => "" };
global.XLSX = { read: () => ({}), utils: { sheet_to_json: () => [] } };
global.confirm = () => true;
global.alert = () => {};
global.URL = { createObjectURL: () => "blob://test", revokeObjectURL: () => {} };
global.Blob = function() {};

// Extract parser section: 13c SMART PARSER through end of persediaan parser (13e ends before showPasteAccurateDialog)
const parserStart = scriptCode.indexOf('// 13c. SMART PARSER');
const parserEnd = scriptCode.indexOf('function showPasteAccurateDialog');
const sectionStart = scriptCode.lastIndexOf('// ====', parserStart);
const parserCode = scriptCode.substring(sectionStart, parserEnd);
const wrappedCode = parserCode + '\nreturn { parseAccurateRincianText, parseAccurateRincianPembelianText, parseAccuratePersediaanText, parseAccurateNumber, parseAccurateDate, normHeaderStr, PERS_FIELD_ALIASES };';
const factory = new Function(wrappedCode);
const { parseAccuratePersediaanText, normHeaderStr, PERS_FIELD_ALIASES } = factory();

console.log('=== Test Persediaan Parser ===\n');

// Test 1: Full "Laporan Persediaan Bulanan" format (with AWAL/MASUK/KELUAR/AKHIR)
const fullFormatText = `
                                                                       INDOSARI

                                                      Laporan Persediaan Bulanan
                                                        Dari 01 Sep 2026 s/d 30 Sep 2026
                                                                                                                           Cabang : [Semua Cabang]



  KODE       NAMA BARANG                       SATUAN   AWAL QTY   AWAL NILAI   MASUK QTY   MASUK NILAI   KELUAR QTY   KELUAR NILAI   AKHIR QTY   AKHIR NILAI

  A00002     ALKOHOL                           Ltr      157,25     6.374.998    200          8.108.108     166,25      6.739.863     191         7.743.242
  A00010     BENZOAT RRC / SODIUM BENZOAT     Kg       59         1.771.112    1.100        38.162.500    1.076,5     37.260.308    82,5        2.673.303
  A00009     BENZOAT HOLLAND                  Kg       43,25      2.174.028    175          8.750.000     174,75      8.746.730     43,5        2.177.298
                                                                                                                               
                                                                       Total                                                                        18.193.843
ACCURATE Accounting System Report
Tercetak pada 25 October 2026 - 01:50
Halaman 1 dari 1`;

console.log('--- Test 1: Full format (AWAL/MASUK/KELUAR/AKHIR) ---');
const items1 = parseAccuratePersediaanText(fullFormatText);
const totalAwal1 = items1.reduce((s, r) => s + r.awalNilai, 0);
const totalMasuk1 = items1.reduce((s, r) => s + r.masukNilai, 0);
const totalKeluar1 = items1.reduce((s, r) => s + r.keluarNilai, 0);
const totalAkhir1 = totalAwal1 + totalMasuk1 - totalKeluar1;
console.log(`Parsed ${items1.length} items (expected: 3)`);
console.log(`Saldo Awal: Rp ${totalAwal1.toLocaleString('id-ID')}`);
console.log(`Masuk: Rp ${totalMasuk1.toLocaleString('id-ID')}`);
console.log(`Keluar: Rp ${totalKeluar1.toLocaleString('id-ID')}`);
console.log(`Akhir (auto): Rp ${totalAkhir1.toLocaleString('id-ID')}`);

if (items1.length > 0) {
  console.log('\nFirst item details:');
  const it = items1[0];
  console.log(`  kode: ${it.kode}`);
  console.log(`  nama: ${it.nama}`);
  console.log(`  satuan: ${it.satuan}`);
  console.log(`  awalQty: ${it.awalQty}, awalNilai: ${it.awalNilai}`);
  console.log(`  masukQty: ${it.masukQty}, masukNilai: ${it.masukNilai}`);
  console.log(`  keluarQty: ${it.keluarQty}, keluarNilai: ${it.keluarNilai}`);
  console.log(`  (computed akhirQty = ${it.awalQty + it.masukQty - it.keluarQty})`);
}

// Test 2: Simple "Daftar Nilai Persediaan" (only AKHIR)
console.log('\n--- Test 2: Simple format (only QTY + NILAI = snapshot) ---');
const simpleFormatText = `
                                                                       INDOSARI

                                                      Daftar Nilai Persediaan
                                                        Per 30 Sep 2026
                                                                                                                           Cabang : [Semua Cabang]



  KODE       NAMA BARANG                       SATUAN   QTY           NILAI

  A00002     ALKOHOL                           Ltr      191            7.743.242
  A00010     BENZOAT RRC / SODIUM BENZOAT     Kg       82,5           2.673.303
  A00009     BENZOAT HOLLAND                  Kg       43,5           2.177.298
                                                                                                                               
                                                                       Total                                                                        12.593.843
ACCURATE Accounting System Report
Tercetak pada 25 October 2026 - 01:50
Halaman 1 dari 1`;

const items2 = parseAccuratePersediaanText(simpleFormatText);
const totalMasuk2 = items2.reduce((s, r) => s + r.masukNilai, 0);
console.log(`Parsed ${items2.length} items (expected: 3)`);
console.log(`Total masukNilai (= akhirNilai in this mode): Rp ${totalMasuk2.toLocaleString('id-ID')}`);
console.log(`Expected total: Rp 12.593.843 (12,593,843)`);

if (items2.length > 0) {
  console.log('\nFirst item (should have masukQty = akhirQty, awalQty = 0, keluarQty = 0):');
  const it = items2[0];
  console.log(`  kode: ${it.kode}, nama: ${it.nama}, satuan: ${it.satuan}`);
  console.log(`  awalQty: ${it.awalQty}, awalNilai: ${it.awalNilai}`);
  console.log(`  masukQty: ${it.masukQty}, masukNilai: ${it.masukNilai}`);
  console.log(`  keluarQty: ${it.keluarQty}, keluarNilai: ${it.keluarNilai}`);
  console.log(`  (computed akhirQty = ${it.awalQty + it.masukQty - it.keluarQty}, should = ${it.masukQty})`);
}

// Test 3: Number parsing edge cases
console.log('\n--- Number parsing tests (Indonesian format) ---');
const { parseAccurateNumber } = factory();
const testCases = [
  ['157,25', 157.25],
  ['6.374.998', 6374998],
  ['1.076,5', 1076.5],
  ['82,5', 82.5],
  ['200', 200],
  ['1.100', 1100],
  ['43,25', 43.25],
];
let pass = 0, fail = 0;
testCases.forEach(([input, expected]) => {
  const result = parseAccurateNumber(input);
  if (Math.abs(result - expected) < 0.001) {
    pass++;
    console.log(`  ✓ parseAccurateNumber('${input}') = ${result}`);
  } else {
    fail++;
    console.log(`  ✗ parseAccurateNumber('${input}') = ${result} (expected ${expected})`);
  }
});
console.log(`Number tests: ${pass} pass, ${fail} fail`);

// Test 4: Header normalization
console.log('\n--- Header normalization tests ---');
const headerTests = [
  ['AWAL QTY', 'awal qty'],
  ['Awal (Qty)', 'awal'],
  ['SATUAN', 'satuan'],
  ['Nama Barang', 'nama barang'],
  ['SALDO AKHIR (NILAI)', 'saldo akhir'],
  ['HPP', 'hpp'],
];
headerTests.forEach(([input, expected]) => {
  const result = normHeaderStr(input);
  if (result === expected) console.log(`  ✓ normHeaderStr('${input}') = '${result}'`);
  else console.log(`  ✗ normHeaderStr('${input}') = '${result}' (expected '${expected}')`);
});
