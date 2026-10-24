// Test the JS parser against the user's PDF text
const fs = require('fs');

// Load the HTML and extract the inline script
const html = fs.readFileSync('/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html', 'utf-8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) {
  console.error('Could not extract inline script');
  process.exit(1);
}
const scriptCode = scriptMatch[1];

// Mock the document, localStorage, and library globals
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

// Extract just the parser functions (parseAccurateNumber, parseAccurateDate, isAccurateHeaderOrFooter, isAccurateTransaction, isAccurateSubtotal, parseAccurateTransaction, parseAccurateRincianText, ACCURATE_MONTH_MAP)
// These are at the end of the script, after showImportDialog
// We just need to evaluate the parser section

// Simple approach: try to extract just the parser section
const parserStart = scriptCode.indexOf('// 13c. SMART PARSER');
const parserEnd = scriptCode.indexOf('// 14. Excel sheet table render');
if (parserStart < 0 || parserEnd < 0) {
  console.error('Could not find parser section');
  console.log('Parser start:', parserStart, 'End:', parserEnd);
  process.exit(1);
}

// Get the comment line above + the parser code
const sectionStart = scriptCode.lastIndexOf('// ====', parserStart);
const parserCode = scriptCode.substring(sectionStart, parserEnd);
// console.log('Parser code length:', parserCode.length);
// console.log('Parser code starts with:', parserCode.substring(0, 200));

// Wrap in a function to avoid global leakage issues
const wrappedCode = parserCode + '\nreturn { parseAccurateRincianText, parseAccurateNumber, parseAccurateDate };';
const factory = new Function(wrappedCode);
const { parseAccurateRincianText, parseAccurateNumber, parseAccurateDate } = factory();

// Test the parser against the user's PDF text
const pdfText = fs.readFileSync('/tmp/rincian.txt', 'utf-8');
console.log('PDF text length:', pdfText.length);

const transactions = parseAccurateRincianText(pdfText);
const total = transactions.reduce((s, r) => s + r.kuantitas * r.hargaSatuan, 0);
const items = new Set(transactions.map(r => r.namaBarang));

console.log(`Parsed ${transactions.length} transactions`);
console.log(`Unique items: ${items.size}`);
console.log(`Total: Rp ${total.toLocaleString('id-ID')}`);
console.log(`Expected: Rp 174,512,880`);
console.log(`Difference: Rp ${(174512880 - total).toLocaleString('id-ID')}`);

console.log('\nFirst 5 transactions:');
transactions.slice(0, 5).forEach((tx, i) => {
  console.log(`  ${i+1}. ${tx.tanggal} | ${tx.noNota} | ${tx.namaBarang} | ${tx.kuantitas} ${tx.satuan} | Rp ${tx.hargaSatuan.toLocaleString('id-ID')} | ${tx.kategori}`);
});

console.log('\nTop 5 items by value:');
const byItem = {};
transactions.forEach(r => {
  if (!byItem[r.namaBarang]) byItem[r.namaBarang] = { nama: r.namaBarang, qty: 0, total: 0 };
  byItem[r.namaBarang].qty += r.kuantitas;
  byItem[r.namaBarang].total += r.kuantitas * r.hargaSatuan;
});
Object.values(byItem).sort((a, b) => b.total - a.total).slice(0, 5).forEach(item => {
  console.log(`  ${item.nama.substring(0, 50).padEnd(50)} | ${item.qty.toFixed(2).padStart(10)} | Rp ${item.total.toLocaleString('id-ID').padStart(15)}`);
});

// Test edge cases
console.log('\n--- Number parsing tests ---');
const testCases = [
  ['39,25', 39.25],
  ['2.198.000', 2198000],
  ['1.000', 1000],
  ['1.750', 1750],
  ['166,25', 166.25],
  ['9.310.000', 9310000],
  ['0,5', 0.5],
  ['5', 5],
  ['12.000', 12000],
];
let pass = 0, fail = 0;
testCases.forEach(([input, expected]) => {
  const result = parseAccurateNumber(input);
  if (Math.abs(result - expected) < 0.001) {
    pass++;
    // console.log(`  ✓ parseAccurateNumber('${input}') = ${result} (expected ${expected})`);
  } else {
    fail++;
    console.log(`  ✗ parseAccurateNumber('${input}') = ${result} (expected ${expected})`);
  }
});
console.log(`Number tests: ${pass} pass, ${fail} fail`);

console.log('\n--- Date parsing tests ---');
const dateTests = [
  ['01 Sep 2026', '2026-09-01'],
  ['15 Agu 2026', '2026-08-15'],
  ['30 Sep 2026', '2026-09-30'],
];
dateTests.forEach(([input, expected]) => {
  const result = parseAccurateDate(input);
  if (result === expected) console.log(`  ✓ parseAccurateDate('${input}') = ${result}`);
  else console.log(`  ✗ parseAccurateDate('${input}') = ${result} (expected ${expected})`);
});
