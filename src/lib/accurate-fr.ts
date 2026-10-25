// ============================================================
// Accurate "Laba/Rugi Standar" & "Neraca Standar" parser
// Ported from HTML akuntansi parseAccurateFRText + LR_ROWS_SEP + NERACA_ROWS_SEP
// ============================================================

import { parseAccurateNumber } from "./accurate-parser";

export type RowType = "header" | "item" | "total";

export interface FRRow {
  t: RowType;
  name?: string;
  id?: string;
  lvl?: number;
  sc?: string[];
  v?: number;
  calc?: string;
  grand?: boolean;
  custom?: boolean;
}

const LR_ROWS_SEP: FRRow[] = [
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

const NERACA_ROWS_SEP: FRRow[] = [
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

const LR_SECTION_SCOPE: Record<string, string> = {
  "pendapatan": "pdd",
  "beban pokok penjualan": "hpp",
  "harga pokok penjualan": "hpp",
  "beban operasional": "ops",
  "pendapatan non operasional": "pnl",
  "beban non operasional": "bno",
};
const LR_ALIAS: Record<string, string> = {
  "pendapatan diluar usaha lainnya": "pendapatan diluar usaha",
  "beban diluar usaha lainnya": "beban diluar usaha",
  "hpp": "beban pokok penjualan",
  "beban gaji": "beban gaji & upah",
  "beban gaji dan upah": "beban gaji & upah",
};
const NERACA_ALIAS: Record<string, string> = {
  "hutang usaha": "utang usaha",
  "kas": "kas kecil",
  "utang dagang": "utang usaha",
};
const FR_SKIP_NAMES = new Set(["kas & bank", "nilai histori"]);

function frNormName(s: string): string {
  return String(s).toLowerCase().replace(/\s+/g, " ").replace(/\s*:\s*$/, "").trim();
}

export function frDeepCopyRows(rows: FRRow[]): FRRow[] {
  return rows.map(r => ({ ...r, sc: r.sc ? r.sc.slice() : undefined }));
}

export function frZeroRows(rows: FRRow[]): FRRow[] {
  return rows.map(r => r.t === "item"
    ? { ...r, v: 0, sc: r.sc ? r.sc.slice() : undefined }
    : { ...r });
}

export function frSumScope(rows: FRRow[], scope: string): number {
  let s = 0;
  rows.forEach(r => { if (r.t === "item" && r.sc && r.sc.includes(scope)) s += Number(r.v) || 0; });
  return s;
}

export function frTotalValue(row: FRRow | undefined, rows: FRRow[]): number {
  if (!row || row.t !== "total" || !row.calc) return 0;
  if (row.calc.indexOf("sum:") === 0) {
    return row.calc.slice(4).split("+").reduce((s, sc) => s + frSumScope(rows, sc.trim()), 0);
  }
  const V = (id: string) => { const r = rows.find(x => x.id === id); return r ? frTotalValue(r, rows) : 0; };
  switch (row.calc) {
    case "lk":  return V("jp") - V("jbpp");
    case "po":  return V("lk") - V("jbo");
    case "jno": return V("jpno") - V("jbno");
    case "lb":  return V("po") + V("jno");
    case "jas": return V("jal") + V("jatl") + V("jlai");
    case "jle": return V("jk") + V("jek");
  }
  return 0;
}

export function fmtFRNum(n: number): string {
  const num = Number(n) || 0;
  const s = Math.abs(num).toLocaleString("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return (num < 0 ? "-" : "") + s;
}

function isFRReportNoise(line: string): boolean {
  const s = String(line).trim();
  if (!s) return true;
  if (/^(INDOSARI|Laba\/Rugi|Neraca \(|Neraca Standar|Laporan Laba|Dari |Per Tgl|Cabang|Mata Uang|Deskripsi|ACCURATE|Tercetak|Halaman|\(Standar\))/i.test(s)) return true;
  if (/^[-=_\s]{3,}$/.test(s)) return true;
  if (/^\d+\s+dari\s+\d+$/i.test(s)) return true;
  return false;
}

export function parseAccurateFRText(text: string, templateRows: FRRow[], kind: "lr" | "neraca"): FRRow[] {
  const lines = String(text).split(/\r?\n/);
  const rows = frDeepCopyRows(templateRows);
  const itemByName: Record<string, FRRow> = {};
  rows.forEach(r => { if (r.t === "item") itemByName[frNormName(r.name || "")] = r; });
  const headerByName: Record<string, FRRow> = {};
  rows.forEach(r => { if (r.t === "header") headerByName[frNormName(r.name || "")] = r; });
  const totalByName: Record<string, FRRow> = {};
  rows.forEach(r => { if (r.t === "total") totalByName[frNormName(r.name || "")] = r; });
  const resolveItem = (nm: string): FRRow | null => {
    if (itemByName[nm]) return itemByName[nm];
    const alias = kind === "lr" ? LR_ALIAS[nm] : NERACA_ALIAS[nm];
    if (alias && itemByName[alias]) return itemByName[alias];
    const stripped = nm.replace(/\s+(idr|usd|eur|sgd|jpy)$/i, "").trim();
    if (stripped !== nm && itemByName[stripped]) return itemByName[stripped];
    return null;
  };
  let curScope: string | null = null;
  let lastItemRow: FRRow | null = null;
  let lastHeaderRow: FRRow | null = null;
  let matched = 0, appended = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (isFRReportNoise(line)) continue;
    let nameRaw: string | null = null;
    let val: number | null = null;
    let m = line.match(/^(.*?)\s+\(([-\d.,]+)\)$/);
    if (m) { nameRaw = m[1]; val = -parseAccurateNumber(m[2]); }
    else {
      m = line.match(/^(.*?)\s+(-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?)$/);
      if (m) { nameRaw = m[1]; val = parseAccurateNumber(m[2]); }
    }
    if (!nameRaw) {
      const nm = frNormName(line.replace(/:$/, ""));
      if (headerByName[nm]) {
        lastHeaderRow = headerByName[nm];
        if (kind === "lr" && LR_SECTION_SCOPE[nm]) curScope = LR_SECTION_SCOPE[nm];
      }
      continue;
    }
    const nm = frNormName(nameRaw);
    if (!nm) continue;
    if (/^jumlah/i.test(nm)) continue;
    if (totalByName[nm]) continue;
    if (FR_SKIP_NAMES.has(nm)) continue;
    if (headerByName[nm] && !resolveItem(nm)) continue;
    const row = resolveItem(nm);
    if (row) { row.v = val ?? 0; matched++; lastItemRow = row; continue; }
    if (Math.abs(val || 0) < 0.005) continue;
    let sc: string[];
    let lvl: number;
    if (kind === "lr") {
      sc = [curScope || "ops"];
      lvl = lastHeaderRow ? Math.max(1, (lastHeaderRow.lvl || 0) + 1) : 1;
    } else {
      sc = lastItemRow && lastItemRow.sc ? lastItemRow.sc.slice() : ["aset"];
      lvl = lastItemRow ? (lastItemRow.lvl || 0) : (lastHeaderRow ? (lastHeaderRow.lvl || 0) + 1 : 1);
    }
    const nr: FRRow = { t: "item", name: nameRaw.trim(), lvl, sc, v: val ?? 0, custom: true };
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

export function parseAccurateLabaRugiText(text: string): FRRow[] {
  return parseAccurateFRText(text, LR_ROWS_SEP, "lr");
}

export function parseAccurateNeracaText(text: string): FRRow[] {
  return parseAccurateFRText(text, NERACA_ROWS_SEP, "neraca");
}

export function frMergeRows(existing: FRRow[], parsed: FRRow[]): FRRow[] {
  const rows = frDeepCopyRows(existing);
  const byName: Record<string, FRRow> = {};
  rows.forEach(r => { if (r.t === "item") byName[frNormName(r.name || "")] = r; });
  parsed.forEach(pr => {
    if (pr.t !== "item") return;
    const ex = byName[frNormName(pr.name || "")];
    if (ex) ex.v = pr.v;
    else rows.push({ ...pr, sc: pr.sc ? pr.sc.slice() : undefined });
  });
  return rows;
}

export { LR_ROWS_SEP, NERACA_ROWS_SEP };
