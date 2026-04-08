import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/require-auth-api";
import { generateClientPdf } from "@/lib/ads/pdf/generator";

export async function POST(request: NextRequest) {
  const { error } = await requireApiAuth();
  if (error) return error;

  try {
    const body = await request.json();
    const { ad, visibleMetrics, accountName, dateRange, currency } = body;

    if (!ad) {
      return NextResponse.json({ error: "No ad data provided" }, { status: 400 });
    }

    const range = dateRange || { since: "", until: "" };

    const buffer = await generateClientPdf({
      ads: [ad],
      visibleMetrics: visibleMetrics || [],
      accountName: accountName || "Report",
      dateRange: range,
      title: `${ad.adName || "Ad"} – ${accountName || "Report"}`,
      currency: currency || "USD",
    });

    const safeName = (ad.adName || "ad-report")
      .replace(/[^\w\u0590-\u05FF\s-]/g, "")
      .trim();

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      },
    });
  } catch (err) {
    console.error("Single ad PDF generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
