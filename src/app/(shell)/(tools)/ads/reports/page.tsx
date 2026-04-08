"use client";

import { useState } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/cpa/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/cpa/ui/dialog";
import { Button } from "@/components/cpa/ui/button";
import { Badge } from "@/components/cpa/ui/badge";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import {
  Download,
  Trash2,
  FileText,
  AlertCircle,
  RefreshCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface Report {
  id: string;
  name: string;
  accountName: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  adCount: number;
  createdAt: string;
  filtersApplied?: string;
}

const fetcher = async (url: string): Promise<Report[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load reports");
  const data = await res.json();
  return data.reports as Report[];
};

function parseFilters(raw?: string): string {
  try {
    if (!raw) return "–";
    const obj = JSON.parse(raw) as Record<string, unknown>;
    const parts: string[] = [];
    if (obj.includePaused) parts.push("כולל מושהות");
    if (obj.search && typeof obj.search === "string" && obj.search.trim()) {
      parts.push(`חיפוש: "${obj.search}"`);
    }
    return parts.length > 0 ? parts.join(", ") : "ללא פילטרים";
  } catch {
    return "–";
  }
}

export default function ReportsPage() {
  const { tools, loading: authLoading } = useAuth();
  const { data: reports, error, isLoading, mutate } = useSWR<Report[]>(
    "/api/ads/reports",
    fetcher,
    { revalidateOnFocus: false }
  );

  const [deleteTarget, setDeleteTarget] = useState<Report | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Permission check AFTER all hooks
  if (!authLoading && !tools.includes('ads')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-base font-medium text-zinc-700 mb-1">אין גישה לכלי זה</h2>
        <p className="text-sm text-zinc-400">פנה למנהל המערכת לקבלת הרשאה.</p>
      </div>
    );
  }

  const handleDownload = async (report: Report) => {
    setDownloadingId(report.id);
    try {
      const res = await fetch(`/api/ads/reports/${report.id}`);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("הדוח הורד בהצלחה");
    } catch {
      toast.error("שגיאה בהורדת הדוח");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/ads/reports/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      toast.success("הדוח נמחק");
      mutate();
    } catch {
      toast.error("שגיאה במחיקת הדוח");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-5 w-5 text-zinc-500" aria-hidden="true" />
            דוחות
          </h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            כל דוחות ה-PDF שנוצרו. לחץ על הורדה כדי להוריד שוב.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => mutate()}
          disabled={isLoading}
          aria-label="רענון רשימת דוחות"
        >
          <RefreshCcw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
          רענון
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-800"
        >
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
          <p className="text-sm">שגיאה בטעינת דוחות. נסה לרענן את הדף.</p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {!isLoading && !error && reports && reports.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <FileText className="h-12 w-12 text-zinc-200 mb-4" aria-hidden="true" />
          <h2 className="text-base font-medium text-zinc-600 mb-1">אין דוחות עדיין</h2>
          <p className="text-sm text-zinc-400">
            צור את דוח ה-PDF הראשון שלך מעמוד ספריית המודעות.
          </p>
        </div>
      )}

      {!isLoading && !error && reports && reports.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם דוח</TableHead>
                <TableHead>תאריך יצירה</TableHead>
                <TableHead>חשבון</TableHead>
                <TableHead>טווח תאריכים</TableHead>
                <TableHead className="text-center">מודעות</TableHead>
                <TableHead>פילטרים</TableHead>
                <TableHead className="text-end">פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium text-sm max-w-[200px]">
                    <span className="truncate block" title={report.name}>
                      {report.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500 whitespace-nowrap">
                    {format(new Date(report.createdAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600 max-w-[160px]">
                    <span className="truncate block" title={report.accountName}>
                      {report.accountName}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500 whitespace-nowrap">
                    {report.dateRangeStart} → {report.dateRangeEnd}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{report.adCount}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-400 max-w-[160px]">
                    <span className="truncate block">{parseFilters(report.filtersApplied)}</span>
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-8"
                        onClick={() => handleDownload(report)}
                        disabled={downloadingId === report.id}
                        aria-label={`הורד דוח: ${report.name}`}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {downloadingId === report.id ? "..." : "הורדה"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 h-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleteTarget(report)}
                        aria-label={`מחק דוח: ${report.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>מחיקת דוח</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            האם אתה בטוח שברצונך למחוק את{" "}
            <span className="font-medium">&quot;{deleteTarget?.name}&quot;</span>?
            פעולה זו לא ניתנת לביטול.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              ביטול
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              aria-label="אישור מחיקת דוח"
            >
              {isDeleting ? "מוחק..." : "מחק"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
