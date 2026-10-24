// ============================================================
// 9. LABA RUGI & NERACA — Format laporan Accurate "Standar",
//    per bulan, editable + Paste dari Accurate
// ============================================================
let lrMonth = 9;      // September default (data Accurate tersedia)
let neracaMonth = 9;  // September default

// ---- 9a. Template baris sesuai laporan Accurate ----
// t: "header" (judul bagian, tanpa nilai) | "item" (nilai bisa diedit) | "total" (auto-hitung)
// lvl: tingkat indentasi; sc: scope penjumlahan; calc: rumus ("sum:scope" atau id formula khusus)
const LR_ROWS_SEP = [
  { t: "header", name: "PENDAPATAN", lvl: 0 },
  { t: "total", id: "po0", name: "Pendapatan Operasional", lvl: 0, calc: "sum:pdd" },
  { t: "item", name: "Penjualan", lvl: 1, sc: ["pdd"], v: 174564635 },
  { t: "item", name: "Diskon Penjualan", lvl: 1, sc: ["pdd"], v: -51775 },
  { t: "total", id: "jp", name: "Jumlah Pendapatan", lvl: 0, calc: "sum:pdd" },
  { t: "header", name: "BEBAN POKOK PENJUALAN", lvl: 0 },
  { t: "item", name: "Beban Pokok Penjualan", lvl: 1, sc: ["hpp"], v: 140157857.07 },
  { t: "total", id: "jbpp", name: "Jumlah Beban Pokok Penjualan", lvl: 0, calc: "sum:hpp" },
  { t: "total", id: "lk", name: "LABA KOTOR", lvl: 0, calc: "lk", grand: true },
  { t: "header", name: "BEBAN OPERASIONAL", lvl: 0 },
  { t: "total", id: "bo0", name: "Beban Operasional", lvl: 0, calc: "sum:ops" },
  { t: "item", name: "Beban Bensin, Parkir, Tol Kendaraan", lvl: 1, sc: ["ops"], v: 15000 },
  { t: "item", name: "Beban Gaji & Upah", lvl: 1, sc: ["ops"], v: 21000000 },
  { t: "item", name: "Beban Listrik", lvl: 1, sc: ["ops"], v: 782931 },
  { t: "item", name: "Beban PAM", lvl: 1, sc: ["ops"], v: 137500 },
  { t: "item", name: "Beban Telekomunikasi", lvl: 1, sc: ["ops"], v: 235998 },
  { t: "item", name: "Beban Retribusi & Sumbangan", lvl: 1, sc: ["ops"], v: 75000 },
  { t: "item", name: "Beban Operasional Lainnya", lvl: 1, sc: ["ops"], v: 100000 },
  { t: "item", name: "Beban Selisih Stock", lvl: 1, sc: ["ops"], v: -56460.52 },
  { t: "item", name: "Beban Langganan Software", lvl: 1, sc: ["ops"], v: 355200 },
  { t: "item", name: "Beban Selisih Harga", lvl: 1, sc: ["ops"], v: 162282 },
  { t: "item", name: "Beban Pengiriman", lvl: 1, sc: ["ops"], v: 425000 },
  { t: "total", id: "jbo", name: "Jumlah Beban Operasional", lvl: 0, calc: "sum:ops" },
  { t: "total", id: "po", name: "PENDAPATAN OPERASIONAL", lvl: 0, calc: "po", grand: true },
  { t: "header", name: "PENDAPATAN DAN BEBAN NON OPERASIONAL", lvl: 0 },
  { t: "header", name: "Pendapatan Non Operasional", lvl: 1 },
  { t: "item", name: "Pendapatan Diluar Usaha", lvl: 2, sc: ["pnl"], v: 4587500 },
  { t: "total", id: "jpno", name: "Jumlah Pendapatan Non Operasional", lvl: 1, calc: "sum:pnl" },
  { t: "header", name: "Beban Non Operasional", lvl: 1 },
  { t: "item", name: "Beban Diluar Usaha", lvl: 2, sc: ["bno"], v: 1742960 },
  { t: "total", id: "jbno", name: "Jumlah Beban Non Operasional", lvl: 1, calc: "sum:bno" },
  { t: "total", id: "jno", name: "Jumlah Pendapatan dan Beban Non Operasional", lvl: 0, calc: "jno" },
  { t: "total", id: "lb", name: "LABA BERSIH", lvl: 0, calc: "lb", grand: true },
];

