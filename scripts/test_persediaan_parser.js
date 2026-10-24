// Test the Persediaan parser with multiple realistic Accurate paste formats
const fs = require('fs');

const html = fs.readFileSync('/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html', 'utf-8');
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);
const scriptCode = scriptMatch[1];

// Mock globals
global.document = { getElementById: () => ({ textContent:"", value:"", onchange:null, onclick:null, oninput:null, innerHTML:"", classList:{add:()=>{},remove:()=>{},contains:()=>false}, style:{}, appendChild:()=>{}, querySelectorAll:()=>[], setSelectionRange:()=>{} }), createElement: () => ({ className:"", value:"", type:"", inputMode:"", onclick:null, dataset:{}, appendChild:()=>{}, focus:()=>{}, select:()=>{}, click:()=>{}, href:"", download:"" }), body:{ insertAdjacentHTML:()=>{} } };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.window = { print: () => {}, location: {} };
global.HyperFormula = { buildFromSheets: () => ({ doesSheetExist:()=>false, getSheetId:()=>0, getCellValue:()=>null, setCellContents:()=>{}, recompute:()=>{} }) };
global.Papa = { parse: () => {}, unparse: () => "" };
global.XLSX = { read: () => ({}), utils: { sheet_to_json: () => [] } };
global.confirm = () => true; global.alert = () => {};
global.URL = { createObjectURL: () => "blob://t", revokeObjectURL: () => {} };
global.Blob = function() {};

// Extract parser sections (13c → before 14)
const parserStart = scriptCode.indexOf('// 13c. SMART PARSER');
const parserEnd = scriptCode.indexOf('// 14. Excel sheet table render');
const sectionStart = scriptCode.lastIndexOf('// ====', parserStart);
const parserCode = scriptCode.substring(sectionStart, parserEnd);
const factory = new Function(parserCode + '\nreturn { parseAccuratePersediaanText, parseAccurateNumber };');
const { parseAccuratePersediaanText, parseAccurateNumber } = factory();

