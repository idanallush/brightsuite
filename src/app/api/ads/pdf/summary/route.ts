import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/require-auth-api";
import { generateSummaryPdf, generateGroupedSummaryPdf } from "@/lib/ads/pdf/generator";
import type { AdCreativeRow } from "@/lib/ads/types/ad";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { groups, ads, visibleMetrics, accountName, accountId, dateRange, currency } = body;

    const range = dateRange || { since: "", until: "" };
    let buffer: Buffer;
    let adCount = 0;

    if (groups && Array.isArray(groups) && groups.length > 0) {
      // New grouped format — one page per group
      buffer = await generateGroupedSummaryPdf({
        groups: groups.map((g: { label: string; ads: AdCreativeRow[] }) => ({
          label: g.label,
          ads: g.ads,
        })),
        visibleMetrics: visibleMetrics || [],
        accountName: accountName || "Report",
        dateRange: range,
        currency: currency || "USD",
      });
      adCount = groups.reduce((sum: number, g: { ads: AdCreativeRow[] }) => sum + g.ads.length, 0);
    } else if (ads && Array.isArray(ads) && ads.length > 0) {
      // Old single-group format (backward compat)
      buffer = await generateSummaryPdf({
        ads,
        visibleMetrics: visibleMetrics || [],
        accountName: accountName || "Report",
        dateRange: range,
        currency: currency || "USD",
      });
      adCount = ads.length;
    } else {
      return NextResponse.json({ error: "No ads or groups provided" }, { status: 400 });
    }

    // Persist the report
    const id = randomUUID();
    const name = `${accountName || "Report"} – Summary – ${range.since}`;
    try {
      console.log("[PDF] Saving summary report to blob...", { id, name });
      const { saveReport } = await import("@/lib/ads/reports/storage");
      await saveReport(
        {
          id,
          name,
          accountName: accountName || "",
          accountId: accountId || "",
          dateRangeStart: range.since,
          dateRangeEnd: range.until,
          adCount,
          createdAt: new Date().toISOString(),
          reportType: "summary",
          createdByUserId: session.userId,
        },
        buffer
      );
      console.log("[PDF] Summary report saved successfully");
    } catch (saveErr) {
      console.error("[PDF] Summary report save failed:", saveErr instanceof Error ? saveErr.message : saveErr);
    }

    const safeName = name.replace(/[^\w\s-]/g, "").trim();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Summary PDF generation error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