const NERACA_ROWS_SEP = [
  { t: "header", name: "ASET", lvl: 0 },
  { t: "header", name: "ASET LANCAR", lvl: 1 },
  { t: "header", name: "Kas dan Setara Kas", lvl: 2 },
  { t: "item", name: "Kas Kecil", lvl: 3, sc: ["kas", "al", "aset"], v: 1000000 },
  { t: "item", name: "Kas Besar", lvl: 3, sc: ["kas", "al", "aset"], v: 14468580.5 },
  { t: "item", name: "Bank", lvl: 3, sc: ["kas", "al", "aset"], v: 280000 },
  { t: "item", name: "Selisih kas & Bank", lvl: 3, sc: ["kas", "al", "aset"], v: -60700 },
  { t: "total", id: "jkas", name: "Jumlah Kas dan Setara Kas", lvl: 2, calc: "sum:kas" },
  { t: "header", name: "Piutang Usaha", lvl: 2 },
  { t: "item", name: "Piutang Usaha", lvl: 3, sc: ["piu", "al", "aset"], v: 36769260 },
  { t: "total", id: "jpiu", name: "Jumlah Piutang Usaha", lvl: 2, calc: "sum:piu" },
  { t: "header", name: "Persediaan", lvl: 2 },
  { t: "item", name: "Persediaan", lvl: 3, sc: ["per", "al", "aset"], v: 121310270.1 },
  { t: "total", id: "jper", name: "Jumlah Persediaan", lvl: 2, calc: "sum:per" },
  { t: "header", name: "Aset Lancar Lainnya", lvl: 2 },
  { t: "item", name: "PPN Masukan", lvl: 3, sc: ["all2", "al", "aset"], v: 197830504 },
  { t: "total", id: "jall", name: "Jumlah Aset Lancar Lainnya", lvl: 2, calc: "sum:all2" },
  { t: "total", id: "jal", name: "JUMLAH ASET LANCAR", lvl: 1, calc: "sum:al", grand: true },
  { t: "header", name: "ASET TIDAK LANCAR", lvl: 1 },
  { t: "header", name: "Aset Tetap", lvl: 2 },
  { t: "item", name: "Gedung", lvl: 3, sc: ["at", "atl", "aset"], v: 500000000 },
  { t: "item", name: "Kendaraan", lvl: 3, sc: ["at", "atl", "aset"], v: 50000000 },
  { t: "total", id: "jat", name: "Jumlah Aset Tetap", lvl: 2, calc: "sum:at" },
  { t: "header", name: "Akumulasi Penyusutan", lvl: 2 },
  { t: "item", name: "Akumulasi Penyusutan", lvl: 3, sc: ["apl", "atl", "aset"], v: 0 },
  { t: "total", id: "japl", name: "Jumlah Akumulasi Penyusutan", lvl: 2, calc: "sum:apl" },
  { t: "total", id: "jatl", name: "JUMLAH ASET TIDAK LANCAR", lvl: 1, calc: "sum:atl", grand: true },
  { t: "header", name: "Aset Lainnya", lvl: 1 },
  { t: "item", name: "Aset Lainnya", lvl: 2, sc: ["lai", "aset"], v: 0 },
  { t: "total", id: "jlai", name: "Jumlah Aset Lainnya", lvl: 1, calc: "sum:lai" },
  { t: "total", id: "jas", name: "JUMLAH ASET", lvl: 0, calc: "jas", grand: true },
  { t: "header", name: "LIABILITAS DAN EKUITAS", lvl: 0 },
  { t: "header", name: "LIABILITAS", lvl: 1 },
  { t: "header", name: "LIABILITAS JANGKA PENDEK", lvl: 2 },
  { t: "header", name: "Utang Usaha", lvl: 3 },
  { t: "item", name: "Utang Usaha", lvl: 4, sc: ["uu", "kjp", "liab"], v: 173508611.72 },
  { t: "total", id: "juu", name: "Jumlah Utang Usaha", lvl: 3, calc: "sum:uu" },
  { t: "header", name: "Kewajiban Jangka Pendek Lainnya", lvl: 3 },
  { t: "item", name: "PPN Keluaran", lvl: 4, sc: ["kjl", "kjp", "liab"], v: 4400 },
  { t: "item", name: "Hutang Pembelian Belum Ditagih", lvl: 4, sc: ["kjl", "kjp", "liab"], v: 8787108 },
  { t: "total", id: "jkjl", name: "Jumlah Kewajiban Jangka Pendek Lainnya", lvl: 3, calc: "sum:kjl" },
  { t: "total", id: "jkjp", name: "JUMLAH KEWAJIBAN JANGKA PENDEK", lvl: 2, calc: "sum:kjp", grand: true },
  { t: "header", name: "LIABILITAS JANGKA PANJANG", lvl: 2 },
  { t: "item", name: "Kewajiban Jangka Panjang", lvl: 3, sc: ["kjpl", "liab"], v: 0 },
  { t: "total", id: "jkjpl", name: "JUMLAH KEWAJIBAN JANGKA PANJANG", lvl: 2, calc: "sum:kjpl" },
  { t: "total", id: "jk", name: "JUMLAH KEWAJIBAN", lvl: 1, calc: "sum:liab", grand: true },
  { t: "header", name: "EKUITAS", lvl: 1 },
  { t: "total", id: "jmod", name: "Modal", lvl: 2, calc: "sum:mod" },
  { t: "item", name: "Equitas Saldo Awal", lvl: 3, sc: ["mod", "ek"], v: 825637777.72 },
  { t: "item", name: "Laba Ditahan", lvl: 3, sc: ["mod", "ek"], v: -166315670.77 },
  { t: "item", name: "Laba Tahun Ini", lvl: 2, sc: ["ek"], v: 79975687.93 },
  { t: "total", id: "jek", name: "Jumlah Ekuitas", lvl: 2, calc: "sum:ek" },
  { t: "total", id: "jle", name: "JUMLAH LIABILITAS DAN EKUITAS", lvl: 0, calc: "jle", grand: true },
];

