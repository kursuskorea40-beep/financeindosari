// Verify the embedded COMBINED JSON in the HTML file
const fs = require('fs');

const html = fs.readFileSync('/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html', 'utf-8');
const m = html.match(/const COMBINED = (\{.*?\});\n/);
if (!m) { console.error('COMBINED not found'); process.exit(1); }
const combined = JSON.parse(m.group ? m.group(1) : m[1]);

console.log('=== Embedded data verification ===\n');

// 1. EXTRAS.rincianPenjualan
const txs = combined.extras.rincianPenjualan;
const total = txs.reduce((s, r) => s + r.kuantitas * r.hargaSatuan, 0);
const items = new Set(txs.map(r => r.namaBarang));
console.log(`1. EXTRAS.rincianPenjualan:`);
console.log(`   ${txs.length} transactions (expected: 868)`);
console.log(`   ${items.size} unique items (expected: 98)`);
console.log(`   Total: Rp ${total.toLocaleString('id-ID')} (expected: ~Rp 174,512,856)`);

// 2. Per Barang (Sep) sheet
const perBarang = combined.excelSheets.renderSheets['Per Barang (Sep)'];
console.log(`\n2. Per Barang (Sep) sheet:`);
console.log(`   Total rows: ${perBarang.length}`);
// Find F108 (TOTAL)
const row108 = perBarang[107];
const f108 = row108.find(c => c.coord === 'F108');
console.log(`   F108 (TOTAL): Rp ${f108.value.toLocaleString('id-ID')} (formula: ${f108.formula})`);

// Check first item row (row 7)
const row7 = perBarang[6];
const c7 = row7.find(c => c.coord === 'C7');
const d7 = row7.find(c => c.coord === 'D7');
const e7 = row7.find(c => c.coord === 'E7');
const f7 = row7.find(c => c.coord === 'F7');
console.log(`   Row 7 first item: ${c7.value} | ${d7.value} | qty=${e7.value} | Rp ${f7.value.toLocaleString('id-ID')}`);

// 3. Laba Rugi C14
const labaRugi = combined.excelSheets.renderSheets['Laba Rugi'];
const row14 = labaRugi[13];
const c14 = row14.find(c => c.coord === 'C14');
console.log(`\n3. Laba Rugi September penjualan (C14):`);
console.log(`   Rp ${c14.value.toLocaleString('id-ID')} (expected: Rp 174,512,880)`);

// 4. HF_SHEETS check
const hfSheets = combined.excelSheets.hfSheets;
const perBarangHF = hfSheets['Per Barang (Sep)'];
console.log(`\n4. HF_SHEETS verification:`);
console.log(`   Per Barang (Sep) HF rows: ${perBarangHF.length}`);
const hfF108 = perBarangHF[107][5];
console.log(`   HF F108: ${hfF108}`);
const hfRow7 = perBarangHF[6];
console.log(`   HF row 7: B=${hfRow7[1]}, C=${hfRow7[2]}, D=${hfRow7[3]}, E=${hfRow7[4]}, F=${hfRow7[5]}`);

const labaRugiHF = hfSheets['Laba Rugi'];
console.log(`   Laba Rugi HF C14 (row 13, col 2): ${labaRugiHF[13][2]}`);

// 5. Master data still intact
console.log(`\n5. Master data integrity:`);
console.log(`   masterBarang: ${combined.extras.masterBarang.length} items`);
console.log(`   masterSupplier: ${combined.extras.masterSupplier.length} items`);
console.log(`   masterPelanggan: ${combined.extras.masterPelanggan.length} items`);
console.log(`   rincianPembelian: ${combined.extras.rincianPembelian.length} transactions`);
console.log(`   persediaanPerBulan: ${Object.keys(combined.extras.persediaanPerBulan).length} months`);

console.log('\n=== Verification complete ===');
