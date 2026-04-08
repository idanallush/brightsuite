"use client";

import { useState } from "react";
import { Button } from "@/components/cpa/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/cpa/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/cpa/ui/dialog";
import { Input } from "@/components/cpa/ui/input";
import { Download, FileText, Presentation } from "lucide-react";
import { LoadingSpinner } from "@/components/ads/ui/loading-spinner";
import { toast } from "sonner";
import type { AdCreativeRow } from "@/lib/ads/types/ad";

interface ExportButtonProps {
  ads: AdCreativeRow[];
  visibleMetrics: string[];
  presetMetrics?: string[];
  accountName: string;
  accountId?: string;
  dateRange: { since: string; until: string } | null;
  disabled: boolean;
  currency?: string;
}

export function ExportButton({
  ads,
  visibleMetrics,
  presetMetrics,
  accountName,
  accountId = "",
  dateRange,
  disabled,
  currency = "USD",
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [reportTitle, setReportTitle] = useState("");
  const [preparedBy, setPreparedBy] = useState("");

  const handleExport = async (
    type: "quick" | "client",
    options?: { title?: string; preparedBy?: string }
  ) => {
    setIsExporting(true);
    try {
      const res = await fetch(`/api/ads/pdf/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ads,
          visibleMetrics: presetMetrics || visibleMetrics,
          accountName,
          accountId,
          dateRange,
          title: options?.title,
          preparedBy: options?.preparedBy,
          currency,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${accountName || "report"}-${type}-${dateRange?.since || "report"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("הדוח הורד ונשמר בהצלחה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת הדוח");
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl px-10 py-8">
            <LoadingSpinner message="מייצא דוח PDF..." size="lg" />
          </div>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="default"
            size="sm"
            className="gap-2"
            disabled={disabled || isExporting}
            title="ייצוא דוח PDF"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            ייצוא PDF
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            className="gap-2"
            onClick={() => handleExport("quick")}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            דוח מהיר
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2"
            onClick={() => setShowClientDialog(true)}
          >
            <Presentation className="h-4 w-4" aria-hidden="true" />
            דוח ללקוח
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>הגדרות דוח ללקוח</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium" htmlFor="report-title">
                שם הדוח
              </label>
              <Input
                id="report-title"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder={`Creative Report – ${accountName}`}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium" htmlFor="prepared-by">
                הוכן על ידי
              </label>
              <Input
                id="prepared-by"
                value={preparedBy}
                onChange={(e) => setPreparedBy(e.target.value)}
                placeholder="שם הסוכנות / השם שלך"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowClientDialog(false);
                handleExport("client", {
                  title: reportTitle || `Creative Report – ${accountName}`,
                  preparedBy,
                });
              }}
              className="gap-2"
              disabled={isExporting}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              צור דוח
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
