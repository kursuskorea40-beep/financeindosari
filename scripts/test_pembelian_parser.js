// Test the Pembelian parser with synthetic sample data
const fs = require('fs');

const html = fs.readFileSync('/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html', 'utf-8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const scriptCode = scriptMatch[1];

// Mock globals
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

// Extract the parser section
const parserStart = scriptCode.indexOf('// 13c. SMART PARSER');
const parserEnd = scriptCode.indexOf('// 14. Excel sheet table render');
const sectionStart = scriptCode.lastIndexOf('// ====', parserStart);
const parserCode = scriptCode.substring(sectionStart, parserEnd);
const wrappedCode = parserCode + '\nreturn { parseAccurateRincianText, parseAccurateRincianPembelianText, parseAccuratePembelianTransaction, parseAccurateNumber, parseAccurateDate };';
const factory = new Function(wrappedCode);
const { parseAccurateRincianText, parseAccurateRincianPembelianText, parseAccuratePembelianTransaction, parseAccurateNumber } = factory();

// Sample Accurate "Rincian Pembelian per Barang" text
const sampleText = `
                                                                       INDOSARI

                                                      Rincian Pembelian per Barang
                                                        Dari 01 Sep 2026 s/d 30 Sep 2026
                                                                                                                           Cabang : [Semua Cabang]



            Nomor #                     Tanggal          Keterangan                              Kuantitas   Satuan   Pembelian

         ALKOHOL
            PI.2026.09.000146          24 Aug 2026      Giro 0058                                 24,25   Ltr      8.108.108,11
            00009260901                01 Sep 2026                                                1   Kg          12.000
            00161260921                21 Sep 2026                                                2   Kg          24.000
                                                                                                   27,25             8.120.108,11
         BENZOAT HOLLAND
            PI.2026.09.000150          09 Sep 2026      Tempo 09 Okt 2026                        175   Kg      8.750.000
            PI.2026.09.000151          10 Sep 2026      JT 25/10/2026                            25   Kg      1.250.000
            PI.2026.09.000152          15 Sep 2026      Lunas                                     10   Kg      500.000
                                                                                                  210             10.500.000
`;

console.log('=== Test Pembelian Parser ===\n');
const transactions = parseAccurateRincianPembelianText(sampleText);
const total = transactions.reduce((s, r) => s + r.kuantitas * r.hargaSatuan, 0);
console.log(`Parsed ${transactions.length} transactions (expected: 6)`);
console.log(`Total: Rp ${total.toLocaleString('id-ID')}`);

console.log('\n--- Transactions ---');
transactions.forEach((tx, i) => {
  console.log(`${i+1}. ${tx.tanggal} | ${tx.noFaktur} | ${tx.namaBarang} | ${tx.kuantitas} ${tx.satuan} | Rp ${tx.hargaSatuan.toLocaleString('id-ID')} | ${tx.isLunas?'LUNAS':'KREDIT'} | JT: ${tx.jatuhTempo||'-'} | Catatan: "${tx.catatan||''}"`);
});

// Test edge cases
console.log('\n--- Number parsing tests (with cents) ---');
const testCases = [
  ['24,25', 24.25],
  ['8.108.108,11', 8108108.11],  // amount with cents
  ['8.108.108', 8108108],
  ['175', 175],
  ['1.250.000', 1250000],
];
let pass = 0, fail = 0;
testCases.forEach(([input, expected]) => {
  const result = parseAccurateNumber(input);
  const diff = Math.abs(result - expected);
  if (diff < 0.001) {
    pass++;
    console.log(`  ✓ parseAccurateNumber('${input}') = ${result}`);
  } else {
    fail++;
    console.log(`  ✗ parseAccurateNumber('${input}') = ${result} (expected ${expected})`);
  }
});
console.log(`Number tests: ${pass} pass, ${fail} fail`);

console.log('\n--- Field verification ---');
const expectedFields = ['tanggal', 'noFaktur', 'namaBarang', 'satuan', 'kuantitas', 'hargaSatuan', 'supplier', 'isLunas', 'jatuhTempo', 'catatan'];
const hasAllFields = transactions.every(tx => expectedFields.every(f => f in tx));
console.log(`All transactions have all required fields: ${hasAllFields}`);

// Test the transactions match expectations
console.log('\n--- Transaction details verification ---');
if (transactions.length >= 6) {
  console.log('TX1 (PI.2026.09.000146):');
  console.log(`  noFaktur: ${transactions[0].noFaktur} (expected PI.2026.09.000146)`);
  console.log(`  tanggal: ${transactions[0].tanggal} (expected 2026-08-24)`);
  console.log(`  kuantitas: ${transactions[0].kuantitas} (expected 24.25)`);
  console.log(`  hargaSatuan: ${transactions[0].hargaSatuan} (expected ~334268)`);
  console.log(`  isLunas: ${transactions[0].isLunas} (expected false - has 'Giro' keterangan)`);
  console.log(`  catatan: ${transactions[0].catatan}`);

  console.log('\nTX2 (00009260901 - no keterangan, tunai):');
  console.log(`  noFaktur: ${transactions[1].noFaktur}`);
  console.log(`  isLunas: ${transactions[1].isLunas}`);
  console.log(`  catatan: "${transactions[1].catatan}"`);

  console.log('\nTX3 (PI.2026.09.000150 - has Tempo dd Mmm yyyy):');
  console.log(`  noFaktur: ${transactions[2].noFaktur}`);
  console.log(`  isLunas: ${transactions[2].isLunas} (expected false - has Tempo)`);
  console.log(`  jatuhTempo: ${transactions[2].jatuhTempo} (expected 2026-10-09)`);

  console.log('\nTX4 (PI.2026.09.000151 - has JT dd/mm/yyyy):');
  console.log(`  jatuhTempo: ${transactions[3].jatuhTempo} (expected 2026-10-25)`);

  console.log('\nTX5 (PI.2026.09.000152 - has "Lunas"):');
  console.log(`  isLunas: ${transactions[4].isLunas} (expected true)`);
}
