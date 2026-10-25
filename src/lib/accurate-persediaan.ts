// ============================================================
// Accurate "Daftar Nilai Persediaan" / "Laporan Persediaan Bulanan" parser
// Ported from HTML akuntansi parseAccuratePersediaanText
// ============================================================

import { parseAccurateNumber, isAccurateHeaderOrFooter } from "./accurate-parser";

export const PERS_FIELD_ALIASES: Record<string, string[]> = {
  kode:       ["kode", "code", "id", "kd", "kode barang", "no", "item code"],
  nama:       ["nama", "nama barang", "barang", "item", "name", "nama item", "description", "deskripsi", "keterangan"],
  satuan:     ["satuan", "sat", "sat.", "unit", "uom", "satuan kecil"],
  awalQty:    ["awal qty", "awal kuantitas", "qty awal", "kuantitas awal", "beginning qty", "saldo awal qty", "saldo awal", "awal", "sa qty", "saldo awal (qty)"],
  awalNilai:  ["awal nilai", "nilai awal", "beginning value", "saldo awal nilai", "saldo awal value", "sa value", "saldo awal (nilai)", "awal (nilai)"],
  masukQty:   ["masuk qty", "in qty", "qty masuk", "kuantitas masuk", "penerimaan qty", "penerimaan", "mutasi masuk qty", "mutasi masuk", "in", "masuk"],
  masukNilai: ["masuk nilai", "in value", "nilai masuk", "penerimaan nilai", "mutasi masuk nilai", "mutasi masuk (nilai)", "masuk (nilai)"],
  keluarQty:  ["keluar qty", "out qty", "qty keluar", "kuantitas keluar", "pengeluaran qty", "pengeluaran", "mutasi keluar qty", "mutasi keluar", "out", "keluar"],
  keluarNilai:["keluar nilai", "out value", "nilai keluar", "pengeluaran nilai", "mutasi keluar nilai", "mutasi keluar (nilai)", "keluar (nilai)"],
  akhirQty:   ["akhir qty", "akhir kuantitas", "qty akhir", "kuantitas akhir", "ending qty", "saldo akhir qty", "saldo akhir", "stok", "stok qty", "qty", "kuantitas", "saldo", "sisa"],
  akhirNilai: ["akhir nilai", "nilai akhir", "ending value", "saldo akhir nilai", "saldo akhir value", "nilai", "nilai persediaan", "nilai stok", "saldo akhir (nilai)", "total"],
  hargaPokok: ["harga pokok", "hpp", "harga satuan", "harga rata-rata", "avg cost", "average cost", "rata-rata"],
};

function normHeaderStr(h: string): string {
  return String(h || "").toLowerCase().replace(/\s+/g, " ").replace(/[._]/g, " ").replace(/\(.*?\)/g, "").trim();
}

export interface PersediaanItem {
  kode: string;
  nama: string;
  satuan: string;
  awalQty: number;
  awalNilai: number;
  masukQty: number;
  masukNilai: number;
  keluarQty: number;
  keluarNilai: number;
}

