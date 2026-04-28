import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/require-auth-api";
import { generateCatalogPdf } from "@/lib/ads/pdf/generator";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { ads, accountName, accountId, dateRange, currency } = body;

    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return NextResponse.json({ error: "No ads to export" }, { status: 400 });
    }

    const range = dateRange || { since: "", until: "" };

    const buffer = await generateCatalogPdf({
      ads,
      accountName: accountName || "Report",
      dateRange: range,
      currency: currency || "USD",
    });

    const id = randomUUID();
    const name = `${accountName || "Report"} – Catalog – ${range.since}`;
    try {
      console.log("[PDF] Saving catalog report to blob...", { id, name });
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
          reportType: "catalog",
          createdByUserId: session.userId,
        },
        buffer
      );
      console.log("[PDF] Catalog report saved successfully");
    } catch (saveErr) {
      console.error("[PDF] Catalog report save failed:", saveErr instanceof Error ? saveErr.message : saveErr);
    }

    const safeName = name.replace(/[^\w\s-]/g, "").trim();
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Catalog PDF generation error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