// ---- 9b. Helper & kalkulasi ----
function frDeepCopyRows(rows) {
  return rows.map(r => Object.assign({}, r, r.sc ? { sc: r.sc.slice() } : {}));
}
function frZeroRows(rows) {
  return rows.map(r => r.t === "item"
    ? Object.assign({}, r, { v: 0, sc: r.sc.slice() })
    : Object.assign({}, r));
}
function frSumScope(rows, scope) {
  let s = 0;
  rows.forEach(r => { if (r.t === "item" && r.sc && r.sc.includes(scope)) s += Number(r.v) || 0; });
  return s;
}
function frTotalValue(row, rows) {
  if (!row || row.t !== "total" || !row.calc) return 0;
  if (row.calc.indexOf("sum:") === 0) {
    return row.calc.slice(4).split("+").reduce((s, sc) => s + frSumScope(rows, sc.trim()), 0);
  }
  const V = (id) => { const r = rows.find(x => x.id === id); return r ? frTotalValue(r, rows) : 0; };
  switch (row.calc) {
    case "lk":  return V("jp") - V("jbpp");            // Laba Kotor = Pendapatan - BPP
    case "po":  return V("lk") - V("jbo");             // Pendapatan Operasional
    case "jno": return V("jpno") - V("jbno");          // Non operasional neto
    case "lb":  return V("po") + V("jno");             // Laba Bersih
    case "jas": return V("jal") + V("jatl") + V("jlai"); // Jumlah Aset
    case "jle": return V("jk") + V("jek");             // Liabilitas + Ekuitas
  }
  return 0;
}
function fmtFRNum(n) {
  const num = Number(n) || 0;
  const s = Math.abs(num).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return (num < 0 ? "-" : "") + s;
}
function frNormName(s) {
  return String(s).toLowerCase().replace(/\s+/g, " ").replace(/\s*:\s*$/, "").trim();
}

