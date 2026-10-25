// Test logika menu Piutang & Hutang yang baru dipisah
// Ekstrak fungsi murni dari HTML lalu uji dengan stub hfGet sesuai data Excel asli
const fs = require("fs");
const html = fs.readFileSync("/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html", "utf8");

function extract(startMarker, endMarker) {
  const i = html.indexOf(startMarker);
  if (i < 0) throw new Error("start not found: " + startMarker);
  const j = html.indexOf(endMarker, i);
  if (j < 0) throw new Error("end not found: " + endMarker);
  return html.slice(i, j);
}

const blockPiu = extract("const PIUTANG_FIELDS", "function attachMonthCellEdit"); // getPiutangRows, savePiutangBulan, getTunaiKreditRows
const blockUtang = extract("function getUtangRows", "function renderHutang");     // getUtangRows, saveUtangBulan, getFakturBelumLunas

// ---- Stub data Excel (dari inspect_piutang_sheet.js) ----
const CELLS = {};
function put(row, C, D, E, F) {
  if (C !== null) CELLS["C" + row] = C;
  if (D !== null) CELLS["D" + row] = D;
  if (E !== null) CELLS["E" + row] = E;
  if (F !== null) CELLS["F" + row] = F;
}
// PIUTANG rows 8-19 (C=saldoAwal, D=penjualan, E=pembayaran, F=penyesuaian)
put(8, 40997000, 25896000, 58646000, null);
put(9, 8247000, 86713000, 86713000, null);
put(10, 8247000, 79847500, 49510000, null);
put(11, 38587500, 69722500, 108310000, 3000);
put(12, 0, 34177000, 25552000, null);
for (let r = 13; r <= 19; r++) put(r, 8625000, null, null, null);
// TUNAI vs KREDIT rows 23-34 (C=tunai, D=kredit)
put(23, 84517750, 25896000, null, null);
put(24, 78603000, 86713000, null, null);
put(25, 70458007.05, 79847500, null, null);
put(26, 71867000, 69722500, null, null);
put(27, 68641900, 34177000, null, null);
// UTANG rows 40-51 (C=saldoAwal, D=penyesuaianAwal, E=pembelian, F=pembayaran)
put(40, 207593888.4, 1744066.4, 56477948.5, 120953853);
put(41, 142827747, -290236.9, 142341409.8, 132822659);
put(42, 160165232.10000002, 7818734.3, 76381076.11, 95186464);
put(43, 199047033.00000003, 57687188.79, 118343945.31, 131359237);
put(44, 182797148.31000006, -3234593, 41237292.61, 139877810);
for (let r = 45; r <= 51; r++) put(r, 84156630.92000008, null, null, null);

// ---- Sandbox ----
const BULAN_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const userEdits = {};
function saveEdits(u) { /* no-op */ }
function hfGet(sheet, coord) {
  if (sheet !== "Piutang & Utang") return null;
  return CELLS.hasOwnProperty(coord) ? CELLS[coord] : null;
}
const TX_SEED = [
  { tanggal: "2026-09-01", kuantitas: 10, hargaSatuan: 100, kategori: "NOTA KECIL" }, // tunai 1000
  { tanggal: "2026-09-05", kuantitas: 2,  hargaSatuan: 250, kategori: "NOTA BESAR" }, // kredit 500
  { tanggal: "2026-09-30", kuantitas: 5,  hargaSatuan: 200, kategori: "NOTA KECIL" }, // tunai 1000
];
function getTxData(type) { return type === "penjualan" ? TX_SEED : []; }
const EXTRAS = { fakturBelumLunas: [
  { supplier: "PT ABC", noFaktur: "PI.1", tanggal: "2026-08-24", jatuhTempo: "2026-09-23", umur: 37, nilai: 8108108.11, status: "TERLEWAT" },
  { supplier: "CV XYZ", noFaktur: "PI.2", tanggal: "2026-09-10", jatuhTempo: "2026-10-10", umur: 20, nilai: 5000000, status: "BERJALAN" },
]};

const ctx = { PIUTANG: null };
const sandbox = { BULAN_NAMES, userEdits, saveEdits, hfGet, getTxData, EXTRAS };
// eslint-disable-next-line no-unused-vars
const vm = require("vm");
vm.createContext(sandbox);
vm.runInContext(blockPiu + "\n" + blockUtang, sandbox);

