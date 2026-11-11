// ============================================================
// Accurate PDF text parser — ported from HTML akuntansi smart parser
// Format: Indonesian convention (titik=ribuan, koma=desimal)
// ============================================================

export const ACCURATE_MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7,
  agt: 8, agu: 8, aug: 8, sep: 9, okt: 10, oct: 10, nov: 11, des: 12, dec: 12,
};

export function parseAccurateNumber(s: string | number | null | undefined): number {
  // Indonesian convention: comma=decimal, dot=thousand separator
  if (s === null || s === undefined) return 0;
  let str = String(s).trim();
  if (!str) return 0;
  const hasDot = str.includes(".");
  const hasComma = str.includes(",");
  if (hasDot && hasComma) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (hasDot) {
    str = str.replace(/\./g, "");
  } else if (hasComma) {
    str = str.replace(",", ".");
  }
  const n = Number(str);
  return isNaN(n) ? 0 : n;
}

export function parseAccurateDate(s: string): string | null {
  // Parse '01 Sep 2026' -> '2026-09-01'
  if (!s) return null;
  const str = String(s).trim();
  const m = str.match(/(\d{1,2})\s+(\w{3,})\s+(\d{4})/);
  if (!m) return null;
  const mon = ACCURATE_MONTH_MAP[m[2].toLowerCase().slice(0, 3)];
  if (!mon) return null;
  return `${m[3]}-${String(mon).padStart(2, "0")}-${String(parseInt(m[1], 10)).padStart(2, "0")}`;
}

export function isAccurateHeaderOrFooter(line: string): boolean {
  const s = line.trim();
  if (!s) return true;
  const skips = [
    "INDOSARI", "Rincian Penjualan", "Rincian Pembelian", "Mutasi Persediaan",
    "Kartu Stok", "Nilai Persediaan", "Daftar Nilai", "Dari ", "Cabang",
    "Nomor #", "Tanggal", "Keterangan", "Kuantitas", "Satuan", "Penjualan",
    "ACCURATE", "Tercetak", "Halaman", "Total Nama Barang", "Nama Barang",
    "Kode", "Saldo Awal", "Saldo Akhir", "Penerimaan", "Pengeluaran",
    "Qty", "Nilai", "Per Tgl", "Mata Uang", "Outstanding",
  ];
  return skips.some(p => s.startsWith(p));
}

export function isAccurateTransaction(line: string): boolean {
  // Match: code (non-space) + date "DD Mon YYYY"
  const s = line.trim();
  return /^\S+\s+\d{1,2}\s+\w{3,}\s+\d{4}\s+/.test(s);
}

export function isAccurateSubtotal(line: string): boolean {
  // Pattern: qty + amount (e.g., '166,25 9.310.000' or '5 60.000')
  const s = line.trim();
  return /^[\d.,]+\s+[\d.,]+$/.test(s);
}

// ============================================================
// Penjualan: parseAccurateRincianText (Rincian Penjualan per Barang)
// ============================================================

export interface TransaksiPenjualanParsed {
  tanggal: string;
  noNota: string;
  namaBarang: string;
  satuan: string;
  kuantitas: number;
  hargaSatuan: number;
  kategori: "NOTA BESAR" | "NOTA KECIL";
  pelanggan: string;
  catatan: string;
}

export function parseAccurateTransaction(line: string, currentItem: string | null): TransaksiPenjualanParsed | null {
  const s = line.trim();
  const m = s.match(/^(\S+)\s+(\d{1,2}\s+\w{3,}\s+\d{4})\s+(.*)$/);
  if (!m) return null;
  const noNota = m[1];
  const tanggal = parseAccurateDate(m[2]);
  if (!tanggal) return null;
  let rest = m[3].trim();
  let keterangan = "";
  const ketMatch = rest.match(/^([NA][BT][.,\s]?\s*\d+)\s+(.*)/);
  if (ketMatch) {
    keterangan = ketMatch[1].replace(/[\s.,]+/g, "");
    rest = ketMatch[2].trim();
  }
  const m2 = rest.match(/^([\d.,]+)\s+(\S+)\s+([\d.,]+)$/);
  if (!m2) return null;
  const qty = parseAccurateNumber(m2[1]);
  const satuan = m2[2];
  const penjualan = parseAccurateNumber(m2[3]);
  if (penjualan <= 0 || qty <= 0) return null;
  const hargaSatuan = Math.round(penjualan / qty);
  const kategori: "NOTA BESAR" | "NOTA KECIL" = keterangan.startsWith("NB") ? "NOTA BESAR" : "NOTA KECIL";
  return {
    tanggal, noNota, namaBarang: currentItem || "",
    satuan, kuantitas: qty, hargaSatuan,
    kategori, pelanggan: "", catatan: keterangan,
  };
}

export function parseAccurateRincianText(text: string): TransaksiPenjualanParsed[] {
  const lines = text.split(/\r?\n/);
  const transactions: TransaksiPenjualanParsed[] = [];
  let currentItemLines: string[] = [];
  let currentItem: string | null = null;
  let skipped = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");
    if (!line.trim()) continue;
    if (isAccurateHeaderOrFooter(line)) {
      currentItemLines = [];
      continue;
    }
    if (isAccurateSubtotal(line)) {
      currentItemLines = [];
      continue;
    }
    if (isAccurateTransaction(line)) {
      if (currentItemLines.length > 0) {
        currentItem = currentItemLines.join(" ").replace(/\s+/g, " ").trim();
        currentItemLines = [];
      }
      if (!currentItem) { skipped++; continue; }
      const tx = parseAccurateTransaction(line, currentItem);
      if (tx) transactions.push(tx);
      else skipped++;
    } else {
      currentItemLines.push(line.trim());
    }
  }
  console.log(`Parsed ${transactions.length} penjualan transactions, skipped ${skipped} lines`);
  return transactions;
}