// ---- 9c. Penyimpanan per bulan (localStorage) ----
function frIsDefault(kind, month) {
  const key = kind === "lr" ? "labaRugiPerBulan" : "neracaPerBulan";
  const st = userEdits.extras && userEdits.extras[key];
  return !(st && st[String(month)]);
}
function frClearSaved(kind, month) {
  if (!userEdits.extras) return;
  const key = kind === "lr" ? "labaRugiPerBulan" : "neracaPerBulan";
  if (userEdits.extras[key]) { delete userEdits.extras[key][String(month)]; saveEdits(userEdits); }
}
function getLabaRugiBulan(month) {
  const st = userEdits.extras && userEdits.extras.labaRugiPerBulan;
  if (st && st[String(month)]) return frDeepCopyRows(st[String(month)]);
  if (month === 9) return frDeepCopyRows(LR_ROWS_SEP);
  // Bulan lain: konversi nilai awal dari sheet "Laba Rugi" lama (Jan-Agu, Okt-Des)
  const rows = frZeroRows(LR_ROWS_SEP);
  const row = 5 + month;
  const set = (name, val) => { const r = rows.find(x => x.t === "item" && x.name === name); if (r && val) r.v = val; };
  set("Penjualan", Number(hfGet("Laba Rugi", "C" + row)) || 0);
  set("Beban Pokok Penjualan", Number(hfGet("Laba Rugi", "E" + row)) || 0);
  set("Beban Gaji & Upah", Number(hfGet("Laba Rugi", "H" + row)) || 0);
  set("Beban Operasional Lainnya", (Number(hfGet("Laba Rugi", "J" + row)) || 0) + (Number(hfGet("Laba Rugi", "K" + row)) || 0));
  set("Pendapatan Diluar Usaha", Number(hfGet("Laba Rugi", "D" + row)) || 0);
  set("Beban Diluar Usaha", Number(hfGet("Laba Rugi", "L" + row)) || 0);
  return rows;
}
function saveLabaRugiBulan(month, rows) {
  if (!userEdits.extras) userEdits.extras = {};
  if (!userEdits.extras.labaRugiPerBulan) userEdits.extras.labaRugiPerBulan = {};
  userEdits.extras.labaRugiPerBulan[String(month)] = rows;
  saveEdits(userEdits);
}
function getNeracaBulan(month) {
  const st = userEdits.extras && userEdits.extras.neracaPerBulan;
  if (st && st[String(month)]) return frDeepCopyRows(st[String(month)]);
  if (month === 9) return frDeepCopyRows(NERACA_ROWS_SEP);
  return frZeroRows(NERACA_ROWS_SEP);
}
function saveNeracaBulan(month, rows) {
  if (!userEdits.extras) userEdits.extras = {};
  if (!userEdits.extras.neracaPerBulan) userEdits.extras.neracaPerBulan = {};
  userEdits.extras.neracaPerBulan[String(month)] = rows;
  saveEdits(userEdits);
}
function frMergeRows(existing, parsed) {
  // Mode Append: update nilai akun yang sama (per nama), akun baru ditambahkan
  const rows = frDeepCopyRows(existing);
  const byName = {};
  rows.forEach(r => { if (r.t === "item") byName[frNormName(r.name)] = r; });
  parsed.forEach(pr => {
    if (pr.t !== "item") return;
    const ex = byName[frNormName(pr.name)];
    if (ex) ex.v = pr.v;
    else rows.push(Object.assign({}, pr, pr.sc ? { sc: pr.sc.slice() } : {}));
  });
  return rows;
}