let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name} — ${detail}`); }
}

// ============ TEST 1: Excel-style full mutasi (multi-space, header detected) ============
console.log('\n=== TEST 1: Excel-style full mutasi (multi-space) ===');
const t1 = parseAccuratePersediaanText(`KODE      NAMA BARANG                       SATUAN   AWAL QTY   AWAL NILAI   MASUK QTY   MASUK NILAI   KELUAR QTY   KELUAR NILAI   AKHIR QTY   AKHIR NILAI
A00002    ALKOHOL                           Ltr      157,25     6.374.998    200          8.108.108     166,25      6.739.863     191         7.743.242
A00010    BENZOAT RRC / SODIUM BENZOAT     Kg       59         1.771.112    1.100        38.162.500    1.076,5     37.260.308    82,5        2.673.303`);
check("2 items parsed", t1.length === 2, `got ${t1.length}`);
check("kode A00002", t1[0]?.kode === "A00002", t1[0]?.kode);
check("nama ALKOHOL", t1[0]?.nama === "ALKOHOL", t1[0]?.nama);
check("satuan Ltr", t1[0]?.satuan === "Ltr", t1[0]?.satuan);
check("awalQty 157.25", t1[0]?.awalQty === 157.25, t1[0]?.awalQty);
check("awalNilai 6374998", t1[0]?.awalNilai === 6374998, t1[0]?.awalNilai);
check("masukQty 200", t1[0]?.masukQty === 200, t1[0]?.masukQty);
check("masukNilai 8108108", t1[0]?.masukNilai === 8108108, t1[0]?.masukNilai);
check("keluarQty 166.25", t1[0]?.keluarQty === 166.25, t1[0]?.keluarQty);
check("keluarNilai 6739863", t1[0]?.keluarNilai === 6739863, t1[0]?.keluarNilai);
const akhir1 = t1[0] ? t1[0].awalQty + t1[0].masukQty - t1[0].keluarQty : 0;
check("computed akhirQty = 191 (matches source akhir)", Math.abs(akhir1 - 191) < 0.001, akhir1);
check("kode A00010 nama multi-kata", t1[1]?.nama === "BENZOAT RRC / SODIUM BENZOAT", t1[1]?.nama);
check("A00010 awalQty 59", t1[1]?.awalQty === 59, t1[1]?.awalQty);

// ============ TEST 2: PDF single-space paste (no detectable header) ============
console.log('\n=== TEST 2: PDF single-space paste (fallback strategy) ===');
const t2 = parseAccuratePersediaanText(`INDOSARI
Mutasi Persediaan per Barang
Dari 01 Sep 2026 s/d 30 Sep 2026
Cabang : [Semua Cabang]
Kode Nama Barang Satuan Saldo Awal Penerimaan Pengeluaran Saldo Akhir
Qty Nilai Qty Nilai Qty Nilai Qty Nilai
A00002 ALKOHOL Ltr 157,25 6.374.998 200 8.108.108 166,25 6.739.863 191 7.743.242
A00010 BENZOAT RRC / SODIUM BENZOAT Kg 59 1.771.112 1.100 38.162.500 1.076,5 37.260.308 82,5 2.673.303
Total 273,5 8.146.110 1.300 46.270.608 1.242,75 44.000.171 330,75 10.416.545`);
check("2 items parsed (headers/total skipped)", t2.length === 2, `got ${t2.length}`);
check("A00002 awalQty 157.25", t2[0]?.awalQty === 157.25, t2[0]?.awalQty);
check("A00002 masukNilai 8108108", t2[0]?.masukNilai === 8108108, t2[0]?.masukNilai);
check("A00002 keluarQty 166.25", t2[0]?.keluarQty === 166.25, t2[0]?.keluarQty);
check("A00010 nama multi-kata", t2[1]?.nama === "BENZOAT RRC / SODIUM BENZOAT", t2[1]?.nama);
check("A00010 masukQty 1100", t2[1]?.masukQty === 1100, t2[1]?.masukQty);
const akhir2 = t2[0] ? t2[0].awalQty + t2[0].masukQty - t2[0].keluarQty : 0;
check("computed akhirQty = 191", Math.abs(akhir2 - 191) < 0.001, akhir2);

// ============ TEST 3: Snapshot format (Daftar Nilai Persediaan) ============
console.log('\n=== TEST 3: Snapshot (only QTY + NILAI) ===');
const t3 = parseAccuratePersediaanText(`KODE      NAMA BARANG                       SATUAN   QTY        NILAI
A00002    ALKOHOL                           Ltr      191         7.743.242
A00010    BENZOAT RRC / SODIUM BENZOAT     Kg       82,5        2.673.303`);
check("2 items parsed", t3.length === 2, `got ${t3.length}`);
check("A00002 masukQty=191 (snapshot → masuk=akhir)", t3[0]?.masukQty === 191, t3[0]?.masukQty);
check("A00002 masukNilai=7743242", t3[0]?.masukNilai === 7743242, t3[0]?.masukNilai);
check("A00002 awal=0", t3[0]?.awalQty === 0 && t3[0]?.awalNilai === 0, `${t3[0]?.awalQty}/${t3[0]?.awalNilai}`);
const akhir3 = t3[0] ? t3[0].awalQty + t3[0].masukQty - t3[0].keluarQty : 0;
check("computed akhirQty = 191", Math.abs(akhir3 - 191) < 0.001, akhir3);
check("A00010 masukQty=82.5", t3[1]?.masukQty === 82.5, t3[1]?.masukQty);

// ============ TEST 4: Wrapped item name (2-line row) ============
console.log('\n=== TEST 4: Wrapped item name ===');
const t4 = parseAccuratePersediaanText(`KODE      NAMA BARANG                       SATUAN   AWAL QTY   AWAL NILAI   MASUK QTY   MASUK NILAI   KELUAR QTY   KELUAR NILAI   AKHIR QTY   AKHIR NILAI
A00010    SODIUM TAWON SAK (RTB) - RTB / 25
           Kg       125         8.625.000    0            0             0            0             125         8.625.000
