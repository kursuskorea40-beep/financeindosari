#!/usr/bin/env python3
"""
Parse the Accurate "Rincian Penjualan per Barang" PDF text and build:
1. New EXTRAS.rincianPenjualan array (transaction-level)
2. New "Per Barang (Sep)" Excel sheet data (per-item summary)

Then update the embedded COMBINED JSON in the HTML file.
"""
import json
import re
from pathlib import Path

HTML_PATH = Path("/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html")
RINCIAN_TXT = Path("/tmp/rincian.txt")
SUMMARY_TXT = Path("/tmp/summary.txt")

MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "mei": 5, "may": 5,
    "jun": 6, "jul": 7, "agu": 8, "aug": 8, "sep": 9, "okt": 10, "oct": 10,
    "nov": 11, "des": 12, "dec": 12,
}


def parse_indonesian_number(s: str) -> float:
    """Convert Indonesian-formatted number to float.
    Indonesian convention:
      - Comma = decimal separator: '39,25' = 39.25, '0,5' = 0.5
      - Dot = thousand separator: '2.198.000' = 2198000, '1.000' = 1000
    If both present: dot=thousands, comma=decimal.
    """
    s = str(s).strip()
    has_dot = "." in s
    has_comma = "," in s
    if has_dot and has_comma:
        # Both: dot=thousands, comma=decimal
        s = s.replace(".", "").replace(",", ".")
    elif has_dot:
        # Only dots => ALWAYS treat as thousand separator (Indonesian convention)
        # In this Accurate report, quantities use comma for decimal (e.g., '39,25')
        # so any dot-only number is thousands (e.g., '1.000' = 1000, '2.198.000' = 2198000)
        s = s.replace(".", "")
    elif has_comma:
        # Only comma => decimal
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return 0.0


def parse_indonesian_date(s: str) -> str:
    """Parse '01 Sep 2026' -> '2026-09-01'."""
    s = s.strip()
    m = re.match(r"(\d{1,2})\s+(\w{3,})\s+(\d{4})", s)
    if not m:
        return None
    day = int(m.group(1))
    mon_str = m.group(2).lower()[:3]
    year = int(m.group(3))
    mon = MONTH_MAP.get(mon_str)
    if not mon:
        return None
    return f"{year:04d}-{mon:02d}-{day:02d}"


def is_header_or_footer(line: str) -> bool:
    """Check if a line is header/footer that should be skipped."""
    s = line.strip()
    if not s:
        return True
    skip_prefixes = (
        "INDOSARI", "Rincian Penjualan", "Dari ", "Cabang", "Nomor #",
        "Tanggal", "Keterangan", "Kuantitas", "Satuan", "Penjualan",
        "ACCURATE", "Tercetak", "Halaman", "Total Nama Barang",
    )
    return s.startswith(skip_prefixes) or s in ("Nama Barang",)


def is_transaction(line: str) -> bool:
    """Check if line is a transaction row.
    Pattern: code date ... qty satuan amount
    Code starts with SI. or with digits.
    """
    s = line.strip()
    # Match: starts with code, then date "DD Mon YYYY"
    pattern = r"^\S+\s+\d{1,2}\s+\w{3,}\s+\d{4}"
    return bool(re.match(pattern, s))


def is_subtotal(line: str) -> bool:
    """Check if line is a subtotal row.
    Pattern: just qty + amount (e.g., '166,25 9.310.000' or '5 60.000')
    """
    s = line.strip()
    # Pattern: decimal/integer qty, then decimal amount with thousand separators
    pattern = r"^[\d.,]+\s+[\d.,]+$"
    return bool(re.match(pattern, s))