// ---- 9d. Paste parser laporan Accurate (Laba/Rugi Standar & Neraca Standar) ----
// Baris "Nama Akun + Angka" dipetakan ke template. Baris Jumlah/LABA (total)
// dilewati karena auto-hitung. Akun tak dikenal ditambahkan ke bagian terdekat.
function isFRReportNoise(line) {
  const s = String(line).trim();
  if (!s) return true;
  if (/^(INDOSARI|Laba\/Rugi|Neraca \(|Neraca Standar|Laporan Laba|Dari |Per Tgl|Cabang|Mata Uang|Deskripsi|ACCURATE|Tercetak|Halaman|\(Standar\))/i.test(s)) return true;
  if (/^[-=_\s]{3,}$/.test(s)) return true;
  if (/^\d+\s+dari\s+\d+$/i.test(s)) return true;
  return false;
}

const LR_SECTION_SCOPE = {
  "pendapatan": "pdd",
  "beban pokok penjualan": "hpp",
  "harga pokok penjualan": "hpp",
  "beban operasional": "ops",
  "pendapatan non operasional": "pnl",
  "beban non operasional": "bno",
};
const LR_ALIAS = {
  "pendapatan diluar usaha lainnya": "pendapatan diluar usaha",
  "beban diluar usaha lainnya": "beban diluar usaha",
  "hpp": "beban pokok penjualan",
  "beban gaji": "beban gaji & upah",
  "beban gaji dan upah": "beban gaji & upah",
};
const NERACA_ALIAS = {
  "hutang usaha": "utang usaha",
  "kas": "kas kecil",
  "utang dagang": "utang usaha",
};
// Nama subtotal induk di Accurate yang TIDAK ada sebagai header template
// (nilainya = jumlah anak, jadi dilewati agar tidak dobel hitung)
const FR_SKIP_NAMES = new Set(["kas & bank", "nilai histori"]);

function parseAccurateFRText(text, templateRows, kind) {
  const lines = String(text).split(/\r?\n/);
  const rows = frDeepCopyRows(templateRows);
  const itemByName = {};
  rows.forEach(r => { if (r.t === "item") itemByName[frNormName(r.name)] = r; });
  const headerByName = {};
  rows.forEach(r => { if (r.t === "header") headerByName[frNormName(r.name)] = r; });
  const totalByName = {};
  rows.forEach(r => { if (r.t === "total") totalByName[frNormName(r.name)] = r; });
  const resolveItem = (nm) => {
    if (itemByName[nm]) return itemByName[nm];
    const alias = kind === "lr" ? LR_ALIAS[nm] : NERACA_ALIAS[nm];
    if (alias && itemByName[alias]) return itemByName[alias];
    const stripped = nm.replace(/\s+(idr|usd|eur|sgd|jpy)$/i, "").trim();
    if (stripped !== nm && itemByName[stripped]) return itemByName[stripped];
    return null;
  };
  let curScope = null, lastItemRow = null, lastHeaderRow = null;
  let matched = 0, appended = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (isFRReportNoise(line)) continue;
    // Baris bernilai: "Nama Akun  angka" (angka bisa dalam kurung = negatif)
    let nameRaw = null, val = null;
    let m = line.match(/^(.*?)\s+\(([-\d.,]+)\)$/);
    if (m) { nameRaw = m[1]; val = -parseAccurateNumber(m[2]); }
    else {
      m = line.match(/^(.*?)\s+(-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?)$/);
      if (m) { nameRaw = m[1]; val = parseAccurateNumber(m[2]); }
    }
    if (!nameRaw) {
      // Baris tanpa angka → konteks bagian (header)
      const nm = frNormName(line.replace(/:$/, ""));
      if (headerByName[nm]) {
        lastHeaderRow = headerByName[nm];
        if (kind === "lr" && LR_SECTION_SCOPE[nm]) curScope = LR_SECTION_SCOPE[nm];
      }
      continue;
    }
    const nm = frNormName(nameRaw);
    if (!nm) continue;
    if (/^jumlah/i.test(nm)) continue;                     // "Jumlah ..." → auto-hitung
    if (totalByName[nm]) continue;                         // LABA KOTOR, Modal, dsb → auto-hitung
    if (FR_SKIP_NAMES.has(nm)) continue;                   // subtotal induk non-template (mis. Kas & Bank)
    if (headerByName[nm] && !resolveItem(nm)) continue;    // subtotal induk (nama = judul bagian)
    const row = resolveItem(nm);
    if (row) { row.v = val; matched++; lastItemRow = row; continue; }
    if (Math.abs(val) < 0.005) continue;                   // akun tak dikenal bernilai 0 → abaikan
    // Akun baru → sisipkan dekat konteks terakhir, ikut scope bagian
    let sc, lvl;
    if (kind === "lr") {
      sc = [curScope || "ops"];
      lvl = lastHeaderRow ? Math.max(1, lastHeaderRow.lvl + 1) : 1;
    } else {
      sc = lastItemRow && lastItemRow.sc ? lastItemRow.sc.slice() : ["aset"];
      lvl = lastItemRow ? lastItemRow.lvl : (lastHeaderRow ? lastHeaderRow.lvl + 1 : 1);
    }
    const nr = { t: "item", name: nameRaw.trim(), lvl: lvl, sc: sc, v: val, custom: true };
    let insIdx = -1;
    if (lastItemRow) insIdx = rows.indexOf(lastItemRow) + 1;
    else if (lastHeaderRow) {
      const hIdx = rows.indexOf(lastHeaderRow);
      let j = hIdx + 1;
      while (j < rows.length && rows[j].t === "item") j++;
      insIdx = j;
    }
    if (insIdx < 0) insIdx = rows.length;
    rows.splice(insIdx, 0, nr);
    lastItemRow = nr;
    appended++; matched++;
  }
  console.log(`FR parser (${kind}): ${matched} akun cocok, ${appended} akun baru ditambahkan`);
  return matched > 0 ? rows : [];
}
function parseAccurateLabaRugiText(text) { return parseAccurateFRText(text, LR_ROWS_SEP, "lr"); }
function parseAccurateNeracaText(text) { return parseAccurateFRText(text, NERACA_ROWS_SEP, "neraca"); }

