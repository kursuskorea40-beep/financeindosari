// ============================================================
// Accurate "Daftar Piutang Usaha" / "Daftar Utang Usaha" parser
// Ported from HTML akuntansi parseAccuratePiutangUtangText
// ============================================================

import { parseAccurateNumber, parseAccurateDate } from "./accurate-parser";

export const PU_SKIP_TEXT = [
  "INDOSARI", "ACCURATE", "Daftar Piutang", "Daftar Utang", "Kartu Piutang", "Kartu Utang",
  "Piutang Usaha", "Utang Usaha", "Cabang", "Filter", "Mata Uang", "Outstanding",
];
export const PU_SKIP_ANY = [
  "Per Tgl", "Dari ", "s/d", "s.d.", "Tercetak", "Halaman", "Hal ", "Page", "Nomor #",
  "No. Faktur", "No Faktur", "Nomor Faktur", "Total", "Subtotal", "Sub Total", "Grand",
];
export const PU_KEYWORD_TOKENS = new Set([
  "no", "nomor", "faktur", "tanggal", "jatuh", "tempo", "jumlah", "sisa", "dibayar", "sudah",
  "umur", "kode", "nama", "pelanggan", "supplier", "customer", "vendor", "total", "subtotal",
  "sub", "grand", "mata", "uang", "idr", "nilai", "status", "alamat", "telp", "npwp", "cabang",
  "halaman", "page", "tercetak", "accurate", "outstanding", "per", "tgl", "dari", "sd", "filter",
  "daftar", "piutang", "utang", "kartu", "usaha",
]);

export function looksLikeFakturToken(tok: string): boolean {
  if (!tok) return false;
  if (!/^[\w.\-\/]{4,}$/.test(tok)) return false;
  if (!/\d/.test(tok)) return false;
  if (/[A-Za-z]/.test(tok)) return true;
  if (/[.,]/.test(tok)) return false;
  return tok.replace(/\D/g, "").length >= 6;
}

export function isAmountLikeToken(tok: string): boolean {
  if (!tok) return false;
  if (/^[\d.,]+$/.test(tok) && /[.,]/.test(tok)) return true;
  if (/^\d$/.test(tok)) return true;
  return false;
}

export function looksLikeJoinedFaktur(s: string): boolean {
  if (!s) return false;
  if (!/^[A-Za-z]{1,5}[.\-\/]/.test(s)) return false;
  const digitGroups = s.match(/\d+/g) || [];
  return digitGroups.length >= 2;
}

export interface PiutangUtangRow {
  party: string;
  noFaktur: string;
  tanggal: string | null;
  jatuhTempo: string | null;
  jumlah: number;
  dibayar: number;
  sisa: number;
}

export interface PULastDebug {
  kind: string;
  totalLines: number;
  parsed: number;
  skipped: number;
  skippedWithDigit: string[];
}

const LAST_DEBUG: { current: PULastDebug | null } = { current: null };

