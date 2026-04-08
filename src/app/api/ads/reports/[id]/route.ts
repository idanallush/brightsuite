import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { getReport, readReportPdf, deleteReport } from "@/lib/ads/reports/storage";

/**
 * GET /api/ads/reports/:id
 * Download a specific saved report PDF.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const report = await getReport(id);

  if (!report) {
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
 * Delete a report record and its PDF file.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteReport(id);

  if (!deleted) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