// ---- 9e. Renderer halaman laporan (dipakai Laba Rugi & Neraca) ----
function frRenderPage(cfg) {
  const c = document.getElementById("sheetContainer");
  c.classList.add("p-4", "sm:p-6");
  c.style.background = "#fff";
  const rows = cfg.rows;
  const monthOpts = BULAN_NAMES.map((b, i) => `<option value="${i + 1}" ${cfg.month === i + 1 ? "selected" : ""}>${b} 2026</option>`).join("");
  c.innerHTML = `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-slate-800">${cfg.title} — ${BULAN_NAMES[cfg.month - 1]} 2026</h2>
          <p class="text-xs text-slate-500">${cfg.subtitle}</p>
        </div>
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-slate-700">Bulan:</label>
          <select id="frMonthSel" class="select-input">${monthOpts}</select>
        </div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">${cfg.kpis}</div>
      <div class="flex flex-wrap gap-2">
        <button id="btnPasteFR" class="inline-flex items-center gap-1.5 rounded-md border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100">📋 Paste dari Accurate</button>
        <button id="btnAddFR" class="inline-flex items-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700">+ Tambah Akun</button>
        <button id="btnResetFR" class="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100">↺ Reset ${BULAN_NAMES[cfg.month - 1]}</button>
      </div>
      <div class="bg-white border border-slate-200 rounded-lg overflow-auto scrollbar-thin">
        <table class="fr-table">
          <thead><tr><th style="width:62%">DESKRIPSI</th><th style="width:30%;text-align:right">NILAI (Rp)</th><th style="width:8%;text-align:center">AKSI</th></tr></thead>
          <tbody id="frTbody"></tbody>
        </table>
      </div>
      <p class="text-xs text-slate-500">Klik <b>angka kuning</b> untuk edit nilai, klik <b>nama akun</b> untuk rename, tombol <b>＋</b> menambah akun di bawahnya, <b>✕</b> menghapus. Baris <b>tebal</b> (Jumlah/LABA) auto-hitung dari akun di atasnya. Pembulatan bisa beda ±1 dari Accurate.</p>
    </div>`;
  document.getElementById("frMonthSel").onchange = (e) => { cfg.onMonth(parseInt(e.target.value, 10)); };
  document.getElementById("btnPasteFR").onclick = cfg.onPaste;
  document.getElementById("btnResetFR").onclick = cfg.onReset;
  document.getElementById("btnAddFR").onclick = () => {
    let lastIdx = -1;
    rows.forEach((r, i) => { if (r.t === "item") lastIdx = i; });
    const src = lastIdx >= 0 ? rows[lastIdx] : null;
    rows.splice(lastIdx + 1, 0, {
      t: "item", name: "Akun Baru", lvl: src ? src.lvl : 1,
      sc: src && src.sc ? src.sc.slice() : (cfg.fallbackSc || []).slice(),
      v: 0, custom: true,
    });
    cfg.save(); cfg.rerender();
  };
  const tbody = document.getElementById("frTbody");
  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    if (r.t === "header") {
      tr.className = "fr-hdr" + (r.lvl === 0 ? " major" : "");
      tr.innerHTML = `<td colspan="2" style="padding-left:${6 + r.lvl * 18}px">${escapeHtml(r.name)}</td><td class="fr-act"></td>`;
    } else if (r.t === "item") {
      tr.className = "fr-item";
      tr.innerHTML = `<td class="fr-name" style="padding-left:${6 + r.lvl * 18}px" data-idx="${idx}">${escapeHtml(r.name)}</td>` +
        `<td class="fr-val input ${Number(r.v) < 0 ? "neg" : ""}" data-idx="${idx}">${fmtFRNum(r.v)}</td>` +
        `<td class="fr-act"><button data-act="add" data-idx="${idx}" title="Tambah akun di bawah">＋</button><button data-act="del" data-idx="${idx}" title="Hapus akun">✕</button></td>`;
    } else {
      const v = frTotalValue(r, rows);
      tr.className = "fr-total" + (r.grand ? " fr-grand" : "");
      tr.innerHTML = `<td style="padding-left:${6 + r.lvl * 18}px">${escapeHtml(r.name)}</td>` +
        `<td class="fr-val ${v < 0 ? "neg" : ""}">${fmtFRNum(v)}</td><td class="fr-act"></td>`;
    }
    tbody.appendChild(tr);
  });
  // Edit nilai (sel kuning)
  tbody.querySelectorAll("td.fr-val.input").forEach(td => {
    td.onclick = () => {
      if (td.querySelector("input")) return;
      const idx = parseInt(td.dataset.idx, 10);
      const inp = document.createElement("input");
      inp.className = "cell-input";
      inp.value = String(rows[idx].v);
      inp.type = "text";
      inp.inputMode = "decimal";
      td.textContent = "";
      td.appendChild(inp);
      inp.focus(); inp.select();
      const save = () => {
        const raw = inp.value.trim();
        let v = 0;
        if (raw !== "") {
          let s2 = raw.replace(/\s/g, "");
          const negParen = /^\(.*\)$/.test(s2);
          if (negParen) s2 = s2.replace(/[()]/g, "");
          const cleaned = s2.replace(/\./g, "").replace(",", ".");
          if (!isNaN(Number(cleaned)) && /^[\d.,\-()]+$/.test(raw)) v = Number(cleaned) * (negParen ? -1 : 1);
          else v = Number(cleaned) || 0;
        }
        rows[idx].v = v;
        cfg.save(); cfg.rerender();
        showToast("✓ Nilai disimpan");
      };
      inp.onblur = save;
      inp.onkeydown = (e) => { if (e.key === "Enter") inp.blur(); };
    };
  });
  // Edit nama akun
  tbody.querySelectorAll("td.fr-name").forEach(td => {
    td.onclick = () => {
      if (td.querySelector("input")) return;
      const idx = parseInt(td.dataset.idx, 10);
      const inp = document.createElement("input");
      inp.className = "cell-input";
      inp.value = rows[idx].name;
      inp.type = "text";
      inp.style.textAlign = "left";
      td.textContent = "";
      td.appendChild(inp);
      inp.focus(); inp.select();
      const save = () => {
        const raw = inp.value.trim();
        if (raw) rows[idx].name = raw;
        cfg.save(); cfg.rerender();
        showToast("✓ Nama akun disimpan");
      };
      inp.onblur = save;
      inp.onkeydown = (e) => { if (e.key === "Enter") inp.blur(); };
    };
  });
  // Tombol aksi (＋ / ✕)
  tbody.querySelectorAll("button[data-act]").forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const idx = parseInt(btn.dataset.idx, 10);
      if (btn.dataset.act === "add") {
        const src = rows[idx];
        rows.splice(idx + 1, 0, {
          t: "item", name: "Akun Baru", lvl: src.lvl,
          sc: src.sc ? src.sc.slice() : (cfg.fallbackSc || []).slice(),
          v: 0, custom: true,
        });
        cfg.save(); cfg.rerender();
      } else {
        if (!confirm(`Hapus akun "${rows[idx].name}"?`)) return;
        rows.splice(idx, 1);
        cfg.save(); cfg.rerender();
      }
    };
  });
  document.getElementById("statusBar").textContent = cfg.status();
}

