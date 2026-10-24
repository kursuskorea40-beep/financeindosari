#!/usr/bin/env python3
"""
Upgrade parseAccuratePersediaanText in the HTML file:
1. headerIdx<0 no longer returns [] — falls back to trailing-numeric strategy
2. Build numFieldList (ordered numeric fields from header) for correct mapping
3. Replace the fragile multi-space row parser with a unified trailing-numeric strategy:
   - Grab trailing numeric run (max 8) — works for multi-space AND single-space pastes
   - Header-guided mapping when counts match; positional heuristics otherwise
   - Prefix tokens = kode | nama... | satuan
   - Wrapped item names merged via pendingName
4. Save logic: append mode now merges by KODE (update existing, add new)
5. Update tips text + append option label for persediaan
"""
from pathlib import Path

HTML = Path("/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html")
text = HTML.read_text(encoding="utf-8")
orig_len = len(text)

# ============ Surgery 1: headerIdx<0 no longer returns [] ============
old1 = '''  if (headerIdx < 0) {
    console.log("Persediaan parser: header row not found");
    return [];
  }'''
new1 = '''  if (headerIdx < 0) {
    console.log("Persediaan parser: header row not found — using trailing-numeric fallback on all lines");
  }'''
assert text.count(old1) == 1, f"Surgery 1 failed: headerIdx block count = {text.count(old1)}"
text = text.replace(old1, new1)
print("✓ Surgery 1: headerIdx<0 fallback (no early return)")

# ============ Surgery 2: build numFieldList after onlyAkhir ============
anchor = "  const onlyAkhir = hasAkhir && !hasAwal && !hasMasuk && !hasKeluar;"
assert text.count(anchor) == 1, f"Surgery 2 failed: onlyAkhir anchor count = {text.count(anchor)}"
insert2 = anchor + """
  // Ordered numeric field names from the header (left-to-right) — used to map
  // the trailing numeric run of each row to the right fields
  const numFieldList = [];
  colToField.forEach(f => {
    if (f && !["kode", "nama", "satuan"].includes(f)) numFieldList.push(f);
  });"""
text = text.replace(anchor, insert2)
print("✓ Surgery 2: numFieldList built from header columns")

# ============ Surgery 3: replace row-parsing block with unified strategy ============
start_marker = "  // Parse each subsequent row until we hit a footer or empty section"
end_marker = "function showPasteAccurateDialog(type, opts = {}) {"
assert text.count(start_marker) == 1, f"Surgery 3: start marker count = {text.count(start_marker)}"
assert text.count(end_marker) == 1, f"Surgery 3: end marker count = {text.count(end_marker)}"
si = text.index(start_marker)
ei = text.index(end_marker)
assert si < ei, "Surgery 3: start after end?"

new_block = r'''  // Parse data rows — unified strategy (works for multi-space Excel/PDF-layout pastes
  // AND single-space plain pastes):
  //   1. Grab the trailing numeric run (rightmost numeric tokens, max 8)
  //   2. Map numbers to fields: header-guided if counts match, else positional heuristics
  //   3. Prefix tokens = kode | nama... | satuan (first / middle / last)
  //   4. Wrapped item names (row split across 2 lines) merged via pendingName
  const isNumTok = (t) => /^[\d.,]+$/.test(t) && /\d/.test(t);
  const items = [];
  let skipped = 0;
  let pendingName = "";
  const MUT_FIELDS = ["awalQty","awalNilai","masukQty","masukNilai","keluarQty","keluarNilai"];
  for (let i = (headerIdx >= 0 ? headerIdx + 1 : 0); i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (isAccurateHeaderOrFooter(trimmed)) { pendingName = ""; continue; }
    if (/^total/i.test(trimmed)) { pendingName = ""; continue; }

    const tokens = trimmed.split(/\s+/);
    const nums = [];
    let endIdx = tokens.length - 1;
    while (nums.length < 8 && endIdx >= 0 && isNumTok(tokens[endIdx])) {
      nums.unshift(parseAccurateNumber(tokens[endIdx]));
      endIdx--;
    }
    if (nums.length < 2) {
      // Baris tanpa angka → kemungkinan lanjutan nama item yang wrap ke bawah
      pendingName = (pendingName ? pendingName + " " : "") + trimmed;
      continue;
    }

    // Map the grabbed numbers to fields
    const vals = {};
    if (numFieldList.length > 0 && nums.length === numFieldList.length) {
      // Header-guided mapping (left-to-right, 1:1)
      numFieldList.forEach((f, j) => { vals[f] = nums[j]; });
    } else if (nums.length >= 6) {
      // Full mutasi: [awalQty, awalNilai, masukQty, masukNilai, keluarQty, keluarNilai, (akhirQty, akhirNilai)]
      vals.awalQty = nums[0]; vals.awalNilai = nums[1];
      vals.masukQty = nums[2]; vals.masukNilai = nums[3];
      vals.keluarQty = nums[4]; vals.keluarNilai = nums[5];
      // extra trailing numbers (akhir) ignored — app recomputes akhir = awal + masuk - keluar
    } else {
      // Exactly 2 numbers → snapshot (Daftar Nilai Persediaan)
      // Documented behavior: masuk = akhir, awal = 0, keluar = 0 → computed akhir = masuk
      vals.masukQty = nums[0]; vals.masukNilai = nums[1];
    }
    // Snapshot via header mapping (only akhir columns matched) → shift akhir to masuk
    const hasMut = MUT_FIELDS.some(f => vals[f] !== undefined);
    if (!hasMut) {
      if (vals.akhirQty !== undefined) vals.masukQty = vals.akhirQty;
      if (vals.akhirNilai !== undefined) vals.masukNilai = vals.akhirNilai;
    }

    // Prefix tokens: first = kode, last = satuan, middle = nama
    const rest = tokens.slice(0, endIdx + 1);
    const fullPrefix = (pendingName ? pendingName + " " : "") + rest.join(" ");
    pendingName = "";
    const fullTokens = fullPrefix.split(/\s+/);
    if (fullTokens.length < 2) { skipped++; continue; }
    const kode = fullTokens[0];
    const satuan = fullTokens[fullTokens.length - 1];
    const nama = fullTokens.slice(1, -1).join(" ").trim() || kode;

    const item = {
      kode, nama, satuan,
      awalQty: 0, awalNilai: 0,
      masukQty: 0, masukNilai: 0,
      keluarQty: 0, keluarNilai: 0,
    };
    MUT_FIELDS.forEach(f => { if (vals[f] !== undefined) item[f] = vals[f]; });
    items.push(item);
  }
  console.log(`Persediaan parser: ${items.length} items, ${skipped} skipped, numFields=[${numFieldList.join(",")}]`);
  return items;
}

'''
text = text[:si] + new_block + text[ei:]
print("✓ Surgery 3: unified trailing-numeric row parser installed")

