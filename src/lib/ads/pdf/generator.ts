import type { AdCreativeRow } from "@/lib/ads/types/ad";
import { getBrowser } from "./browser";
import { buildClientHtml } from "./html-client-template";
import { buildQuickHtml } from "./html-quick-template";
import { buildSummaryHtml, buildGroupedSummaryHtml } from "./html-summary-template";
import { buildCatalogHtml } from "./html-catalog-template";

// ---------------------------------------------------------------------------
// Image optimization — resize with sharp before base64 encoding
// ---------------------------------------------------------------------------
async function optimizeImageBuffer(inputBuffer: Buffer): Promise<Buffer> {
  try {
    const sharp = (await import("sharp")).default;
    return await sharp(inputBuffer)
      .resize({ width: 600, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  } catch (err) {
    console.warn("[PDF] sharp resize failed, using original buffer:", err);
    return inputBuffer;
  }
}

async function fetchMediaAsBase64(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        if (attempt === 0) continue; // retry once
        return null;
      }

      const rawBuffer = Buffer.from(await res.arrayBuffer());
      const rawSizeKB = Math.round(rawBuffer.byteLength / 1024);

      // Reject images < 5KB — likely 64x64 broken thumbnails or placeholders
      if (rawBuffer.byteLength < 5000) {
        console.warn(`[PDF][Image] REJECTED tiny image: ${rawSizeKB}KB — ${url.substring(0, 80)}`);
        return null;
      }

      // Resize with sharp to max 600px wide, jpeg quality 80
      const optimized = await optimizeImageBuffer(rawBuffer);
      const optSizeKB = Math.round(optimized.byteLength / 1024);
      console.log(`[PDF][Image] ${rawSizeKB}KB → ${optSizeKB}KB — ${url.substring(0, 80)}`);

      const base64 = optimized.toString("base64");
      return `data:image/jpeg;base64,${base64}`;
    } catch {
      if (attempt === 0) continue; // retry once
      return null;
    }
  }
  return null;
}

async function fetchAllMedia(
  ads: AdCreativeRow[]
): Promise<Map<string, string>> {
  const mediaMap = new Map<string, string>();

  // Collect all fetch jobs: main media + carousel card images
  const jobs: { key: string; url: string }[] = [];
  for (const ad of ads) {
    if (ad.mediaUrl) {
      jobs.push({ key: ad.adId, url: ad.mediaUrl });
    }
    // Carousel card images — keyed as "adId_0", "adId_1", etc.
    if (ad.carouselCards) {
      ad.carouselCards.forEach((card, idx) => {
        if (card.imageUrl) {
          jobs.push({ key: `${ad.adId}_${idx}`, url: card.imageUrl });
        }
      });
    }
  }

  console.log(`[PDF] Fetching ${jobs.length} media items for ${ads.length} ads...`);
  const fetchStart = Date.now();

  // Fetch in parallel with concurrency limit
  const concurrency = 10;
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map(async (job) => {
        const base64 = await fetchMediaAsBase64(job.url);
        if (base64) {
          mediaMap.set(job.key, base64);
        }
      })
    );
    // Log failures but continue
    results.forEach((r, idx) => {
      if (r.status === "rejected") {
        console.warn(`[PDF] Failed to fetch media for ${batch[idx].key}:`, r.reason);
      }
    });
  }

  const fetchMs = Date.now() - fetchStart;
  console.log(`[PDF] Media fetch complete: ${mediaMap.size}/${jobs.length} succeeded in ${fetchMs}ms`);

  return mediaMap;
}

// ---------------------------------------------------------------------------
// Emoji stripping — Heebo font cannot render color emoji glyphs
// ---------------------------------------------------------------------------
const EMOJI_REGEX =
  /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

