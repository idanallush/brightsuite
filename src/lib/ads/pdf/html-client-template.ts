import type { AdCreativeRow } from "@/lib/ads/types/ad";
import { ALL_METRICS } from "@/lib/ads/types/metrics";

// ---------------------------------------------------------------------------
// Hebrew metric labels
// ---------------------------------------------------------------------------
const HEB_LABELS: Record<string, string> = {
  spend: "\u05D4\u05D5\u05E6\u05D0\u05D4",
  clicks: "\u05D4\u05E7\u05DC\u05E7\u05D5\u05EA",
  ctr: "CTR",
  leads: "\u05DC\u05D9\u05D3\u05D9\u05DD",
  cpl: "\u05E2\u05DC\u05D5\u05EA \u05DC\u05D9\u05D3",
  purchases: "\u05E8\u05DB\u05D9\u05E9\u05D5\u05EA",
  revenue: "\u05D4\u05DB\u05E0\u05E1\u05D5\u05EA",
  roas: "ROAS",
  cpa: "\u05E2\u05DC\u05D5\u05EA \u05E8\u05DB\u05D9\u05E9\u05D4",
  impressions: "\u05D7\u05E9\u05D9\u05E4\u05D5\u05EA",
  reach: "\u05D8\u05D5\u05D5\u05D7 \u05D4\u05D2\u05E2\u05D4",
  cpm: "\u05E2\u05DC\u05D5\u05EA \u05DC-1000 \u05D7\u05E9\u05D9\u05E4\u05D5\u05EA",
};

// ---------------------------------------------------------------------------
// Currency helpers
// ---------------------------------------------------------------------------
const CUR: Record<string, string> = {
  USD: "$", EUR: "\u20AC", GBP: "\u00A3", ILS: "\u20AA",
  JPY: "\u00A5", CAD: "C$", AUD: "A$", CHF: "CHF ", BRL: "R$",
};

function sym(c: string) { return CUR[c] || c + " "; }