A00020    ALKOHOL                           Ltr      10         560.000      5            280.000       3            168.000       12          672.000`);
check("2 items parsed (wrap merged)", t4.length === 2, `got ${t4.length}`);
check("kode A00010", t4[0]?.kode === "A00010", t4[0]?.kode);
check("nama wrapped: SODIUM TAWON SAK (RTB) - RTB / 25", t4[0]?.nama === "SODIUM TAWON SAK (RTB) - RTB / 25", t4[0]?.nama);
check("satuan Kg", t4[0]?.satuan === "Kg", t4[0]?.satuan);
check("awalQty 125", t4[0]?.awalQty === 125, t4[0]?.awalQty);
check("next item not polluted", t4[1]?.nama === "ALKOHOL", t4[1]?.nama);
check("next item awalQty 10", t4[1]?.awalQty === 10, t4[1]?.awalQty);

// ============ TEST 5: Full report with page breaks ============
console.log('\n=== TEST 5: Report with page breaks ===');
const t5 = parseAccuratePersediaanText(`INDOSARI
Mutasi Persediaan per Barang
Dari 01 Sep 2026 s/d 30 Sep 2026
Cabang : [Semua Cabang]
Kode      Nama Barang      Satuan      Saldo Awal      Penerimaan      Pengeluaran      Saldo Akhir
                                       Qty      Nilai      Qty      Nilai      Qty      Nilai      Qty      Nilai
A00001    BENZOAT HOLLAND  Kg          100      5.000.000  50       2.500.000  80       4.000.000  70       3.500.000

ACCURATE Accounting System Report
Tercetak pada 25 October 2026 - 01:27
Halaman 1 dari 2

INDOSARI
Mutasi Persediaan per Barang
Dari 01 Sep 2026 s/d 30 Sep 2026
Cabang : [Semua Cabang]
Kode      Nama Barang      Satuan      Saldo Awal      Penerimaan      Pengeluaran      Saldo Akhir
                                       Qty      Nilai      Qty      Nilai      Qty      Nilai      Qty      Nilai
A00002    ALKOHOL          Ltr         50       2.500.000  20       1.000.000  30       1.500.000  40       2.000.000
ACCURATE Accounting System Report
Tercetak pada 25 October 2026 - 01:27
Halaman 2 dari 2`);
check("2 items parsed across pages", t5.length === 2, `got ${t5.length}`);
check("A00001 nama", t5[0]?.nama === "BENZOAT HOLLAND", t5[0]?.nama);
check("A00001 awalQty 100", t5[0]?.awalQty === 100, t5[0]?.awalQty);
check("A00001 masukQty 50", t5[0]?.masukQty === 50, t5[0]?.masukQty);
check("A00001 keluarNilai 4000000", t5[0]?.keluarNilai === 4000000, t5[0]?.keluarNilai);
check("A00002 nama", t5[1]?.nama === "ALKOHOL", t5[1]?.nama);
check("A00002 masukNilai 1000000", t5[1]?.masukNilai === 1000000, t5[1]?.masukNilai);

// ============ TEST 6: Zero-value columns printed as 0 ============
console.log('\n=== TEST 6: Zero columns ===');
const t6 = parseAccuratePersediaanText(`KODE      NAMA BARANG                       SATUAN   AWAL QTY   AWAL NILAI   MASUK QTY   MASUK NILAI   KELUAR QTY   KELUAR NILAI   AKHIR QTY   AKHIR NILAI
A00030    BARANG BARU                       PCS      0          0            100         500.000       20           100.000        80          400.000`);
check("1 item parsed", t6.length === 1, `got ${t6.length}`);
check("awalQty 0", t6[0]?.awalQty === 0, t6[0]?.awalQty);
check("masukQty 100", t6[0]?.masukQty === 100, t6[0]?.masukQty);
check("keluarQty 20", t6[0]?.keluarQty === 20, t6[0]?.keluarQty);
const akhir6 = t6[0] ? t6[0].awalQty + t6[0].masukQty - t6[0].keluarQty : 0;
check("computed akhirQty = 80", Math.abs(akhir6 - 80) < 0.001, akhir6);

// ============ Number parsing regression ============
console.log('\n=== Number parsing regression ===');
const numTests = [["157,25",157.25],["6.374.998",6374998],["0",0],["82,5",82.5],["2.673.303",2673303],["8.108.108,11",8108108.11]];
numTests.forEach(([inp, exp]) => {
  const r = parseAccurateNumber(inp);
  check(`parseAccurateNumber('${inp}') = ${exp}`, Math.abs(r - exp) < 0.001, `got ${r}`);
});

console.log(`\n${'='.repeat(50)}`);
console.log(`RESULT: ${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
