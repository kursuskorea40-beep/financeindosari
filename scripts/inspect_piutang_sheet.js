// Inspect "Piutang & Utang" sheet data: rows 5-21 and 36-53, cols A-H
const fs = require("fs");
const html = fs.readFileSync("/home/z/my-project/download/INDOSARI_Akuntansi_2026_perbulan.html", "utf8");
// Extract COMBINED JSON (single line starting with "const COMBINED = ")
const m = html.match(/const COMBINED = (\{.*?\});\n/s);
if (!m) { console.log("COMBINED not found"); process.exit(1); }
const C = JSON.parse(m[1]);
const sheet = C.excelSheets.renderSheets["Piutang & Utang"];
if (!sheet) { console.log("Sheet not found. Available:", Object.keys(C.excelSheets.renderSheets)); process.exit(1); }
function colName(i) { let s=""; i++; while(i>0){ let r=(i-1)%26; s=String.fromCharCode(65+r)+s; i=Math.floor((i-1)/26);} return s; }
function showRow(rIdx) { // rIdx 1-based
  const row = sheet[rIdx-1] || [];
  const cells = [];
  for (let c=0; c<8; c++) {
    const cell = row[c];
    if (!cell) { cells.push(""); continue; }
    cells.push(`${colName(c)}${rIdx}=${JSON.stringify(cell.value)}`);
  }
  return cells.filter(Boolean).join(" | ");
}
console.log("=== PIUTANG section (rows 5-21) ===");
for (let r=5; r<=21; r++) console.log(showRow(r));
console.log("\n=== TUNAI vs KREDIT section (rows 21-35) ===");
for (let r=21; r<=35; r++) console.log(showRow(r));
console.log("\n=== UTANG section (rows 36-53) ===");
for (let r=36; r<=53; r++) console.log(showRow(r));
console.log("\nsheet length:", sheet.length);