function fmt(v: number | null | undefined, f: string, c: string = "USD"): string {
  if (v === null || v === undefined) return "-";
  switch (f) {
    case "currency": return `${sym(c)}${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function truncate(t: string | null | undefined, n: number): string {
  if (!t) return "\u2014";
  return t.length > n ? esc(t.slice(0, n)) + "\u2026" : esc(t);
}

// ---------------------------------------------------------------------------
// Dynamic default metrics — detect ecommerce vs lead gen
// ---------------------------------------------------------------------------
function detectDefaultMetrics(ads: AdCreativeRow[]): string[] {
  const hasPurchases = ads.some(ad => (ad.metrics.purchases ?? 0) > 0);
  const hasLeads = ads.some(ad => (ad.metrics.leads ?? 0) > 0);
  if (hasPurchases && !hasLeads) {
    return ["spend", "clicks", "ctr", "purchases", "revenue", "roas", "cpa"];
  }
  return ["spend", "clicks", "ctr", "leads", "cpl"];
}

// ---------------------------------------------------------------------------
// Build the full HTML — A4 Landscape, 1 ad per page
// ---------------------------------------------------------------------------
export interface BuildClientHtmlOptions {
  ads: AdCreativeRow[];
  visibleMetrics: string[];
  accountName: string;
  dateRange: { since: string; until: string };
  title?: string;
  preparedBy?: string;
  currency?: string;
}

export function buildClientHtml(
  options: BuildClientHtmlOptions,
  mediaMap: Map<string, string>,
  logoBase64: string | null,
  fontBase64: string,
): string {
  const { ads, visibleMetrics, accountName, dateRange, currency = "USD" } = options;

  const effective = visibleMetrics.length > 0 ? visibleMetrics : detectDefaultMetrics(ads);

  const resolved = effective
    .map((key) => {
      const def = ALL_METRICS.find((m) => m.key === key);
      if (!def) return null;
      return { key: def.key, label: HEB_LABELS[def.key] || def.label, format: def.format as string };
    })
    .filter((m): m is { key: string; label: string; format: string } => m !== null);

  const totalPages = ads.length;
  const pagesHtml = ads.map((ad, idx) =>
    buildPage(ad, mediaMap, currency, resolved, logoBase64, accountName, dateRange, idx + 1, totalPages)
  ).join("\n");

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
  color: #111111;
  background: #FFFFFF;
  direction: rtl;
}
@page {
  size: A4 landscape;
  margin: 0;
}

/* ── Page container — A4 landscape ── */
.page {
  width: 842px;
  height: 595px;
  page-break-after: always;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #FFFFFF;
  position: relative;
}
.page:last-child { page-break-after: auto; }

/* ── HEADER — 40px ── */
.hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-direction: row-reverse;
  height: 40px;
  flex-shrink: 0;
  padding: 8px 32px;
  border-bottom: 3px solid #FFDF4F;
  background: #FFFFFF;
}
.hdr-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hdr-right img { height: 22px; width: auto; }
.hdr-subtitle {
  font-size: 9px;
  color: #999999;
}
.hdr-left {
  font-size: 9px;
  color: #999999;
  text-align: left;
  direction: ltr;
}

/* ── CONTENT AREA ── */
.content {
  flex: 1;
  padding: 28px 28px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Ad info rows */
.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-direction: row-reverse;
}
.info-icon {
  font-size: 10px;
  flex-shrink: 0;
  width: 14px;
  text-align: center;
}
.info-text {
  font-size: 9px;
  color: #666666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.badge-objective {
  font-size: 7px;
  font-weight: 600;
  background: #FFDF4F;
  color: #111111;
  padding: 2px 8px;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}
.badge-media {
  font-size: 7px;
  font-weight: 600;
  background: #111111;
  color: #FFFFFF;
  padding: 2px 8px;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}

/* Ad name */
.ad-name {
  font-size: 20px;
  font-weight: 700;
  color: #111111;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: right;
  margin-top: 8px;
  margin-bottom: 12px;
}

/* ── Two-column layout ── */
.two-col {
  display: flex;
  flex-direction: row-reverse;
  gap: 24px;
  flex: 1;
  min-height: 0;
}

/* Left column — Image */
.col-img {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}
.img-container {
  width: 280px;
  height: 280px;
  background: #F5F5F5;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.img-container img.main-img {
  width: 100%;
  height: 100%;
  object-fit: contain;  /* show full image without cropping */
}
.img-placeholder {
  color: #999999;
  font-size: 11px;
}
.thumb-row {
  display: flex;
  flex-direction: row-reverse;
  gap: 6px;
  margin-top: 8px;
}
.thumb-row img {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  background: #F5F5F5;
}
.fb-preview-btn {
  display: block;
  text-align: center;
  background: #1877F2;
  color: #FFFFFF;
  font-size: 8.5pt;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 5px;
  text-decoration: none;
  margin: 6px 8px 8px 8px;
  flex-shrink: 0;
}

/* Right column — Content */
.col-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: right;
  direction: rtl;
}
.copy-label {
  font-size: 9px;
  color: #999999;
  font-weight: 600;
  margin-bottom: 4px;
}
.copy-box {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.copy-text {
  font-size: 9px;
  color: #333333;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.headline-cta-row {
  display: flex;
  flex-direction: row-reverse;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  flex-shrink: 0;
}
.headline-val {
  font-size: 13px;
  font-weight: 700;
  color: #111111;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cta-btn {
  font-size: 8px;
  font-weight: 600;
  background: #E4E6EB;
  color: #111111;
  padding: 5px 14px;
  border-radius: 4px;
  border: none;
  white-space: nowrap;
  text-decoration: none;
  flex-shrink: 0;
}

/* ── METRICS BAR — 80px ── */
.metrics-bar {
  flex-shrink: 0;
  display: flex;
  flex-direction: row-reverse;
  height: 80px;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  margin-top: 20px;
  overflow: hidden;
}
.m-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px 0;
  border-left: 1px solid #E5E7EB;
  text-align: center;
}
.m-box:last-child { border-left: none; }
.m-label {
  font-size: 8px;
  color: #999999;
  margin-bottom: 4px;
}
.m-value {
  font-size: 20px;
  font-weight: 700;
  color: #111111;
  direction: ltr;
}
.m-value.empty {
  color: #D1D5DB;
}

/* ── FOOTER — 24px ── */
.ftr {
  flex-shrink: 0;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 32px;
  border-top: 1px solid #E5E7EB;
  font-size: 7px;
  color: #999999;
  direction: ltr;
}
</style>
</head>
<body>

${pagesHtml}

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Build a single page for one ad
// ---------------------------------------------------------------------------
function buildPage(
  ad: AdCreativeRow,
  media: Map<string, string>,
  cur: string,
  met: { key: string; label: string; format: string }[],
  logoBase64: string | null,
  accountName: string,
  dateRange: { since: string; until: string },
  pageNum: number,
  totalPages: number,
): string {
  // Resolve main image
  const isCarousel = ad.mediaType === "CAROUSEL" && ad.carouselCards && ad.carouselCards.length > 0;
  const cards = ad.carouselCards || [];

  const mainSrc = isCarousel
    ? media.get(`${ad.adId}_0`) || media.get(ad.adId)
    : media.get(ad.adId);

  // Thumbnails
  const thumbs: string[] = [];
  if (isCarousel) {
    // Carousel: show card images as thumbnails (skip first since it's the main)
    for (let i = 1; i < cards.length && thumbs.length < 6; i++) {
      const src = media.get(`${ad.adId}_${i}`);
      if (src) thumbs.push(src);
    }
  }

  // Ad copy — max 1000 chars
  const rawCopy = ad.adCopy || "";
  const copyText = rawCopy.length > 1000 ? esc(rawCopy.slice(0, 1000)) + "\u2026" : esc(rawCopy);

  // Metrics boxes
  const metricBoxes = met.slice(0, 7).map((m) => {
    const raw = ad.metrics[m.key] as number | null | undefined;
    const val = fmt(raw, m.format, cur);
    const isEmpty = raw === null || raw === undefined;
    return `
      <div class="m-box">
        <div class="m-label">${esc(m.label)}</div>
        <div class="m-value${isEmpty ? " empty" : ""}">${val}</div>
      </div>`;
  }).join("");

  const previewLink = ad.previewUrl ? esc(ad.previewUrl) : "";

  return `
<div class="page">
  <!-- Header -->
  <div class="hdr">
    <div class="hdr-right">
      ${logoBase64 ? `<img src="${logoBase64}" alt="Bright" />` : ""}
      <span class="hdr-subtitle">\u05E7\u05E8\u05D9\u05D0\u05D9\u05D9\u05D8\u05D9\u05D1\u05D9\u05DD \u05E4\u05E2\u05D9\u05DC\u05D9\u05DD</span>
    </div>
    <div class="hdr-left">${esc(accountName)} &nbsp;|&nbsp; ${esc(dateRange.since)} &ndash; ${esc(dateRange.until)}</div>
  </div>

  <!-- Content -->
  <div class="content">
    <!-- Ad info rows -->
    <div class="info-row">
      <span class="info-icon">\u25C6</span>
      <span class="info-text">${truncate(ad.campaignName, 80)}</span>
      ${ad.objective ? `<span class="badge-objective">${esc(ad.objective)}</span>` : ""}
    </div>
    <div class="info-row">
      <span class="info-icon">\u25CF</span>
      <span class="info-text">${truncate(ad.adsetName, 80)}</span>
      <span class="badge-media">${esc(ad.mediaType)}</span>
    </div>

    <!-- Ad name -->
    <div class="ad-name">${truncate(ad.adName, 60)}</div>

    <!-- Two-column layout -->
    <div class="two-col">
      <!-- Image column -->
      <div class="col-img">
        <div class="img-container">
          ${mainSrc
            ? `<img class="main-img" src="${mainSrc}" />`
            : `<div class="img-placeholder">\u05D0\u05D9\u05DF \u05EA\u05DE\u05D5\u05E0\u05D4</div>`
          }
        </div>
        ${thumbs.length > 0 ? `
        <div class="thumb-row">
          ${thumbs.map((src) => `<img src="${src}" />`).join("")}
        </div>` : ""}
        ${previewLink ? `<a class="fb-preview-btn" href="${previewLink}" target="_blank">\uD83D\uDC41 \u05E6\u05E4\u05D9\u05D9\u05D4 \u05D1\u05E4\u05D9\u05D9\u05E1\u05D1\u05D5\u05E7</a>` : ""}
      </div>

      <!-- Content column -->
      <div class="col-content">
        ${rawCopy ? `
        <div class="copy-label">\u05E7\u05D5\u05E4\u05D9:</div>
        <div class="copy-box">
          <div class="copy-text">${copyText}</div>
        </div>` : ""}

        <div class="headline-cta-row">
          <div class="headline-val">${truncate(ad.headline, 80)}</div>
          ${ad.callToAction ? `<span class="cta-btn">${esc(ad.callToAction.replace(/_/g, " "))}</span>` : ""}
        </div>
      </div>
    </div>

    <!-- Metrics Bar -->
    <div class="metrics-bar">
      ${metricBoxes}
    </div>
  </div>

  <!-- Footer -->
  <div class="ftr">
    <span>Page ${pageNum} of ${totalPages}</span>
    <span>www.b-bright.co.il</span>
    <span>Bright | Leading the Way to Success</span>
  </div>
</div>`;
}