# ============ Surgery 4: append mode merges by KODE for persediaan ============
old4 = '''      const existing = getPersediaanData(month);
      let newData;
      if (mode === "replace") newData = parsedTxs.slice();
      else newData = existing.concat(parsedTxs);
      savePersediaanData(month, newData);
      const totalNilai = parsedTxs.reduce((s, r) => s + (r.masukNilai || 0) - (r.keluarNilai || 0), 0);'''
new4 = '''      const existing = getPersediaanData(month);
      let newData;
      if (mode === "replace") {
        newData = parsedTxs.slice();
      } else {
        // Append dengan merge by KODE: item yang sudah ada di-update, item baru ditambahkan
        newData = existing.slice();
        parsedTxs.forEach(p => {
          const idx = newData.findIndex(e => e.kode === p.kode);
          if (idx >= 0) newData[idx] = p;
          else newData.push(p);
        });
      }
      savePersediaanData(month, newData);'''
assert text.count(old4) == 1, f"Surgery 4 failed: save block count = {text.count(old4)}"
text = text.replace(old4, new4)
print("✓ Surgery 4: append mode merges by KODE")

# ============ Surgery 5: update tips text ============
old5 = '''    tips = "Format Persediaan: tabular dengan header row. Parser auto-detect kolom (case-insensitive). Jika hanya ada AKHIR QTY + NILAI (snapshot), akan dianggap saldo akhir → set masuk=akhir, awal=0, keluar=0 (akhir komputasi = akhir input).";'''
new5 = '''    tips = "Format Persediaan: tabular per item — KODE, NAMA BARANG, SATUAN, lalu pasangan angka QTY+NILAI untuk Saldo Awal / Masuk / Keluar / Akhir. Parser auto-detect header & format Indonesia (koma=desimal, titik=ribuan). Snapshot yang hanya punya QTY+NILAI dianggap saldo akhir (masuk=akhir). Mode Append menggabungkan berdasarkan KODE: item lama di-update, item baru ditambahkan. Nama item yang wrap ke baris kedua otomatis digabung.";'''
if text.count(old5) == 1:
    text = text.replace(old5, new5)
    print("✓ Surgery 5: tips text updated")
else:
    print(f"⚠ Surgery 5 skipped: tips text count = {text.count(old5)} (non-critical)")

# ============ Surgery 6: dynamic append option label ============
old6 = '''              <option value="append">Append (tambah ke data lama)</option>'''
new6 = '''              <option value="append">${isPers ? "Append (gabung per KODE)" : "Append (tambah ke data lama)"}</option>'''
if text.count(old6) == 1:
    text = text.replace(old6, new6)
    print("✓ Surgery 6: append option label dynamic")
else:
    print(f"⚠ Surgery 6 skipped: option label count = {text.count(old6)} (non-critical)")

HTML.write_text(text, encoding="utf-8")
print(f"\n✓ Done! HTML size: {orig_len:,} → {len(text):,} bytes")