// ============================================================
// Pembelian: parseAccurateRincianPembelianText (Rincian Pembelian per Barang)
// ============================================================

export interface TransaksiPembelianParsed {
  tanggal: string;
  noFaktur: string;
  namaBarang: string;
  satuan: string;
  kuantitas: number;
  hargaSatuan: number;
  supplier: string;
  isLunas: boolean;
  jatuhTempo: string | null;
  catatan: string;
}

export function parseAccuratePembelianTransaction(line: string, currentItem: string | null): TransaksiPembelianParsed | null {
  const s = line.trim();
  const m = s.match(/^(\S+)\s+(\d{1,2}\s+\w{3,}\s+\d{4})\s+(.*)$/);
  if (!m) return null;
  const noFaktur = m[1];
  const tanggal = parseAccurateDate(m[2]);
  if (!tanggal) return null;
  const rest = m[3].trim();
  // Try with keterangan prefix
  const m2 = rest.match(/^(.*?)\s+([\d.,]+)\s+(\S+)\s+([\d.,]+(?:,\d+)?)\s*$/);
  let keterangan = "";
  let qty: number, satuan: string, pembelian: number;
  if (m2) {
    keterangan = m2[1].trim();
    qty = parseAccurateNumber(m2[2]);
    satuan = m2[3];
    pembelian = parseAccurateNumber(m2[4]);
  } else {
    // Try without keterangan
    const m3 = rest.match(/^([\d.,]+)\s+(\S+)\s+([\d.,]+(?:,\d+)?)$/);
    if (!m3) return null;
    qty = parseAccurateNumber(m3[1]);
    satuan = m3[2];
    pembelian = parseAccurateNumber(m3[3]);
  }
  if (pembelian <= 0 || qty <= 0) return null;
  const hargaSatuan = Math.round(pembelian / qty);

  // Detect isLunas and jatuhTempo
  let isLunas = false;
  let jatuhTempo: string | null = null;
  if (/lunas|tunai|cash|cod/i.test(keterangan)) {
    isLunas = true;
  } else if (!keterangan) {
    isLunas = true; // empty keterangan = tunai
  }
  // Try extract date from keterangan (e.g., "Tempo 23 Sep 2026")
  const tempoMatch = keterangan.match(/(\d{1,2}\s+\w{3,}\s+\d{4})/);
  if (tempoMatch) {
    jatuhTempo = parseAccurateDate(tempoMatch[1]);
    isLunas = false;
  } else {
    const tempoMatch2 = keterangan.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (tempoMatch2) {
      const yr = tempoMatch2[3].length === 2 ? "20" + tempoMatch2[3] : tempoMatch2[3];
      jatuhTempo = `${yr}-${tempoMatch2[2].padStart(2, "0")}-${tempoMatch2[1].padStart(2, "0")}`;
      isLunas = false;
    }
  }

  return {
    tanggal, noFaktur, namaBarang: currentItem || "",
    satuan, kuantitas: qty, hargaSatuan,
    supplier: "",
    isLunas, jatuhTempo, catatan: keterangan,
  };
}

export function parseAccurateRincianPembelianText(text: string): TransaksiPembelianParsed[] {
  const lines = text.split(/\r?\n/);
  const transactions: TransaksiPembelianParsed[] = [];
  let currentItemLines: string[] = [];
  let currentItem: string | null = null;
  let skipped = 0;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/g, "");
    if (!line.trim()) continue;
    if (isAccurateHeaderOrFooter(line)) {
      currentItemLines = [];
      continue;
    }
    if (isAccurateSubtotal(line)) {
      currentItemLines = [];
      continue;
    }
    if (isAccurateTransaction(line)) {
      if (currentItemLines.length > 0) {
        currentItem = currentItemLines.join(" ").replace(/\s+/g, " ").trim();
        currentItemLines = [];
      }
      if (!currentItem) { skipped++; continue; }
      const tx = parseAccuratePembelianTransaction(line, currentItem);
      if (tx) transactions.push(tx);
      else skipped++;
    } else {
      currentItemLines.push(line.trim());
    }
  }
  console.log(`Parsed ${transactions.length} pembelian transactions, skipped ${skipped} lines`);
  return transactions;
}

// ============================================================
// Helper: extract month + year from ISO date 'YYYY-MM-DD'
// ============================================================

export function getMonthFromISO(iso: string): number {
  const m = iso?.match(/^(\d{4})-(\d{2})-/);
  return m ? parseInt(m[2], 10) : 0;
}

export function getYearFromISO(iso: string): number {
  const m = iso?.match(/^(\d{4})-/);
  return m ? parseInt(m[1], 10) : 0;
}

export const BULAN_NAMES_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
export const BULAN_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agt", "Sep", "Okt", "Nov", "Des",
];

export function fmtIDR(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(n || 0);
}

export function fmtDateID(iso: string | null): string {
  if (!iso) return "-";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${parseInt(m[3])} ${BULAN_NAMES_SHORT[parseInt(m[2], 10) - 1]} ${m[1]}`;
}
