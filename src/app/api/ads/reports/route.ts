import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/require-auth-api";
import { listReports } from "@/lib/ads/reports/storage";

/**
 * GET /api/ads/reports
 *
 * Returns the list of saved PDF reports, scoped to user (admin sees all).
 */
export async function GET() {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  try {
    console.log("[REPORTS] Fetching reports list...");
    // Admin sees all reports, regular users see their own + legacy
    const reports = session.role === 'admin'
      ? await listReports()
      : await listReports(session.userId);
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
