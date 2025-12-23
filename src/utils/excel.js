import * as XLSX from "xlsx";

export function downloadAsXlsx({ rows, columns, filename }){
  const header = columns.map(c => c.label);
  const data = rows.map(r => columns.map(c => r?.[c.key] ?? ""));
  const aoa = [header, ...data];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "NET-IP");

  XLSX.writeFile(wb, filename || "net-ip.xlsx");
}

export async function readXlsxFile(file){
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const [headerRow, ...body] = aoa;
  const headers = (headerRow || []).map(h => String(h).trim());
  const rows = body
    .filter(r => Array.isArray(r) && r.some(v => String(v).trim() != ""))
    .map(r => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = r[i] ?? ""; });
      return obj;
    });

  return { headers, rows };
}
