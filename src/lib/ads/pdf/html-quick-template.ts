import type { AdCreativeRow } from "@/lib/ads/types/ad";
import { ALL_METRICS, type MetricDefinition } from "@/lib/ads/types/metrics";

// ---------------------------------------------------------------------------
// Currency helpers (shared with client template)
// ---------------------------------------------------------------------------
const CUR: Record<string, string> = {
  USD: "$", EUR: "\u20AC", GBP: "\u00A3", ILS: "\u20AA",
  JPY: "\u00A5", CAD: "C$", AUD: "A$", CHF: "CHF ", BRL: "R$",
};

function getCurrencySymbol(c: string): string { return CUR[c] || c + " "; }

function formatValue(v: number | null | undefined, f: string, c: string = "USD"): string {
  if (v === null || v === undefined) return "-";
  switch (f) {
    case "currency": return `${getCurrencySymbol(c)}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "percent": return `${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    case "decimal": return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case "number": return Math.round(v).toLocaleString("en-US");
    default: return String(v);
  }
}

function esc(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(text: string | null | undefined, maxLen: number): string {
  if (!text) return "-";
  return text.length > maxLen ? esc(text.slice(0, maxLen)) + "\u2026" : esc(text);
}

// ---------------------------------------------------------------------------
// Build the full HTML
// ---------------------------------------------------------------------------
export interface BuildQuickHtmlOptions {
  ads: AdCreativeRow[];
  visibleMetrics: string[];
  accountName: string;
  dateRange: { since: string; until: string };
  currency?: string;
}

export function buildQuickHtml(
  options: BuildQuickHtmlOptions,
  mediaMap: Map<string, string>,
  logoBase64: string | null,
  fontBase64: string,
): string {
  const { ads, visibleMetrics, accountName, dateRange, currency = "USD" } = options;

  const metrics = visibleMetrics
    .map((key) => ALL_METRICS.find((m) => m.key === key))
    .filter((m): m is MetricDefinition => m !== undefined);

  // Table header
  const headerCells = metrics.map((m) =>
    `<th class="metric-cell">${esc(m.label)}</th>`
  ).join("");

  // Table rows
  const rows = ads.map((ad) => {
    const imgSrc = mediaMap.get(ad.adId);
    const metricCells = metrics.map((m) =>
      `<td class="metric-cell">${formatValue(ad.metrics[m.key] as number | null, m.format, currency)}</td>`
    ).join("");

    return `
    <tr>
      <td class="thumb-cell">
        ${imgSrc
          ? `<img class="thumb" src="${imgSrc}" />`
          : `<div class="thumb-placeholder"></div>`
        }
      </td>
      <td class="name-cell">
        <div class="cell-bold">${truncate(ad.adName, 40)}</div>
        <div class="cell-muted">${truncate(ad.campaignName, 40)}</div>
      </td>
      <td class="copy-cell">${truncate(ad.adCopy, 110)}</td>
      <td class="type-cell"><span class="type-badge">${esc(ad.mediaType)}</span></td>
      <td class="obj-cell">${esc(ad.objective)}</td>
      ${metricCells}
    </tr>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
@font-face {
  font-family: 'Heebo';
  src: url(data:font/truetype;base64,${fontBase64}) format('truetype');
  font-weight: 100 900;
  font-style: normal;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  font-family: 'Heebo', sans-serif;
  font-size: 8pt;
  color: #374151;
  background: #fff;
  direction: rtl;
}
@page {
  size: A4 landscape;
  margin: 30px;
}

/* Header */
.header {
  display: flex;
  flex-direction: row-reverse;
  justify-content: space-between;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid #FFC107;
}
.header-title { font-size: 14pt; font-weight: bold; color: #111827; text-align: right; }
.header-sub { font-size: 8pt; color: #6b7280; margin-top: 3px; text-align: right; }
.header-right { text-align: left; }
.header-right img { width: 60px; height: 22px; object-fit: contain; margin-bottom: 4px; }

/* Table */
table { width: 100%; border-collapse: collapse; }
thead { background: #f9fafb; }
thead th {
  font-size: 7pt; font-weight: bold; color: #111827;
  padding: 4px 3px; text-align: right; border-bottom: 1px solid #e5e7eb;
}
thead th.metric-cell { text-align: left; }
tbody tr { border-bottom: 0.5px solid #e5e7eb; }
td { padding: 3px; vertical-align: middle; font-size: 7pt; }

/* Column widths */
.thumb-cell { width: 48px; }
.thumb { width: 40px; height: 40px; object-fit: cover; border-radius: 3px; display: block; }
.thumb-placeholder { width: 40px; height: 40px; background: #f3f4f6; border-radius: 3px; }
.name-cell { width: 110px; text-align: right; }
.copy-cell { width: 140px; text-align: right; }
.type-cell { width: 48px; text-align: center; }
.obj-cell { width: 60px; text-align: right; }
.metric-cell { width: 62px; text-align: left; direction: ltr; }

.cell-bold { font-size: 7pt; font-weight: bold; color: #111827; }
.cell-muted { font-size: 6pt; color: #9ca3af; }
.type-badge {
  font-size: 6pt; background: #f3f4f6; padding: 2px 4px;
  border-radius: 2px; color: #374151; display: inline-block;
}
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="header-title">Bright | ${esc(accountName)} \u2014 Active Creatives</div>
    <div class="header-sub">${esc(dateRange.since)} to ${esc(dateRange.until)} \u00B7 ${ads.length} ${ads.length === 1 ? "ad" : "ads"}</div>
  </div>
  <div class="header-right">
    ${logoBase64 ? `<img src="${logoBase64}" alt="logo" />` : ""}
    <div class="header-sub">Generated: ${new Date().toLocaleDateString()}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th class="thumb-cell"></th>
      <th class="name-cell">Ad Name</th>
      <th class="copy-cell">Ad Copy</th>
      <th class="type-cell">Type</th>
      <th class="obj-cell">Objective</th>
      ${headerCells}
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>

</body>
</html>`;
}