function renderLabaRugi() {
  const rows = getLabaRugiBulan(lrMonth);
  const V = (id) => { const r = rows.find(x => x.id === id); return r ? frTotalValue(r, rows) : 0; };
  const jp = V("jp"), lk = V("lk"), po = V("po"), lb = V("lb");
  const isConverted = frIsDefault("lr", lrMonth) && lrMonth !== 9;
  const subtitle = `Format sesuai laporan Accurate "Laba/Rugi (Standar)"` +
    (isConverted ? " — nilai awal dikonversi dari data lama; Paste Accurate untuk update" : "") + ".";
  const kpis = `
    <div class="kpi-card primary"><div class="label">Jumlah Pendapatan</div><div class="value">Rp ${fmtRupiah(jp)}</div><div class="sub">${BULAN_NAMES[lrMonth - 1]} 2026</div></div>
    <div class="kpi-card"><div class="label">Laba Kotor</div><div class="value">Rp ${fmtRupiah(lk)}</div><div class="sub">${jp > 0 ? (lk / jp * 100).toFixed(1) : 0}% margin kotor</div></div>
    <div class="kpi-card"><div class="label">Pendapatan Operasional</div><div class="value">Rp ${fmtRupiah(po)}</div><div class="sub">Laba kotor − beban operasional</div></div>
    <div class="kpi-card ${lb < 0 ? "danger" : "success"}"><div class="label">${lb < 0 ? "Rugi Bersih" : "Laba Bersih"}</div><div class="value">Rp ${fmtRupiah(Math.abs(lb))}</div><div class="sub">${lb < 0 ? "RUGI" : "Termasuk non-operasional"}</div></div>`;
  frRenderPage({
    month: lrMonth, rows, title: "Laba Rugi (Standar)", subtitle, kpis, fallbackSc: ["ops"],
    onMonth: (m) => { lrMonth = m; renderLabaRugi(); },
    onPaste: () => showPasteAccurateDialog("labarugi", { month: lrMonth }),
    onReset: () => {
      if (!confirm(`Kembalikan Laba Rugi ${BULAN_NAMES[lrMonth - 1]} 2026 ke nilai awal?`)) return;
      frClearSaved("lr", lrMonth); renderLabaRugi(); showToast("↺ Data direset ke nilai awal");
    },
    save: () => saveLabaRugiBulan(lrMonth, rows),
    rerender: () => renderLabaRugi(),
    status: () => `Laba Rugi ${BULAN_NAMES[lrMonth - 1]} 2026 — Pendapatan ${fmtFRNum(jp)} · Laba Kotor ${fmtFRNum(lk)} · Laba Bersih ${fmtFRNum(lb)}`,
  });
}

