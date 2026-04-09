import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/require-auth-api";
import { getReport, readReportPdf, deleteReport } from "@/lib/ads/reports/storage";

/**
 * GET /api/ads/reports/:id
 * Download a specific saved report PDF (verify ownership).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Verify ownership (admin can access any, legacy reports without createdByUserId are accessible)
  if (session.role !== 'admin' && report.createdByUserId && report.createdByUserId !== session.userId) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const pdfBuffer = await readReportPdf(report);

  if (!pdfBuffer) {
    return NextResponse.json(
      { error: "Report file not found on disk" },
      { status: 404 }
    );
  }

  const safeName = report.name.replace(/[^\w\s-]/g, "").trim();

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
    },
  });
}

/**
 * DELETE /api/ads/reports/:id
 * Delete a report record and its PDF file (verify ownership).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  // Verify ownership (admin can delete any, legacy reports without createdByUserId are deletable)
  if (session.role !== 'admin' && report.createdByUserId && report.createdByUserId !== session.userId) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const deleted = await deleteReport(id);

  if (!deleted) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
