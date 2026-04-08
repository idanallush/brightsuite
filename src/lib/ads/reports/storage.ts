// Report storage for FB Ads Tool PDF reports
// Uses Vercel Blob for persistence

export interface ReportMeta {
  id: string;
  name: string;
  accountName: string;
  accountId: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  adCount: number;
  createdAt: string;
  reportType: string;
  blobUrl?: string;
  createdByUserId?: number;
}

const REPORTS_KEY = "ads-reports-index";

export async function saveReport(meta: ReportMeta, pdfBuffer: Buffer): Promise<void> {
  try {
    const { put } = await import("@vercel/blob");
    const blob = await put(`ads-reports/${meta.id}.pdf`, pdfBuffer, { access: "public" });
    meta.blobUrl = blob.url;

    // Save meta to blob as JSON
    const reports = await listReports();
    reports.unshift(meta);
    await put(`${REPORTS_KEY}.json`, JSON.stringify(reports), { access: "public", addRandomSuffix: false });
  } catch (err) {
    console.error("[Reports] Save failed:", err);
    throw err;
  }
}

export async function listReports(userId?: number): Promise<ReportMeta[]> {
  try {
    const res = await fetch(`${process.env.BLOB_READ_WRITE_TOKEN ? "https://blob.vercel-storage.com" : ""}/${REPORTS_KEY}.json`);
    if (!res.ok) return [];
    const reports: ReportMeta[] = await res.json();
    // If userId is provided, filter to user's reports (+ legacy reports without createdByUserId)
    if (userId !== undefined) {
      return reports.filter((r) => !r.createdByUserId || r.createdByUserId === userId);
    }
    return reports;
  } catch {
    return [];
  }
}

export async function getReport(id: string): Promise<ReportMeta | null> {
  const reports = await listReports();
  return reports.find((r) => r.id === id) || null;
}

export async function readReportPdf(report: ReportMeta): Promise<Buffer | null> {
  if (!report.blobUrl) return null;
  try {
    const res = await fetch(report.blobUrl);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

export async function deleteReport(id: string): Promise<boolean> {
  try {
    const { del } = await import("@vercel/blob");
    const reports = await listReports();
    const report = reports.find((r) => r.id === id);
    if (!report) return false;
    if (report.blobUrl) {
      await del(report.blobUrl);
    }
    const updated = reports.filter((r) => r.id !== id);
    const { put } = await import("@vercel/blob");
    await put(`${REPORTS_KEY}.json`, JSON.stringify(updated), { access: "public", addRandomSuffix: false });
    return true;
  } catch {
    return false;
  }
}