export function parseAccuratePersediaanText(text: string): PersediaanItem[] {
  const lines = text.split(/\r?\n/);
  let headerIdx = -1;
  let headerCols: { raw: string; norm: string }[] = [];
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const raw = lines[i];
    if (/^(INDOSARI|Daftar Nilai|Laporan Persediaan|Dari |Cabang|ACCURATE|Tercetak|Halaman|Total )/i.test(raw.trim())) continue;
    if (!/kode|nama|barang|item|stok|qty/i.test(raw)) continue;
    const cols = raw.split(/\s{2,}/).map(c => c.trim()).filter(c => c.length > 0);
    if (cols.length < 3) continue;
    const norms = cols.map(c => normHeaderStr(c));
    let matchCount = 0;
    norms.forEach(n => {
      for (const field of Object.keys(PERS_FIELD_ALIASES)) {
        if (PERS_FIELD_ALIASES[field].includes(n)) { matchCount++; break; }
      }
    });
    if (matchCount >= 2) {
      headerIdx = i;
      headerCols = cols.map((c, idx) => ({ raw: c, norm: norms[idx] }));
      break;
    }
  }
  const colToField: (string | null)[] = [];
  headerCols.forEach(col => {
    let matched: string | null = null;
    for (const field of Object.keys(PERS_FIELD_ALIASES)) {
      if (PERS_FIELD_ALIASES[field].includes(col.norm)) { matched = field; break; }
    }
    colToField.push(matched);
  });
  const hasField = (f: string) => colToField.includes(f);
  const hasAwal = hasField("awalQty") || hasField("awalNilai");
  const hasMasuk = hasField("masukQty") || hasField("masukNilai");
  const hasKeluar = hasField("keluarQty") || hasField("keluarNilai");
  const hasAkhir = hasField("akhirQty") || hasField("akhirNilai");
  void hasAkhir; void hasAwal; void hasMasuk; void hasKeluar; // unused in this minimal port
  const numFieldList: string[] = [];
  colToField.forEach(f => {
    if (f && !["kode", "nama", "satuan"].includes(f)) numFieldList.push(f);
  });

  const isNumTok = (t: string) => /^[\d.,]+$/.test(t) && /\d/.test(t);
  const items: PersediaanItem[] = [];
  let skipped = 0;
  let pendingName = "";
  const MUT_FIELDS = ["awalQty", "awalNilai", "masukQty", "masukNilai", "keluarQty", "keluarNilai"];
  for (let i = (headerIdx >= 0 ? headerIdx + 1 : 0); i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (isAccurateHeaderOrFooter(trimmed)) { pendingName = ""; continue; }
    if (/^total/i.test(trimmed)) { pendingName = ""; continue; }

    const tokens = trimmed.split(/\s+/);
    const nums: number[] = [];
    let endIdx = tokens.length - 1;
    while (nums.length < 8 && endIdx >= 0 && isNumTok(tokens[endIdx])) {
      nums.unshift(parseAccurateNumber(tokens[endIdx]));
      endIdx--;
    }
    if (nums.length < 2) {
      pendingName = (pendingName ? pendingName + " " : "") + trimmed;
      continue;
    }

    const vals: Record<string, number> = {};
    if (numFieldList.length > 0 && nums.length === numFieldList.length) {
      numFieldList.forEach((f, j) => { vals[f] = nums[j]; });
    } else if (nums.length >= 6) {
      vals.awalQty = nums[0]; vals.awalNilai = nums[1];
      vals.masukQty = nums[2]; vals.masukNilai = nums[3];
      vals.keluarQty = nums[4]; vals.keluarNilai = nums[5];
    } else {
      vals.masukQty = nums[0]; vals.masukNilai = nums[1];
    }
    const hasMut = MUT_FIELDS.some(f => vals[f] !== undefined);
    if (!hasMut) {
      if (vals.akhirQty !== undefined) vals.masukQty = vals.akhirQty;
      if (vals.akhirNilai !== undefined) vals.masukNilai = vals.akhirNilai;
    }

    const rest = tokens.slice(0, endIdx + 1);
    const fullPrefix = (pendingName ? pendingName + " " : "") + rest.join(" ");
    pendingName = "";
    const fullTokens = fullPrefix.split(/\s+/);
    if (fullTokens.length < 2) { skipped++; continue; }
    const kode = fullTokens[0];
    const satuan = fullTokens[fullTokens.length - 1];
    const nama = fullTokens.slice(1, -1).join(" ").trim() || kode;

    const item: PersediaanItem = {
      kode, nama, satuan,
      awalQty: 0, awalNilai: 0,
      masukQty: 0, masukNilai: 0,
      keluarQty: 0, keluarNilai: 0,
    };
    MUT_FIELDS.forEach(f => { if (vals[f] !== undefined) (item as any)[f] = vals[f]; });
    items.push(item);
  }
  console.log(`Persediaan parser: ${items.length} items, ${skipped} skipped, numFields=[${numFieldList.join(",")}]`);
  return items;
}
