// Tiny CSV helpers for clients-dashboard tabs.
// Extracted from campaigns-tab.tsx so other tabs (history, etc.) can reuse the
// exact same BOM-prefixed UTF-8 CSV format that Excel renders correctly for
// Hebrew text.

export interface CsvColumn<T> {
  label: string;
  // Raw value as a string — no number formatting, no localization. CSV consumers
  // (Excel, Google Sheets) handle their own formatting.
  raw: (row: T) => string;
}

function csvCell(v: string): string {
  if (/[",\n]/.test(v)) {
    return '"' + v.replace(/"/g, '""') + '"';
  }
  return v;
}

export function rowsToCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const head = columns.map((c) => csvCell(c.label)).join(',');
  const lines = rows.map((r) => columns.map((c) => csvCell(c.raw(r))).join(','));
  return [head, ...lines].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  // Prepend BOM so Excel renders Hebrew correctly.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