def parse_transaction(line: str, current_item: str) -> dict:
    """Parse a transaction line into a transaction dict."""
    s = line.strip()
    # Match: code date [keterangan] qty satuan amount
    # Examples:
    #   'SI.2026.09.00001 01 Sep 2026 NB. 716 39,25 Ltr 2.198.000'
    #   '00051260905 05 Sep 2026 1 Kg 12.000'
    #   '00161260921 21 Sep 2026 2 Kg 24.000'
    # Pattern: code (non-space) + space + date + space + (rest)
    m = re.match(r"^(\S+)\s+(\d{1,2}\s+\w{3,}\s+\d{4})\s+(.*)$", s)
    if not m:
        return None
    no_nota = m.group(1)
    tanggal = parse_indonesian_date(m.group(2))
    rest = m.group(3).strip()
    # Try to extract keterangan (NB./NT.) if present
    keterangan = ""
    ket_match = re.match(r"^(NB\.\s*\d+|NT\.\s*\d+)\s+(.*)$", rest)
    if ket_match:
        keterangan = ket_match.group(1).replace(" ", "")  # e.g., 'NB.716'
        rest = ket_match.group(2).strip()
    # Now rest = 'qty satuan amount'
    # qty: decimal (39,25) or integer (5)
    # satuan: text (Kg, Ltr, PCS, Btl, Ons, Biji, Pack, ROLL, Liter)
    # amount: decimal with thousand separators (2.198.000, 12.000)
    m2 = re.match(r"^([\d.,]+)\s+(\S+)\s+([\d.,]+)$", rest)
    if not m2:
        # Maybe amount missing? Or unusual format. Skip.
        return None
    qty = parse_indonesian_number(m2.group(1))
    satuan = m2.group(2)
    penjualan = parse_indonesian_number(m2.group(3))
    if penjualan <= 0 or qty <= 0:
        return None
    harga_satuan = round(penjualan / qty)
    kategori = "NOTA BESAR" if keterangan.startswith("NB") else "NOTA KECIL"
    return {
        "tanggal": tanggal,
        "noNota": no_nota,
        "namaBarang": current_item,
        "satuan": satuan,
        "kuantitas": qty,
        "hargaSatuan": harga_satuan,
        "kategori": kategori,
        "pelanggan": "",
        "catatan": keterangan,
    }


def parse_rincian_pdf(text: str):
    """Parse the entire 'Rincian Penjualan per Barang' PDF text."""
    lines = text.split("\n")
    transactions = []
    # current_item_lines accumulates non-transaction, non-subtotal lines
    # (which are item names, possibly multi-line)
    current_item_lines = []
    current_item = None

    for raw_line in lines:
        # Strip leading whitespace but keep internal structure
        line = raw_line.rstrip()
        if not line.strip():
            continue
        if is_header_or_footer(line):
            # Reset item accumulator when hitting header
            current_item_lines = []
            continue
        if is_subtotal(line):
            # Subtotal row - skip and reset item accumulator
            current_item_lines = []
            continue
        if is_transaction(line):
            # Flush item accumulator into current_item
            if current_item_lines:
                current_item = " ".join(current_item_lines).strip()
                current_item_lines = []
            if not current_item:
                # No item name set yet - skip
                continue
            tx = parse_transaction(line, current_item)
            if tx:
                transactions.append(tx)
            else:
                print(f"WARN: could not parse tx line: {line.strip()[:120]}")
        else:
            # Non-transaction, non-subtotal, non-header line
            # Could be item name or continuation
            current_item_lines.append(line.strip())
    return transactions


def build_per_barang_summary(transactions):
    """Aggregate transactions per item to build 'Per Barang (Sep)' summary."""
    by_item = {}
    for tx in transactions:
        name = tx["namaBarang"]
        if name not in by_item:
            by_item[name] = {
                "nama": name,
                "satuan": tx["satuan"],
                "total_qty": 0.0,
                "total_nilai": 0.0,
                "tx_count": 0,
            }
        by_item[name]["total_qty"] += tx["kuantitas"]
        by_item[name]["total_nilai"] += tx["kuantitas"] * tx["hargaSatuan"]
        by_item[name]["tx_count"] += 1
    # Sort by total_nilai descending (matching Excel sheet order)
    items = sorted(by_item.values(), key=lambda x: -x["total_nilai"])
    return items


def main():
    # Read PDF text
    text = RINCIAN_TXT.read_text(encoding="utf-8")
    print(f"Read {len(text)} chars from {RINCIAN_TXT}")

    # Parse transactions
    transactions = parse_rincian_pdf(text)
    total = sum(tx["kuantitas"] * tx["hargaSatuan"] for tx in transactions)
    print(f"Parsed {len(transactions)} transactions")
    print(f"Total: Rp {total:,.0f}")
    print(f"Expected: Rp 174,512,880")
    print(f"Difference: Rp {174512880 - total:,.0f}")

    # Build per-item summary
    summary = build_per_barang_summary(transactions)
    print(f"\nTop 5 items:")
    for item in summary[:5]:
        print(f"  {item['nama'][:50]:50} | {item['total_qty']:8.2f} {item['satuan']:5} | Rp {item['total_nilai']:>15,.0f}")

    # Save parsed transactions to JSON for inspection
    out_path = Path("/tmp/parsed_rincian.json")
    out_path.write_text(json.dumps({
        "transactions": transactions,
        "summary": summary,
        "total": total,
        "tx_count": len(transactions),
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\nSaved parsed data to {out_path}")


if __name__ == "__main__":
    main()
