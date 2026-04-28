import type { AdCreativeRow } from "@/lib/ads/types/ad";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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
  return text.length > maxLen ? esc(text.slice(0, maxLen)) + "…" : esc(text);
}

// ---------------------------------------------------------------------------
// Build the full HTML
// ---------------------------------------------------------------------------
export interface BuildCatalogHtmlOptions {
  ads: AdCreativeRow[];
  accountName: string;
  dateRange: { since: string; until: string };
  currency?: string;
}

export function buildCatalogHtml(
  options: BuildCatalogHtmlOptions,
  mediaMap: Map<string, string>,
  logoBase64: string | null,
  fontBase64: string,
): string {
  const { ads, accountName, dateRange } = options;

  // Table rows
  const rows = ads.map((ad) => {
    const imgSrc = mediaMap.get(ad.adId);
    const fbLink = ad.previewUrl ? esc(ad.previewUrl) : `https://www.facebook.com/ads/library/?id=${encodeURIComponent(ad.adId)}`;

    return `
    <tr>
      <td class="thumb-cell">
        ${imgSrc
          ? `<img class="thumb" src="${imgSrc}" />`
          : `<div class="thumb-placeholder"></div>`
        }
      </td>
      <td class="name-cell">
        <div class="cell-bold">${truncate(ad.adName, 50)}</div>
        <div class="cell-muted">${truncate(ad.campaignName, 45)}</div>
      </td>
      <td class="copy-cell">${truncate(ad.adCopy, 100)}</td>
      <td class="link-cell">
        <a class="fb-link" href="${fbLink}" target="_blank">צפייה בפייסבוק</a>
      </td>
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
  font-size: 9pt;
  color: #1a1a1a;
  background: #f7f7f5;
  direction: rtl;
}
@page {
  size: A4 portrait;
  margin: 36px 32px 50px 32px;
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e5e5e0;
}
.header-info { text-align: right; }
.header-title {
  font-size: 15pt;
  font-weight: 700;
  color: #1a1a1a;
}
.header-sub {
  font-size: 8pt;
  color: #8a877f;
  margin-top: 3px;
}
.header-logo { text-align: left; }
.header-logo img {
  width: 64px;
  height: auto;
  object-fit: contain;
}

/* Table */
table {
  width: 100%;
  border-collapse: collapse;
  background: #ffffff;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e5e0;
}
thead { background: #f7f7f5; }
thead th {
  font-size: 8pt;
  font-weight: 600;
  color: #555550;
  padding: 8px 10px;
  text-align: right;
  border-bottom: 1px solid #e5e5e0;
}
tbody tr {
  border-bottom: 1px solid #eeeeea;
}
tbody tr:last-child {
  border-bottom: none;
}
td {
  padding: 6px 10px;
  vertical-align: middle;
  font-size: 8pt;
  color: #1a1a1a;
}

/* Column widths */
.thumb-cell { width: 70px; text-align: center; }
.thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  display: block;
  margin: 0 auto;
}
.thumb-placeholder {
  width: 60px;
  height: 60px;
  background: #eeeeea;
  border-radius: 6px;
  margin: 0 auto;
}
.name-cell { width: 160px; text-align: right; }
.copy-cell { text-align: right; line-height: 1.5; color: #555550; }
.link-cell { width: 100px; text-align: center; }

.cell-bold {
  font-size: 8.5pt;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.4;
}
.cell-muted {
  font-size: 7pt;
  color: #8a877f;
  margin-top: 2px;
}

.fb-link {
  display: inline-block;
  font-size: 7.5pt;
  color: #2563a0;
  text-decoration: none;
  background: #e8f0fa;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 500;
}
.fb-link:hover { text-decoration: underline; }
</style>
</head>
<body>

<div class="header">
  <div class="header-info">
    <div class="header-title">${esc(accountName)} — קטלוג מודעות</div>
    <div class="header-sub">${esc(dateRange.since)} – ${esc(dateRange.until)} · ${ads.length} מודעות</div>
  </div>
  <div class="header-logo">
    ${logoBase64 ? `<img src="${logoBase64}" alt="logo" />` : ""}
    <div class="header-sub">Generated: ${new Date().toLocaleDateString()}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th class="thumb-cell">תמונה</th>
      <th class="name-cell">שם המודעה</th>
      <th class="copy-cell">קופי</th>
      <th class="link-cell">קישור</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>

</body>
</html>`;
}
