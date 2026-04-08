import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { listReports } from "@/lib/ads/reports/storage";

/**
 * GET /api/ads/reports
 *
 * Returns the list of all saved PDF reports from Vercel Blob storage.
 */
export async function GET() {
  const session = await getServerSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    console.log("[REPORTS] Fetching reports list...");
    const reports = await listReports();
    console.log("[REPORTS] Found reports:", reports.length);
    if (reports.length > 0) {
      console.log("[REPORTS] First report:", JSON.stringify(reports[0]));
    }
    return NextResponse.json({ reports });
  } catch (err) {
    console.error("[REPORTS] Error listing reports:", err);
    return NextResponse.json({ reports: [] });
  }
}
