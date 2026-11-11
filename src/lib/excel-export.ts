import * as XLSX from "xlsx";
interface ColumnDef { header: string; key: string; width?: number; format?: (val: any, row: any) => string | number; }
interface ExportOptions { filename?: string; sheetName?: string; title?: string; columns?: ColumnDef[]; }
export function exportToExcel(data: any[], options: ExportOptions = {}) {
  const { filename = `export-${new Date().toISOString().slice(0, 10)}.xlsx`, sheetName = "Sheet1", title, columns } = options;
  const cols: ColumnDef[] = columns || (data.length > 0 ? Object.keys(data[0]).map(k => ({ header: k, key: k, width: Math.max(12, k.length + 2) })) : []);
  const aoa: (string | number)[][] = [];
  if (title) { aoa.push([title]); aoa.push([]); }
  aoa.push(cols.map(c => c.header));
  for (const row of data) { aoa.push(cols.map(c => { const val = c.format ? c.format(row[c.key], row) : row[c.key]; if (val === null || val === undefined) return ""; if (typeof val === "number") return val; return String(val); })); }
  const ws = XLSX.utils.aoa_to_sheet(aoa); ws["!cols"] = cols.map(c => ({ wch: c.width || 12 }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, sheetName); XLSX.writeFile(wb, filename);
}
export async function importFromExcel(file: File) {
  const data = await file.arrayBuffer(); const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]]; const json = XLSX.utils.sheet_to_json<any>(ws, { header: 1, defval: "" });
  if (json.length < 2) return { rows: [], headers: [], rowCount: 0 };
  const headers = (json[0] as any[]).map(h => String(h || "").trim()); const rows: any[] = [];
  for (let i = 1; i < json.length; i++) { const row: any = {}; let hasData = false;
    headers.forEach((h, idx) => { const val = (json[i] as any[])[idx]; row[h] = val; if (val !== "" && val !== null && val !== undefined) hasData = true; });
    if (hasData) rows.push(row); }
  return { rows, headers, rowCount: rows.length };
}