function stripEmoji(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(EMOJI_REGEX, "").replace(/\s{2,}/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Logo loading — safe fallback to null if file missing or unreadable
// ---------------------------------------------------------------------------
function loadLogo(): string | null {
  try {
    const fs = require("fs");
    const path = require("path");
    const logoPath = path.join(process.cwd(), "public", "bright-logo-black.png");
    if (!fs.existsSync(logoPath)) {
      console.warn("[PDF] Logo file not found:", logoPath);
      return null;
    }
    const buffer = fs.readFileSync(logoPath);
    return "data:image/png;base64," + buffer.toString("base64");
  } catch (err) {
    console.warn("[PDF] Failed to load logo:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Font loading — embed Heebo as base64 for HTML templates
// ---------------------------------------------------------------------------
function loadFontBase64(): string {
  try {
    const fs = require("fs");
    const path = require("path");
    const fontPath = path.join(process.cwd(), "public", "fonts", "Heebo.ttf");
    if (!fs.existsSync(fontPath)) {
      console.warn("[PDF] Heebo font not found:", fontPath);
      return "";
    }
    return fs.readFileSync(fontPath).toString("base64");
  } catch (err) {
    console.warn("[PDF] Failed to load Heebo font:", err);
    return "";
  }
}

// ---------------------------------------------------------------------------
// Shared: clean ads
// ---------------------------------------------------------------------------
function cleanAdsData(ads: AdCreativeRow[]): AdCreativeRow[] {
  return ads
    .map(ad => ({
      ...ad,
      adCopy: stripEmoji(ad.adCopy),
      headline: stripEmoji(ad.headline),
      adName: stripEmoji(ad.adName),
      campaignName: stripEmoji(ad.campaignName),
      adsetName: stripEmoji(ad.adsetName),
    }))
    .filter(ad => ad && ad.adId);
}

// ---------------------------------------------------------------------------
// Puppeteer HTML -> PDF renderer
// ---------------------------------------------------------------------------
const FOOTER_TEMPLATE = `
<div style="width:100%;font-size:9px;color:#888;
  display:flex;justify-content:space-between;align-items:center;
  padding:4px 30px 0 30px;border-top:1px solid #e0e0e0;">
  <span style="white-space:nowrap;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
  <span style="white-space:nowrap;">www.b-bright.co.il</span>
  <span style="white-space:nowrap;">Bright | Leading the Way to Success</span>
</div>`;

interface HtmlToPdfOptions {
  landscape?: boolean;
  /** When true, uses margin: 0 and no Puppeteer header/footer (template handles its own) */
  fullPage?: boolean;
}

async function htmlToPdf(html: string, opts: HtmlToPdfOptions = {}): Promise<Buffer> {
  const { landscape = false, fullPage = false } = opts;
  const htmlSizeKB = Math.round(Buffer.byteLength(html, "utf8") / 1024);
  console.log(`[PDF] htmlToPdf: HTML size = ${htmlSizeKB}KB, landscape = ${landscape}, fullPage = ${fullPage}`);

  const browser = await getBrowser();
  console.log("[PDF] Browser obtained");

  const page = await browser.newPage();
  console.log("[PDF] New page created");

  try {
    // All images and fonts are already base64-embedded, so no network requests needed.
    // Use domcontentloaded — faster than networkidle since everything is inline.
    const setContentStart = Date.now();
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log(`[PDF] setContent done in ${Date.now() - setContentStart}ms`);

    const pdfStart = Date.now();
    const pdfBuffer = fullPage
      ? await page.pdf({
          format: "A4",
          landscape,
          printBackground: true,
          margin: { top: "0", bottom: "0", left: "0", right: "0" },
          timeout: 90000,
        })
      : await page.pdf({
          format: "A4",
          landscape,
          printBackground: true,
          margin: landscape
            ? { top: "30px", bottom: "50px", left: "30px", right: "30px" }
            : { top: "40px", bottom: "60px", left: "40px", right: "40px" },
          displayHeaderFooter: true,
          headerTemplate: "<span></span>",
          footerTemplate: FOOTER_TEMPLATE,
          timeout: 90000,
        });
    const pdfMs = Date.now() - pdfStart;
    const pdfSizeKB = Math.round(pdfBuffer.byteLength / 1024);
    console.log(`[PDF] page.pdf() done in ${pdfMs}ms, PDF size = ${pdfSizeKB}KB`);

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close().catch(() => {});
    console.log("[PDF] Page closed");
  }
}

// ---------------------------------------------------------------------------
// Public API — same interface as before
// ---------------------------------------------------------------------------
export interface GeneratePdfOptions {
  ads: AdCreativeRow[];
  visibleMetrics: string[];
  accountName: string;
  dateRange: { since: string; until: string };
  title?: string;
  preparedBy?: string;
  currency?: string;
}

export async function generateQuickPdf(options: GeneratePdfOptions): Promise<Buffer> {
  const totalStart = Date.now();
  console.log(`[PDF] generateQuickPdf: ${options.ads.length} ads`);

  const validAds = cleanAdsData(options.ads);
  console.log(`[PDF] Cleaned ads: ${validAds.length} valid`);

  const mediaImages = await fetchAllMedia(validAds);
  const logoBase64 = loadLogo();
  const fontBase64 = loadFontBase64();

  console.log("[PDF] Building quick HTML...");
  const html = buildQuickHtml(
    {
      ads: validAds,
      visibleMetrics: options.visibleMetrics,
      accountName: options.accountName,
      dateRange: options.dateRange,
      currency: options.currency,
    },
    mediaImages,
    logoBase64,
    fontBase64,
  );

  const result = await htmlToPdf(html, { landscape: true });
  console.log(`[PDF] generateQuickPdf complete in ${Date.now() - totalStart}ms`);
  return result;
}

export interface GenerateSummaryPdfOptions {
  ads: AdCreativeRow[];
  visibleMetrics: string[];
  accountName: string;
  dateRange: { since: string; until: string };
  currency?: string;
}

export async function generateSummaryPdf(options: GenerateSummaryPdfOptions): Promise<Buffer> {
  const totalStart = Date.now();
  const { ads, visibleMetrics, accountName, dateRange, currency = "USD" } = options;

  console.log(`[PDF] generateSummaryPdf: ${ads.length} ads`);

  const validAds = cleanAdsData(ads);

  // Find hero ad (highest spend)
  const heroAd = [...validAds].sort((a, b) =>
    ((b.metrics?.spend as number) ?? 0) - ((a.metrics?.spend as number) ?? 0)
  )[0];

  if (!heroAd) throw new Error("No valid ads for summary");

  // Only fetch media for the hero ad (+ its carousel cards if any)
  const heroAds = [heroAd];
  const mediaImages = await fetchAllMedia(heroAds);

  // Aggregate metrics
  const sumKeys = ["spend", "clicks", "impressions", "reach", "leads", "purchases", "revenue", "video_views", "thruplays", "add_to_cart", "initiate_checkout", "results"];
  const aggregated: Record<string, number> = {};
  for (const key of sumKeys) {
    aggregated[key] = validAds.reduce((sum, ad) => sum + ((ad.metrics?.[key] as number) ?? 0), 0);
  }
  // Calculated ratio metrics
  if (aggregated.impressions > 0) {
    aggregated.ctr = (aggregated.clicks / aggregated.impressions) * 100;
    aggregated.cpm = (aggregated.spend / aggregated.impressions) * 1000;
  }
  if (aggregated.leads > 0) aggregated.cpl = aggregated.spend / aggregated.leads;
  if (aggregated.clicks > 0) aggregated.cpc = aggregated.spend / aggregated.clicks;
  if (aggregated.purchases > 0) aggregated.cpa = aggregated.spend / aggregated.purchases;
  if (aggregated.spend > 0) aggregated.roas = aggregated.revenue / aggregated.spend;
  if (aggregated.impressions > 0 && aggregated.reach > 0) aggregated.frequency = aggregated.impressions / aggregated.reach;
  if (aggregated.results > 0) aggregated.cost_per_result = aggregated.spend / aggregated.results;

  const logoBase64 = loadLogo();
  const fontBase64 = loadFontBase64();

  const html = buildSummaryHtml(
    { heroAd, allAds: validAds, aggregatedMetrics: aggregated, visibleMetrics, accountName, dateRange, currency },
    mediaImages,
    logoBase64,
    fontBase64,
  );

  const result = await htmlToPdf(html, { landscape: true, fullPage: true });
  console.log(`[PDF] generateSummaryPdf complete in ${Date.now() - totalStart}ms`);
  return result;
}

export interface SummaryGroupInput {
  label: string;
  ads: AdCreativeRow[];
}

export interface GenerateGroupedSummaryPdfOptions {
  groups: SummaryGroupInput[];
  visibleMetrics: string[];
  accountName: string;
  dateRange: { since: string; until: string };
  currency?: string;
}

export async function generateGroupedSummaryPdf(options: GenerateGroupedSummaryPdfOptions): Promise<Buffer> {
  const totalStart = Date.now();
  const { groups, visibleMetrics, accountName, dateRange, currency = "USD" } = options;
  console.log(`[PDF] generateGroupedSummaryPdf: ${groups.length} groups`);

  const processedGroups: Array<{
    label: string;
    heroAd: AdCreativeRow;
    allAds: AdCreativeRow[];
    aggregatedMetrics: Record<string, number>;
  }> = [];

  const allHeroAds: AdCreativeRow[] = [];

  for (const group of groups) {
    const validAds = cleanAdsData(group.ads);
    if (validAds.length === 0) continue;

    const heroAd = [...validAds].sort((a, b) =>
      ((b.metrics?.spend as number) ?? 0) - ((a.metrics?.spend as number) ?? 0)
    )[0];

    const sumKeys = ["spend", "clicks", "impressions", "reach", "leads", "purchases", "revenue", "video_views", "thruplays", "add_to_cart", "initiate_checkout", "results"];
    const agg: Record<string, number> = {};
    for (const k of sumKeys) agg[k] = validAds.reduce((s, ad) => s + ((ad.metrics?.[k] as number) ?? 0), 0);
    if (agg.impressions > 0) { agg.ctr = (agg.clicks / agg.impressions) * 100; agg.cpm = (agg.spend / agg.impressions) * 1000; }
    if (agg.leads > 0) agg.cpl = agg.spend / agg.leads;
    if (agg.clicks > 0) agg.cpc = agg.spend / agg.clicks;
    if (agg.purchases > 0) agg.cpa = agg.spend / agg.purchases;
    if (agg.spend > 0) agg.roas = agg.revenue / agg.spend;
    if (agg.impressions > 0 && agg.reach > 0) agg.frequency = agg.impressions / agg.reach;
    if (agg.results > 0) agg.cost_per_result = agg.spend / agg.results;

    processedGroups.push({ label: group.label, heroAd, allAds: validAds, aggregatedMetrics: agg });
    allHeroAds.push(heroAd);
  }

  if (processedGroups.length === 0) throw new Error("No valid groups");

  const mediaImages = await fetchAllMedia(allHeroAds);
  const logoBase64 = loadLogo();
  const fontBase64 = loadFontBase64();

  const html = buildGroupedSummaryHtml(
    { groups: processedGroups, visibleMetrics, accountName, dateRange, currency },
    mediaImages, logoBase64, fontBase64,
  );

  const result = await htmlToPdf(html, { landscape: true, fullPage: true });
  console.log(`[PDF] generateGroupedSummaryPdf complete in ${Date.now() - totalStart}ms`);
  return result;
}

export async function generateClientPdf(options: GeneratePdfOptions): Promise<Buffer> {
  const totalStart = Date.now();
  console.log(`[PDF] generateClientPdf: ${options.ads.length} ads`);

  const validAds = cleanAdsData(options.ads);
  console.log(`[PDF] Cleaned ads: ${validAds.length} valid`);

  const mediaImages = await fetchAllMedia(validAds);
  const logoBase64 = loadLogo();
  const fontBase64 = loadFontBase64();

  console.log("[PDF] Building client HTML...");
  const html = buildClientHtml(
    {
      ads: validAds,
      visibleMetrics: options.visibleMetrics,
      accountName: options.accountName,
      dateRange: options.dateRange,
      title: options.title,
      preparedBy: options.preparedBy,
      currency: options.currency,
    },
    mediaImages,
    logoBase64,
    fontBase64,
  );

  const result = await htmlToPdf(html, { landscape: true, fullPage: true });
  console.log(`[PDF] generateClientPdf complete in ${Date.now() - totalStart}ms`);
  return result;
}

// ---------------------------------------------------------------------------
// Catalog PDF — compact table/grid showing many ads per page
// ---------------------------------------------------------------------------
export interface GenerateCatalogPdfOptions {
  ads: AdCreativeRow[];
  accountName: string;
  dateRange: { since: string; until: string };
  currency?: string;
}

export async function generateCatalogPdf(options: GenerateCatalogPdfOptions): Promise<Buffer> {
  const totalStart = Date.now();
  console.log(`[PDF] generateCatalogPdf: ${options.ads.length} ads`);

  const validAds = cleanAdsData(options.ads);
  console.log(`[PDF] Cleaned ads: ${validAds.length} valid`);

  const mediaImages = await fetchAllMedia(validAds);
  const logoBase64 = loadLogo();
  const fontBase64 = loadFontBase64();

  console.log("[PDF] Building catalog HTML...");
  const html = buildCatalogHtml(
    {
      ads: validAds,
      accountName: options.accountName,
      dateRange: options.dateRange,
      currency: options.currency,
    },
    mediaImages,
    logoBase64,
    fontBase64,
  );

  const result = await htmlToPdf(html, { landscape: false });
  console.log(`[PDF] generateCatalogPdf complete in ${Date.now() - totalStart}ms`);
  return result;
}