let pass = 0, fail = 0;
function eq(name, actual, expected) {
  const ok = Math.abs(actual - expected) < 0.01;
  if (ok) { pass++; console.log(`  ✓ ${name} = ${actual}`); }
  else { fail++; console.error(`  ✗ ${name}: got ${actual}, expected ${expected}`); }
}
function ok(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.error(`  ✗ ${name}`); }
}

console.log("== getPiutangRows (dari Excel) ==");
let rows = sandbox.getPiutangRows();
ok("12 bulan", rows.length === 12);
ok("bulan[0]=Januari", rows[0].bulan === "Januari");
eq("Jan saldoAwal", rows[0].saldoAwal, 40997000);
eq("Jan saldoAkhir (40997000+25896000-58646000)", rows[0].saldoAkhir, 8247000);
eq("Feb saldoAkhir (8247000+86713000-86713000)", rows[1].saldoAkhir, 8247000);
eq("Apr penyesuaian", rows[3].penyesuaian, 3000);
// Penyesuaian TIDAK ditambahkan ke saldo akhir (sudah termasuk saldo awal, sama dengan Excel: G11=0)
eq("Apr saldoAkhir (tanpa penyesuaian, sesuai Excel)", rows[3].saldoAkhir, 0);
eq("Des saldoAkhir", rows[11].saldoAkhir, 8625000);

console.log("== savePiutangBulan + override ==");
rows[0].saldoAwal = 50000000;
sandbox.savePiutangBulan(rows);
ok("override tersimpan di userEdits.extras.piutangBulan['1']", userEdits.extras && userEdits.extras.piutangBulan && userEdits.extras.piutangBulan["1"].saldoAwal === 50000000);
rows = sandbox.getPiutangRows();
eq("Jan saldoAwal override", rows[0].saldoAwal, 50000000);
eq("Jan saldoAkhir override", rows[0].saldoAkhir, 50000000 + 25896000 - 58646000);
eq("Feb tak terpengaruh", rows[1].saldoAwal, 8247000);
ok("4 field tersimpan per bulan", Object.keys(userEdits.extras.piutangBulan["2"]).length === 4);

console.log("== getTunaiKreditRows (live + Excel fallback) ==");
const tk = sandbox.getTunaiKreditRows();
ok("12 bulan", tk.length === 12);
ok("Sep fromTx", tk[8].fromTx === true);
eq("Sep tunai live (1000+1000)", tk[8].tunai, 2000);
eq("Sep kredit live (500)", tk[8].kredit, 500);
ok("Jan dari Excel", tk[0].fromTx === false);
eq("Jan tunai Excel", tk[0].tunai, 84517750);
eq("Jan kredit Excel", tk[0].kredit, 25896000);
eq("Jun kosong", tk[5].tunai + tk[5].kredit, 0);
ok("Des fromTx=false", tk[11].fromTx === false);

console.log("== getUtangRows (dari Excel) ==");
let urows = sandbox.getUtangRows();
ok("12 bulan", urows.length === 12);
eq("Jan penyesuaianAwal", urows[0].penyesuaianAwal, 1744066.4);
eq("Jan saldoAkhir", urows[0].saldoAkhir, 143117983.9);
eq("Feb penyesuaianAwal negatif", urows[1].penyesuaianAwal, -290236.9);
eq("Feb saldoAkhir", urows[1].saldoAkhir, 152346497.8);
eq("Sep saldoAkhir", urows[8].saldoAkhir, 84156630.92);

console.log("== saveUtangBulan + override ==");
urows[8].pembayaran = 40000000;
sandbox.saveUtangBulan(urows);
urows = sandbox.getUtangRows();
eq("Sep pembayaran override", urows[8].pembayaran, 40000000);
eq("Sep saldoAkhir override", urows[8].saldoAkhir, 84156630.92 - 40000000);
ok("4 field tersimpan per bulan", Object.keys(userEdits.extras.utangBulan["9"]).length === 4);

console.log("== getFakturBelumLunas ==");
let fk = sandbox.getFakturBelumLunas();
eq("fallback EXTRAS (2 faktur)", fk.length, 2);
eq("total nilai", fk.reduce((s, f) => s + f.nilai, 0), 13108108.11);
userEdits.extras.fakturBelumLunas = [{ supplier: "X", noFaktur: "F1", nilai: 100, status: "BERJALAN", umur: 1, tanggal: "", jatuhTempo: "" }];
fk = sandbox.getFakturBelumLunas();
eq("override userEdits", fk.length, 1);
delete userEdits.extras.fakturBelumLunas;

console.log(`\nHASIL: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
