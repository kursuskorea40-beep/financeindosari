#!/usr/bin/env python3
"""
Update the embedded COMBINED JSON in the HTML file with:
1. New EXTRAS.rincianPenjualan (868 parsed transactions from Accurate Sep 2026 report)
2. New "Per Barang (Sep)" Excel sheet rows 7-107 (per-item summary matching the user's PDF)
3. Update F108 (TOTAL PENJUALAN) to 174,512,856
4. Update Laba Rugi C14 (September penjualan) to 174,512,880

The user's Accurate report total = Rp 174,512,880 (with 7,283.08 total qty, 100 unique items)
Our parser yielded: Rp 174,512,856 (868 transactions, 100 items) - within Rp 24 of expected.
"""
import json
import re
from pathlib import Path

HTML_PATH = Path("/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html")
PARSED_PATH = Path("/tmp/parsed_rincian.json")

# The expected total from the user's Accurate report
ACCURATE_TOTAL = 174512880


def main():
    # Read HTML
    html = HTML_PATH.read_text(encoding="utf-8")
    print(f"Original HTML size: {len(html):,} bytes")

    # Extract COMBINED JSON
    m = re.search(r"const COMBINED = (\{.*?\});\n", html, re.DOTALL)
    if not m:
        raise RuntimeError("Could not find COMBINED JSON in HTML")
    combined_str = m.group(1)
    combined = json.loads(combined_str)
    print(f"COMBINED JSON size: {len(combined_str):,} chars")

    # Load parsed transactions
    parsed = json.loads(PARSED_PATH.read_text(encoding="utf-8"))
    new_txs = parsed["transactions"]
    new_summary = parsed["summary"]
    new_total = parsed["total"]
    print(f"Loaded {len(new_txs)} transactions, {len(new_summary)} items, total Rp {new_total:,.0f}")

    # === 1. Update EXTRAS.rincianPenjualan ===
    old_tx_count = len(combined["extras"].get("rincianPenjualan", []))
    combined["extras"]["rincianPenjualan"] = new_txs
    print(f"Updated extras.rincianPenjualan: {old_tx_count} -> {len(new_txs)} transactions")

    # === 2. Update "Per Barang (Sep)" Excel sheet ===
    sheet_name = "Per Barang (Sep)"
    render_sheets = combined["excelSheets"]["renderSheets"]
    per_barang = render_sheets[sheet_name]

    # The sheet has rows 1-127. Items are in rows 7-107 (101 item slots).
    # Row 5: section header "PENJUALAN PER BARANG"
    # Row 6: column headers (NO, NAMA BARANG, SATUAN, KUANTITAS, PENJUALAN, % DARI TOTAL)
    # Row 7-107: 101 item rows
    # Row 108: TOTAL row (with F108 = SUM(F7:F107), E108 = SUM(E7:E107))

    # Verify structure
    print(f"\nVerifying sheet structure...")
    print(f"  Total rows in renderSheets: {len(per_barang)}")
    # Each row is a list of cell objects with coord/value/formula/isInput/fill/fmt
    # Row at index 6 (0-indexed) should be row 7 in the sheet
    if len(per_barang) < 108:
        print(f"ERROR: Sheet has only {len(per_barang)} rows, expected at least 108")
        return
    print(f"  Row 7 first cell coord: {per_barang[6][0]['coord']}")
    print(f"  Row 108 first cell coord: {per_barang[107][0]['coord']}")

    # Helper to find a cell by coord in a row
    def find_cell(row, col_letter):
        for cell in row:
            m = re.match(r"([A-Z]+)(\d+)", cell["coord"])
            if m and m.group(1) == col_letter:
                return cell
        return None

    # Update rows 7-107 with new items
    items_count = len(new_summary)
    print(f"\nUpdating {min(items_count, 101)} item rows (rows 7-{6 + min(items_count, 101)})")

    for i in range(101):
        row_idx_1based = 7 + i  # row 7 = item 1
        row = per_barang[row_idx_1based - 1]  # 0-indexed

        if i < items_count:
            item = new_summary[i]
            # Update B (NO), C (NAMA), D (SATUAN), E (QTY), F (NILAI)
            b_cell = find_cell(row, "B")
            c_cell = find_cell(row, "C")
            d_cell = find_cell(row, "D")
            e_cell = find_cell(row, "E")
            f_cell = find_cell(row, "F")

            if b_cell:
                b_cell["value"] = i + 1
                b_cell["isInput"] = True
                # Preserve alternating fill if present (rows odd/even)
            if c_cell:
                c_cell["value"] = item["nama"]
                c_cell["isInput"] = True
            if d_cell:
                d_cell["value"] = item["satuan"]
                d_cell["isInput"] = True
            if e_cell:
                e_cell["value"] = round(item["total_qty"], 4)  # keep precision
                e_cell["isInput"] = True
            if f_cell:
                f_cell["value"] = round(item["total_nilai"])
                f_cell["isInput"] = True
            # G column has formula =IF($F$108=0,"-",F7/$F$108) - leave as is
            # The formula will recompute with new F values
        else:
            # Clear the row (no item)
            for cell in row:
                coord = cell["coord"]
                cm = re.match(r"([A-Z]+)(\d+)", coord)
                if cm and cm.group(1) in ("B", "C", "D", "E", "F"):
                    cell["value"] = None
                    cell["isInput"] = True
                    cell["fill"] = None

    # Update row 108 (TOTAL)
    row_108 = per_barang[107]  # 0-indexed
    # E108 has formula =SUM(E7:E107), F108 has formula =SUM(F7:F107)
    e_108 = find_cell(row_108, "E")
    f_108 = find_cell(row_108, "F")
    if e_108:
        e_108["value"] = round(sum(item["total_qty"] for item in new_summary), 4)
        # Keep the formula
    if f_108:
        f_108["value"] = round(new_total)
        # Keep the formula

    print(f"\n  Updated F108 (TOTAL PENJUALAN) = Rp {round(new_total):,}")
    print(f"  Updated E108 (TOTAL QTY) = {round(sum(item['total_qty'] for item in new_summary), 4)}")

    # === 3. Update HF_SHEETS (HyperFormula data) ===
    hf_sheets = combined["excelSheets"]["hfSheets"]
    per_barang_hf = hf_sheets[sheet_name]
    # HF_SHEETS is a 2D array per sheet
    # Row 1 (header) at index 0, row 2 at index 1, etc.
    # So row 7 (1-indexed) = index 6 (0-indexed) in HF array
    # Col A = index 0, B = 1, C = 2, D = 3, E = 4, F = 5, G = 6

    print(f"\n  HF_SHEETS[{sheet_name}] has {len(per_barang_hf)} rows")

    # Update rows 7-107 (HF index 6 to 106)
    for i in range(101):
        hf_row_idx = 6 + i  # 0-indexed
        if hf_row_idx >= len(per_barang_hf):
            print(f"  WARN: HF row {hf_row_idx} out of bounds (only {len(per_barang_hf)} rows)")
            break

        hf_row = per_barang_hf[hf_row_idx]
        # Pad row if needed
        while len(hf_row) < 7:
            hf_row.append(None)

        if i < items_count:
            item = new_summary[i]
            # B=1 (NO), C=2 (NAMA), D=3 (SATUAN), E=4 (QTY), F=5 (NILAI)
            hf_row[1] = i + 1
            hf_row[2] = item["nama"]
            hf_row[3] = item["satuan"]
            hf_row[4] = round(item["total_qty"], 4)
            hf_row[5] = round(item["total_nilai"])
            # G=6 has formula, leave as is (or set to null - HF will recompute)
        else:
            # Clear
            hf_row[1] = None
            hf_row[2] = None
            hf_row[3] = None
            hf_row[4] = None
            hf_row[5] = None

    # Update F108 (HF row 107, col 5)
    if len(per_barang_hf) > 107:
        hf_row_108 = per_barang_hf[107]
        while len(hf_row_108) < 7:
            hf_row_108.append(None)
        # F108 is formula =SUM(F7:F107) - leave formula intact, update cached value
        # Actually HF_SHEETS only stores values, not formulas - formulas are in renderSheets
        # But when HyperFormula is built, it uses the values from HF_SHEETS
        # The formulas in renderSheets are applied via applyEditsToHF OR they're stored
        # separately... let me check

        # Actually looking at the code:
        # const hf = HyperFormula.buildFromSheets(HF_SHEETS, ...);
        # HF_SHEETS contains just values
        # But renderSheets has formulas - these are applied when the user edits a cell
        # For initial load, only HF_SHEETS values are used (formulas in renderSheets are
        # for display only - showing what the formula SHOULD be)

        # Wait, that's not right either. Let me look at the original code...
        # Looking at renderExcelSheet(), it uses both:
        #   - sourceValue = userEdits.excelCells[sheet][coord] OR cell.value
        #   - hfVal = hf.getCellValue(...)  // from HF
        # And fmtCell() prefers hfVal if available

        # So the displayed value comes from HF, which is built from HF_SHEETS.
        # The renderSheets.cell.value is just a fallback/display hint.

        # For F108 with formula =SUM(F7:F107):
        #   - renderSheets has formula: "=SUM(F7:F107)"
        #   - When HF is built from HF_SHEETS, F108 cell will just have the value 166002860
        #   - But HF doesn't know about the formula - it just has the value

        # Wait, that can't be right. The dashboard reads hfGet("Ringkasan","B9") which
        # has formula ='Arus Kas'!K28. If HF doesn't know formulas, how does this work?

        # Looking at HyperFormula docs: buildFromSheets takes sheets where each sheet is
        # a 2D array of values OR formulas. Formulas are strings starting with "=".

        # So HF_SHEETS cells can contain either:
        #   - A literal value (number, string, null)
        #   - A formula string (e.g., "=SUM(F7:F107)")

        # Let me verify by looking at the actual HF_SHEETS data structure

        # For now, let me set F108 to the new total value. If it's a formula in HF_SHEETS,
        # I'll preserve the formula. If it's a value, I'll update it.

        f108_current = hf_row_108[5] if len(hf_row_108) > 5 else None
        print(f"  F108 current HF value: {f108_current}")
        # If current is a formula, leave it (HF will recompute). If it's a number, update it.
        if not (isinstance(f108_current, str) and f108_current.startswith("=")):
            hf_row_108[5] = round(new_total)
            print(f"  Updated F108 HF value to {round(new_total)}")
        else:
            print(f"  F108 is a formula in HF, will recompute automatically")

    # === 4. Update Laba Rugi C14 (September penjualan) ===
    laba_rugi_render = render_sheets["Laba Rugi"]
    # Row 14 = September (1-indexed). In renderSheets, find row 14
    # renderSheets["Laba Rugi"] is a list of rows. Row 14 = index 13 (0-indexed)
    row_14 = laba_rugi_render[13]
    c14_cell = find_cell(row_14, "C")
    if c14_cell:
        old_c14 = c14_cell.get("value")
        c14_cell["value"] = ACCURATE_TOTAL
        c14_cell["isInput"] = True
        print(f"\n  Updated Laba Rugi C14 (Sep penjualan): {old_c14} -> {ACCURATE_TOTAL}")

    # Update HF_SHEETS for Laba Rugi C14
    laba_rugi_hf = hf_sheets["Laba Rugi"]
    # C14 = row 13 (0-indexed), col 2 (C)
    if len(laba_rugi_hf) > 13 and len(laba_rugi_hf[13]) > 2:
        old_hf_c14 = laba_rugi_hf[13][2]
        # Only update if not a formula
        if not (isinstance(old_hf_c14, str) and old_hf_c14.startswith("=")):
            laba_rugi_hf[13][2] = ACCURATE_TOTAL
            print(f"  Updated Laba Rugi HF C14: {old_hf_c14} -> {ACCURATE_TOTAL}")
        else:
            print(f"  Laba Rugi HF C14 is formula, skipping")

    # === 5. Write back ===
    print("\nWriting back to HTML...")
    new_combined_str = json.dumps(combined, ensure_ascii=False, separators=(",", ":"))
    print(f"  New COMBINED JSON size: {len(new_combined_str):,} chars (was {len(combined_str):,})")

    # Replace in HTML
    new_html = html.replace(combined_str, new_combined_str, 1)
    if new_html == html:
        print("  ERROR: replacement did not occur!")
        return
    HTML_PATH.write_text(new_html, encoding="utf-8")
    print(f"  New HTML size: {len(new_html):,} bytes (was {len(html):,})")
    print("\n✓ Done! HTML file updated.")


if __name__ == "__main__":
    main()
