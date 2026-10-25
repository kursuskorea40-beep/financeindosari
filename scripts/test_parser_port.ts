// Test the Accurate parser ported to TS — verify Penjualan + Pembelian parse correctly
// Uses the same sample data as the HTML akuntansi test

import {
  parseAccurateNumber,
  parseAccurateDate,
  parseAccurateRincianText,
  parseAccurateRincianPembelianText,
} from "../src/lib/accurate-parser";

let pass = 0, fail = 0;
function ok(cond: boolean, name: string, extra?: any) {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${extra !== undefined ? " → " + JSON.stringify(extra) : ""}`); }
}
function near(a: number, b: number, tol = 0.005) { return Math.abs(a - b) <= tol; }

console.log("\n=== A. parseAccurateNumber (Indonesian format) ===");
ok(parseAccurateNumber("2.198.000") === 2198000, "2.198.000 → 2198000");
ok(parseAccurateNumber("39,25") === 39.25, "39,25 → 39.25");
ok(parseAccurateNumber("8.108.108,11") === 8108108.11, "8.108.108,11 → 8108108.11 (near)", parseAccurateNumber("8.108.108,11"));
ok(near(parseAccurateNumber("8.108.108,11"), 8108108.11), "8.108.108,11 ≈ 8108108.11");
ok(parseAccurateNumber("0") === 0, "0 → 0");
ok(parseAccurateNumber("") === 0, "empty → 0");

console.log("\n=== B. parseAccurateDate (month map) ===");
ok(parseAccurateDate("06 Sep 2026") === "2026-09-06", "06 Sep 2026");
ok(parseAccurateDate("01 Agt 2026") === "2026-08-01", "01 Agt 2026 (Agt short)");
ok(parseAccurateDate("15 Aug 2026") === "2026-08-15", "15 Aug 2026 (Aug english)");
ok(parseAccurateDate("31 Okt 2026") === "2026-10-31", "31 Okt 2026");
ok(parseAccurateDate("invalid") === null, "invalid → null");

console.log("\n=== C. parseAccurateRincianText (Penjualan sample) ===");
const sampleJual = `INDOSARI
Rincian Penjualan per Barang
Dari 01 Sep 2026 s/d 30 Sep 2026

ALKOHOL
00054260906 06 Sep 2026 5 Ltr 280.000
SI.2026.09.00001 06 Sep 2026 NB. 708 39 Ltr 2.184.000
166,25 8.076.000

BENZOAT HOLLAND
00002260901 01 Sep 2026 0,25 Kg 18.500
00003260901 01 Sep 2026 2 Kg 146.000
58,25 4.133.500`;

const rowsJual = parseAccurateRincianText(sampleJual);
ok(rowsJual.length === 4, `4 transaksi terparse (subtotal/header skip)`, rowsJual.length);
if (rowsJual.length >= 4) {
  ok(rowsJual[0].namaBarang === "ALKOHOL", `row 0 namaBarang=ALKOHOL`, rowsJual[0].namaBarang);
  ok(rowsJual[0].noNota === "00054260906", `row 0 noNota=00054260906`, rowsJual[0].noNota);
  ok(rowsJual[0].tanggal === "2026-09-06", `row 0 tanggal=2026-09-06`, rowsJual[0].tanggal);
  ok(rowsJual[0].kuantitas === 5, `row 0 qty=5`, rowsJual[0].kuantitas);
  ok(rowsJual[0].hargaSatuan === 56000, `row 0 hargaSatuan=56000 (280000/5)`, rowsJual[0].hargaSatuan);
  ok(rowsJual[1].noNota === "SI.2026.09.00001", `row 1 noNota=SI.2026.09.00001`, rowsJual[1].noNota);
  ok(rowsJual[1].kategori === "NOTA BESAR", `row 1 kategori=NOTA BESAR`, rowsJual[1].kategori);
  ok(rowsJual[1].catatan === "NB.708", `row 1 catatan=NB.708`, rowsJual[1].catatan);
  ok(rowsJual[2].namaBarang === "BENZOAT HOLLAND", `row 2 namaBarang=BENZOAT HOLLAND`, rowsJual[2].namaBarang);
  ok(rowsJual[2].kuantitas === 0.25, `row 2 qty=0.25 (Indonesian comma)`, rowsJual[2].kuantitas);
  ok(rowsJual[2].hargaSatuan === 74000, `row 2 hargaSatuan=74000 (18500/0.25)`, rowsJual[2].hargaSatuan);
}
const totJual = rowsJual.reduce((s, r) => s + r.kuantitas * r.hargaSatuan, 0);
ok(totJual === 280000 + 2184000 + 18500 + 292000, `total = Rp ${totJual.toLocaleString("id-ID")} (expected 2,774,500)`, totJual);

console.log("\n=== D. parseAccurateRincianPembelianText (Pembelian sample) ===");
const sampleBeli = `INDOSARI
Rincian Pembelian per Barang
Dari 01 Sep 2026 s/d 30 Sep 2026

ALKOHOL
PI.2026.09.000146 24 Sep 2026 Giro 0058 24,25 Kg 8.108.108,11
00009260901 01 Sep 2026 1 Kg 12.000
25,25 8.120.108,11

BENZOAT HOLLAND
PI.2026.09.000150 09 Sep 2026 Tempo 09 Okt 2026 175 Kg 8.750.000
PI.2026.09.000152 12 Sep 2026 Lunas 50 Kg 1.825.000`;

const rowsBeli = parseAccurateRincianPembelianText(sampleBeli);
ok(rowsBeli.length === 4, `4 transaksi pembelian terparse`, rowsBeli.length);
if (rowsBeli.length >= 4) {
  ok(rowsBeli[0].noFaktur === "PI.2026.09.000146", `row 0 noFaktur`, rowsBeli[0].noFaktur);
  ok(rowsBeli[0].kuantitas === 24.25, `row 0 qty=24,25`, rowsBeli[0].kuantitas);
  ok(near(rowsBeli[0].hargaSatuan, 334267), `row 0 hargaSatuan≈334267 (8108108.11/24.25)`, rowsBeli[0].hargaSatuan);
  ok(rowsBeli[0].isLunas === false, `row 0 isLunas=false (Giro → kredit)`, rowsBeli[0].isLunas);
  ok(rowsBeli[0].catatan.includes("Giro"), `row 0 catatan contains 'Giro'`, rowsBeli[0].catatan);
  ok(rowsBeli[1].noFaktur === "00009260901", `row 1 noFaktur`, rowsBeli[1].noFaktur);
  ok(rowsBeli[1].isLunas === true, `row 1 isLunas=true (empty keterangan → tunai)`, rowsBeli[1].isLunas);
  ok(rowsBeli[2].isLunas === false, `row 2 isLunas=false (Tempo → kredit)`, rowsBeli[2].isLunas);
  ok(rowsBeli[2].jatuhTempo === "2026-10-09", `row 2 jatuhTempo=2026-10-09`, rowsBeli[2].jatuhTempo);
  ok(rowsBeli[3].isLunas === true, `row 3 isLunas=true ('Lunas' keyword)`, rowsBeli[3].isLunas);
}

console.log("\n" + "=".repeat(48));
console.log(`TOTAL: ${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
