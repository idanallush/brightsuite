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
  cpc: "\u05E2\u05DC\u05D5\u05EA \u05DC\u05D4\u05E7\u05DC\u05E7\u05D4",
  frequency: "\u05EA\u05D3\u05D9\u05E8\u05D5\u05EA",
  cost_per_result: "\u05E2\u05DC\u05D5\u05EA \u05DC\u05EA\u05D5\u05E6\u05D0\u05D4",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const CUR: Record<string, string> = {
  USD: "$", EUR: "\u20AC", GBP: "\u00A3", ILS: "\u20AA",
  JPY: "\u00A5", CAD: "C$", AUD: "A$", CHF: "CHF ", BRL: "R$",
};

function sym(c: string) { return CUR[c] || c + " "; }

function fmt(v: number | null | undefined, f: string, c: string = "USD"): string {
  if (v === null || v === undefined) return "\u2013";
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
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function truncate(t: string | null | undefined, n: number): string {
  if (!t) return "\u2014";
  return t.length > n ? esc(t.slice(0, n)) + "\u2026" : esc(t);
}

function detectDefaultMetrics(ads: AdCreativeRow[]): string[] {
  const hasPurchases = ads.some(ad => (ad.metrics.purchases ?? 0) > 0);
  const hasLeads = ads.some(ad => (ad.metrics.leads ?? 0) > 0);
  if (hasPurchases && !hasLeads) return ["spend", "clicks", "ctr", "purchases", "revenue", "roas", "cpa"];
  return ["spend", "clicks", "ctr", "leads", "cpl"];
}

function resolveMetrics(visibleMetrics: string[], allAds: AdCreativeRow[]) {
  const effective = visibleMetrics.length > 0 ? visibleMetrics : detectDefaultMetrics(allAds);
  return effective
    .map((key) => {
      const def = ALL_METRICS.find((m) => m.key === key);
      if (!def) return null;
      return { key: def.key, label: HEB_LABELS[def.key] || def.label, format: def.format as string };
    })
    .filter((m): m is { key: string; label: string; format: string } => m !== null);
}

function getFacebookLink(ad: AdCreativeRow): string {
  if (ad.previewUrl) return esc(ad.previewUrl);
  return `https://www.facebook.com/ads/library/?id=${ad.adId}`;
}

function buildMetricBoxes(resolved: { key: string; label: string; format: string }[], aggregatedMetrics: Record<string, number>, currency: string): string {
  return resolved.slice(0, 7).map((m) => {
    const raw = aggregatedMetrics[m.key] ?? null;
    const val = fmt(raw, m.format, currency);
    const isEmpty = raw === null || raw === undefined || raw === 0;
    return `
      <div class="m-box">
        <div class="m-label">${esc(m.label)}</div>
        <div class="m-value${isEmpty ? " empty" : ""}">${val}</div>
      </div>`;
  }).join("");
}

// ---------------------------------------------------------------------------
// Shared CSS for summary pages
// ---------------------------------------------------------------------------
function summaryCSS(fontBase64: string): string {
  return `
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
@page { size: A4 landscape; margin: 0; }

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

.hdr {
  display: flex; align-items: center; justify-content: space-between;
  flex-direction: row-reverse; height: 40px; flex-shrink: 0;
  padding: 8px 32px; border-bottom: 3px solid #FFDF4F; background: #FFFFFF;
}
.hdr-right { display: flex; align-items: center; gap: 8px; }
.hdr-right img { height: 22px; width: auto; }
.hdr-subtitle { font-size: 9px; color: #999999; }
.hdr-left { font-size: 9px; color: #999999; text-align: left; direction: ltr; }

.content { flex: 1; padding: 20px 28px; display: flex; flex-direction: column; overflow: hidden; }

.summary-title { font-size: 22px; font-weight: 700; color: #111111; text-align: right; margin-bottom: 4px; }
.summary-subtitle { font-size: 11px; color: #666666; text-align: right; margin-bottom: 2px; }
.summary-campaigns { font-size: 9px; color: #999999; text-align: right; margin-bottom: 14px; }

.two-col { display: flex; flex-direction: row-reverse; gap: 24px; flex: 1; min-height: 0; }

.col-img { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; }
.img-container {
  width: 280px; height: 240px; background: #F5F5F5; border-radius: 10px;
  overflow: hidden; display: flex; align-items: center; justify-content: center;
}
.img-container img.main-img { width: 100%; height: 100%; object-fit: contain; }
.img-placeholder { color: #999999; font-size: 11px; }
.img-caption { font-size: 8px; color: #999999; text-align: center; margin-top: 4px; }
.fb-link {
  display: block; text-align: center; background: #1877F2; color: #FFFFFF;
  font-size: 8.5pt; font-weight: bold; padding: 5px 12px; border-radius: 5px;
  text-decoration: none; margin: 6px 8px 0 8px; flex-shrink: 0;
}

.col-content {
  flex: 1; display: flex; flex-direction: column; min-width: 0;
  text-align: right; direction: rtl;
}
.copy-label { font-size: 9px; color: #999999; font-weight: 600; margin-bottom: 4px; }
.copy-box { border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px; flex: 1; min-height: 0; overflow: hidden; }
.copy-text { font-size: 9px; color: #333333; line-height: 1.6; white-space: pre-wrap; word-break: break-word; }
.headline-cta-row {
  display: flex; flex-direction: row-reverse; align-items: center;
  justify-content: space-between; gap: 8px; margin-top: 10px; flex-shrink: 0;
}
.headline-val { font-size: 13px; font-weight: 700; color: #111111; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cta-btn {
  font-size: 8px; font-weight: 600; background: #E4E6EB; color: #111111;
  padding: 5px 14px; border-radius: 4px; border: none; white-space: nowrap; flex-shrink: 0;
}

.metrics-bar {
  flex-shrink: 0; display: flex; flex-direction: row-reverse;
  height: 80px; border: 1px solid #E5E7EB; border-radius: 10px;
  margin-top: 16px; overflow: hidden;
}
.m-box {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 12px 0; border-left: 1px solid #E5E7EB; text-align: center;
}
.m-box:last-child { border-left: none; }
.m-label { font-size: 8px; color: #999999; margin-bottom: 4px; }
.m-value { font-size: 20px; font-weight: 700; color: #111111; direction: ltr; }
.m-value.empty { color: #D1D5DB; }

.ftr {
  flex-shrink: 0; height: 28px; display: flex; align-items: center;
  justify-content: space-between; padding: 4px 32px;
  border-top: 1px solid #E5E7EB; font-size: 7px; color: #999999; direction: ltr;
}`;
}

// ---------------------------------------------------------------------------
// Build a single summary page HTML block
// ---------------------------------------------------------------------------
function buildSummaryPage(
  heroAd: AdCreativeRow,
  allAds: AdCreativeRow[],
  aggregatedMetrics: Record<string, number>,
  resolved: { key: string; label: string; format: string }[],
  mediaMap: Map<string, string>,
  logoBase64: string | null,
  accountName: string,
  dateRange: { since: string; until: string },
  currency: string,
  title: string,
  subtitle: string,
  footerNote: string,
): string {
  const uniqueCampaigns = [...new Set(allAds.map((a) => a.campaignName))];
  const campaignDisplay = uniqueCampaigns.length <= 3
    ? uniqueCampaigns.map((n) => esc(n)).join(" \u00B7 ")
    : uniqueCampaigns.slice(0, 3).map((n) => esc(n)).join(" \u00B7 ") + ` \u05D5\u05E2\u05D5\u05D3 ${uniqueCampaigns.length - 3}`;

  const isCarousel = heroAd.mediaType === "CAROUSEL" && heroAd.carouselCards && heroAd.carouselCards.length > 0;
  const mainSrc = isCarousel
    ? mediaMap.get(`${heroAd.adId}_0`) || mediaMap.get(heroAd.adId)
    : mediaMap.get(heroAd.adId);

  const rawCopy = heroAd.adCopy || "";
  const copyText = rawCopy.length > 800 ? esc(rawCopy.slice(0, 800)) + "\u2026" : esc(rawCopy);
  const metricBoxes = buildMetricBoxes(resolved, aggregatedMetrics, currency);
  const fbLink = getFacebookLink(heroAd);

  return `
<div class="page">
  <div class="hdr">
    <div class="hdr-right">
      ${logoBase64 ? `<img src="${logoBase64}" alt="Bright" />` : ""}
      <span class="hdr-subtitle">\u05D3\u05D5\u05D7 \u05D1\u05D9\u05E6\u05D5\u05E2\u05D9\u05DD \u05DE\u05E1\u05D5\u05DB\u05DD</span>
    </div>
    <div class="hdr-left">${esc(accountName)} &nbsp;|&nbsp; ${esc(dateRange.since)} &ndash; ${esc(dateRange.until)}</div>
  </div>

  <div class="content">
    <div class="summary-title">${title}</div>
    <div class="summary-subtitle">${subtitle}</div>
    <div class="summary-campaigns">${campaignDisplay}</div>

    <div class="two-col">
      <div class="col-img">
        <div class="img-container">
          ${mainSrc
            ? `<img class="main-img" src="${mainSrc}" />`
            : `<div class="img-placeholder">\u05D0\u05D9\u05DF \u05EA\u05DE\u05D5\u05E0\u05D4</div>`
          }
        </div>
        <div class="img-caption">\u05DE\u05D5\u05D3\u05E2\u05D4 \u05DE\u05D5\u05D1\u05D9\u05DC\u05D4 \u2014 ${truncate(heroAd.adName, 40)}</div>
        <a class="fb-link" href="${fbLink}" target="_blank">\u05E6\u05E4\u05D9\u05D9\u05D4 \u05D1\u05E4\u05D9\u05D9\u05E1\u05D1\u05D5\u05E7</a>
      </div>

      <div class="col-content">
        ${rawCopy ? `
        <div class="copy-label">\u05E7\u05D5\u05E4\u05D9:</div>
        <div class="copy-box">
          <div class="copy-text">${copyText}</div>
        </div>` : ""}
        <div class="headline-cta-row">
          <div class="headline-val">${truncate(heroAd.headline, 80)}</div>
          ${heroAd.callToAction ? `<span class="cta-btn">${esc(heroAd.callToAction.replace(/_/g, " "))}</span>` : ""}
        </div>
      </div>
    </div>

    <div class="metrics-bar">${metricBoxes}</div>
  </div>

  <div class="ftr">
    <span>${footerNote}</span>
    <span>www.b-bright.co.il</span>
    <span>Bright | Leading the Way to Success</span>
  </div>
</div>`;
}

// ---------------------------------------------------------------------------
// Single-group summary (backward compat)
// ---------------------------------------------------------------------------
export interface BuildSummaryHtmlOptions {
  heroAd: AdCreativeRow;
  allAds: AdCreativeRow[];
  aggregatedMetrics: Record<string, number>;
  visibleMetrics: string[];
  accountName: string;
  dateRange: { since: string; until: string };
  currency?: string;
}

export function buildSummaryHtml(
  options: BuildSummaryHtmlOptions,
  mediaMap: Map<string, string>,
  logoBase64: string | null,
  fontBase64: string,
): string {
  const { heroAd, allAds, aggregatedMetrics, visibleMetrics, accountName, dateRange, currency = "USD" } = options;
  const resolved = resolveMetrics(visibleMetrics, allAds);
  const uniqueCampaigns = [...new Set(allAds.map((a) => a.campaignName))];

  const pageHtml = buildSummaryPage(
    heroAd, allAds, aggregatedMetrics, resolved, mediaMap, logoBase64, accountName, dateRange, currency,
    "\u05D3\u05D5\u05D7 \u05D1\u05D9\u05E6\u05D5\u05E2\u05D9\u05DD \u05DE\u05E1\u05D5\u05DB\u05DD",
    `${allAds.length} \u05DE\u05D5\u05D3\u05E2\u05D5\u05EA \u05E0\u05D1\u05D7\u05E8\u05D5`,
    `\u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DE\u05E1\u05D5\u05DB\u05DE\u05D9\u05DD \u05DE-${allAds.length} \u05DE\u05D5\u05D3\u05E2\u05D5\u05EA | ${esc(uniqueCampaigns.join(", "))}`,
  );

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"><style>${summaryCSS(fontBase64)}</style></head>
<body>${pageHtml}</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Multi-group summary — one page per group
// ---------------------------------------------------------------------------
export interface ProcessedGroup {
  label: string;
  heroAd: AdCreativeRow;
  allAds: AdCreativeRow[];
  aggregatedMetrics: Record<string, number>;
}

export interface BuildGroupedSummaryHtmlOptions {
  groups: ProcessedGroup[];
  visibleMetrics: string[];
  accountName: string;
  dateRange: { since: string; until: string };
  currency?: string;
}

export function buildGroupedSummaryHtml(
  options: BuildGroupedSummaryHtmlOptions,
  mediaMap: Map<string, string>,
  logoBase64: string | null,
  fontBase64: string,
): string {
  const { groups, visibleMetrics, accountName, dateRange, currency = "USD" } = options;

  // Use the first group's ads to detect default metrics if needed
  const allAdsFlat = groups.flatMap((g) => g.allAds);
  const resolved = resolveMetrics(visibleMetrics, allAdsFlat);

  const pagesHtml = groups.map((group) => {
    return buildSummaryPage(
      group.heroAd, group.allAds, group.aggregatedMetrics, resolved, mediaMap, logoBase64, accountName, dateRange, currency,
      `\u05D3\u05D5\u05D7 \u05D1\u05D9\u05E6\u05D5\u05E2\u05D9\u05DD \u05DE\u05E1\u05D5\u05DB\u05DD \u2014 \u05E7\u05D1\u05D5\u05E6\u05D4 ${group.label}`,
      `${group.allAds.length} \u05DE\u05D5\u05D3\u05E2\u05D5\u05EA \u05D1\u05E7\u05D1\u05D5\u05E6\u05D4`,
      `\u05D4\u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DE\u05E1\u05D5\u05DB\u05DE\u05D9\u05DD \u05DE-${group.allAds.length} \u05DE\u05D5\u05D3\u05E2\u05D5\u05EA | \u05E7\u05D1\u05D5\u05E6\u05D4 ${group.label}`,
    );
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head><meta charset="UTF-8"><style>${summaryCSS(fontBase64)}</style></head>
<body>${pagesHtml}</body>
</html>`;
}
