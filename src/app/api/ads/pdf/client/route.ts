import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/require-auth-api";
import { generateClientPdf } from "@/lib/ads/pdf/generator";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { ads, visibleMetrics, accountName, accountId, dateRange, title, preparedBy, currency } = body;

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return NextResponse.json({ error: "No ads to export" }, { status: 400 });
    }

    const range = dateRange || { since: "", until: "" };
    const reportTitle = title || `Creative Report – ${accountName}`;

    const buffer = await generateClientPdf({
      ads,
      visibleMetrics: visibleMetrics || [],
      accountName: accountName || "Report",
      dateRange: range,
      title: reportTitle,
      preparedBy,
      currency: currency || "USD",
    });

    // Persist the report using dynamic import so @vercel/blob
    // is not bundled into this heavy PDF function at build time
    const id = randomUUID();
    const name = `${accountName || "Report"} – Client – ${range.since}`;
    try {
      console.log("[PDF] Saving report to blob...", { id, name });
      const { saveReport } = await import("@/lib/ads/reports/storage");
      await saveReport(
        {
          id,
          name,
          accountName: accountName || "",
          accountId: accountId || "",
          dateRangeStart: range.since,
          dateRangeEnd: range.until,
          adCount: ads.length,
          createdAt: new Date().toISOString(),
          reportType: "client",
          createdByUserId: session.userId,
        },
        buffer
      );
      console.log("[PDF] Report saved successfully");
    } catch (saveErr) {
      console.error("[PDF] Report save failed:", saveErr instanceof Error ? saveErr.message : saveErr);
    }

    const safeName = name.replace(/[^\w\s-]/g, "").trim();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