function renderNeraca() {
  const rows = getNeracaBulan(neracaMonth);
  const V = (id) => { const r = rows.find(x => x.id === id); return r ? frTotalValue(r, rows) : 0; };
  const jas = V("jas"), jk = V("jk"), jek = V("jek"), jle = V("jle");
  const selisih = jas - jle;
  const balanced = Math.abs(selisih) < 0.01;
  const isConverted = frIsDefault("neraca", neracaMonth) && neracaMonth !== 9;
  const subtitle = `Format sesuai laporan Accurate "Neraca (Standar)", dipilih per bulan` +
    (isConverted ? " — belum ada data bulan ini; Paste Accurate atau edit manual" : "") + ".";
  const kpis = `
    <div class="kpi-card primary"><div class="label">Jumlah Aset</div><div class="value">Rp ${fmtRupiah(jas)}</div><div class="sub">${BULAN_NAMES[neracaMonth - 1]} 2026</div></div>
    <div class="kpi-card danger"><div class="label">Jumlah Kewajiban</div><div class="value">Rp ${fmtRupiah(jk)}</div><div class="sub">Utang usaha + kewajiban lain</div></div>
    <div class="kpi-card success"><div class="label">Jumlah Ekuitas</div><div class="value">Rp ${fmtRupiah(jek)}</div><div class="sub">Modal + laba tahun ini</div></div>
    <div class="kpi-card ${balanced ? "" : "danger"}"><div class="label">Keseimbangan</div><div class="value">${balanced ? "✓ Seimbang" : "Rp " + fmtRupiah(Math.abs(selisih))}</div><div class="sub">${balanced ? "Aset = Kewajiban + Ekuitas" : "Aset ≠ Kewajiban + Ekuitas (selisih)"}</div></div>`;
  frRenderPage({
    month: neracaMonth, rows, title: "Neraca (Standar)", subtitle, kpis, fallbackSc: ["aset"],
    onMonth: (m) => { neracaMonth = m; renderNeraca(); },
    onPaste: () => showPasteAccurateDialog("neraca", { month: neracaMonth }),
    onReset: () => {
      if (!confirm(`Kembalikan Neraca ${BULAN_NAMES[neracaMonth - 1]} 2026 ke nilai awal?`)) return;
      frClearSaved("neraca", neracaMonth); renderNeraca(); showToast("↺ Data direset ke nilai awal");
    },
    save: () => saveNeracaBulan(neracaMonth, rows),
    rerender: () => renderNeraca(),
    status: () => `Neraca ${BULAN_NAMES[neracaMonth - 1]} 2026 — Aset ${fmtFRNum(jas)} · Kewajiban ${fmtFRNum(jk)} · Ekuitas ${fmtFRNum(jek)} · ${balanced ? "SEIMBANG" : "SELISIH " + fmtFRNum(selisih)}`,
  });
}