export function parseAccuratePiutangUtangText(text: string, kind: "piutang" | "hutang" = "piutang"): PiutangUtangRow[] {
  const lines = String(text).split(/\r?\n/);
  const rows: PiutangUtangRow[] = [];
  let party = "";
  let skipped = 0;
  const puSkippedWithDigit: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/\s+$/g, "").trim();
    if (!line) continue;
    const norm = line.replace(/(\d{1,2})\s*[-\/]\s*([A-Za-z]{3,})\s*[-\/]\s*(\d{4})/g, "$1 $2 $3");
    if (/^idr$/i.test(norm)) continue;
    const pm = norm.match(/^(?:pelanggan|supplier|customer|vendor|nama)\s*:\s*(.+)$/i);
    if (pm) { party = pm[1].trim(); continue; }
    const low = norm.toLowerCase();
    if (!/\d/.test(norm)) {
      const toks = norm.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
      if (toks.length > 0 && toks.every(t => PU_KEYWORD_TOKENS.has(t))) continue;
      if (PU_SKIP_TEXT.some(p => low.startsWith(p.toLowerCase()))) continue;
      party = norm.replace(/\s+/g, " ").trim();
      continue;
    }
    if (PU_SKIP_ANY.some(p => low.startsWith(p.toLowerCase()))) continue;
    const withoutDates = norm.replace(new RegExp(/(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})/g.source, "g"), " ");
    const toks = withoutDates.split(/\s+/).filter(Boolean);
    let fi = -1;
    for (let i = 0; i < Math.min(6, toks.length); i++) {
      if (looksLikeFakturToken(toks[i])) { fi = i; break; }
    }
    if (fi < 0 && toks.length >= 2) {
      for (let i = 0; i < Math.min(3, toks.length); i++) {
        let maxJ = Math.min(i + 4, toks.length);
        while (maxJ > i + 1 && isAmountLikeToken(toks[maxJ - 1])) maxJ--;
        for (let j = maxJ; j > i + 1; j--) {
          const joined = toks.slice(i, j).join(".");
          if (looksLikeJoinedFaktur(joined)) {
            fi = i;
            toks.splice(i, j - i, joined);
            break;
          }
        }
        if (fi >= 0) break;
      }
    }
    if (fi < 0) { skipped++; if (puSkippedWithDigit.length < 5) puSkippedWithDigit.push(norm.slice(0, 120)); continue; }
    const noFaktur = toks[fi];
    const dates: string[] = [];
    let mm: RegExpExecArray | null;
    const re = new RegExp(/(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4})/g.source, "g");
    while ((mm = re.exec(norm)) !== null && dates.length < 2) {
      const d = parseAccurateDate(mm[1]);
      if (d) dates.push(d);
    }
    const nums: number[] = [];
    toks.slice(fi + 1).forEach(t => {
      let neg = false, body = t.replace(/,$/, "");
      if (/^\(.+\)$/.test(body)) { neg = true; body = body.slice(1, -1); }
      if (/^-?[\d.,]+$/.test(body) && /\d/.test(body)) {
        const v = parseAccurateNumber(body);
        nums.push(neg ? -v : v);
      }
    });
    if (nums.length === 0) { skipped++; continue; }
    const tanggal = dates[0] || null;
    const jatuhTempo = dates[1] || null;
    let jumlah = 0, dibayar = 0, sisa = 0;
    if (nums.length >= 3) {
      const L = nums.slice(-3);
      jumlah = L[0]; dibayar = L[1]; sisa = L[2];
    } else if (nums.length === 2) {
      jumlah = nums[0]; sisa = nums[1]; dibayar = Math.max(0, jumlah - sisa);
    } else {
      jumlah = nums[0]; sisa = nums[0]; dibayar = 0;
    }
    rows.push({ party, noFaktur, tanggal, jatuhTempo, jumlah, dibayar, sisa });
  }
  console.log(`PU parser (${kind || "?"}): ${rows.length} faktur, ${skipped} baris dilewati`);
  LAST_DEBUG.current = {
    kind: kind || "?",
    totalLines: lines.length,
    parsed: rows.length,
    skipped,
    skippedWithDigit: puSkippedWithDigit.slice(),
  };
  return rows;
}

export function getPiutangUtangLastDebug(): PULastDebug | null {
  return LAST_DEBUG.current;
}

// ============================================================
// Hitung umur & status (TERLEWAT/BERJALAN) dinamis dari tanggal
// ============================================================

export interface UmurStatus {
  umur: number;
  status: "TERLEWAT" | "BERJALAN";
}

export function hitungUmurStatus(f: { tanggal?: string | null; jatuhTempo?: string | null; umur?: number; status?: string }): UmurStatus {
  const parseD = (s?: string | null): Date | null => {
    if (!s) return null;
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tg = parseD(f.tanggal), jt = parseD(f.jatuhTempo);
  const umur = tg ? Math.max(0, Math.round((today.getTime() - tg.getTime()) / 86400000)) : (Number(f.umur) || 0);
  const status: "TERLEWAT" | "BERJALAN" = jt ? (jt < today ? "TERLEWAT" : "BERJALAN") : "BERJALAN";
  return { umur, status };
}
