"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { useState, useCallback } from "react";
import { RefreshCw, Settings, BarChart3, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useDashboardStore } from "@/stores/cpa/dashboard-store";
import { DateRangePicker } from "@/components/cpa/dashboard/date-range-picker";
import { DashboardGrid } from "@/components/cpa/dashboard/dashboard-grid";
import { KpiSummary } from "@/components/cpa/dashboard/kpi-summary";
import { Button } from "@/components/cpa/ui/button";
import { Card } from "@/components/cpa/ui/card";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import type { ClientCardData } from "@/lib/cpa/types/dashboard";

async function cardsFetcher(url: string): Promise<ClientCardData[]> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "שגיאה בטעינת הנתונים");
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.data || [];
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
      <p className="text-sm text-red-700 flex-1">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
        נסה שוב
      </Button>
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading, hasToolAccess } = useAuth();
  const { dateRange, setDateRange, lastUpdated, setLastUpdated } = useDashboardStore();

  const [urlSynced, setUrlSynced] = useState(false);
  if (!urlSynced) {
    const urlSince = searchParams.get("since");
    const urlUntil = searchParams.get("until");
    if (
      urlSince && urlUntil &&
      /^\d{4}-\d{2}-\d{2}$/.test(urlSince) &&
      /^\d{4}-\d{2}-\d{2}$/.test(urlUntil)
    ) {
      setDateRange({ since: urlSince, until: urlUntil });
    }
    setUrlSynced(true);
  }

  const handleDateRangeChange = useCallback(
    (range: { since: string; until: string }) => {
      setDateRange(range);
      const params = new URLSearchParams();
      params.set("since", range.since);
      params.set("until", range.until);
      router.replace(`?${params.toString()}`);
    },
    [setDateRange, router]
  );

  const { data, error, isLoading, mutate } = useSWR<ClientCardData[]>(
    `/api/cpa/dashboard/cards?since=${dateRange.since}&until=${dateRange.until}&compare=true`,
    cardsFetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      onSuccess: () => {
        setLastUpdated(
          new Date().toLocaleTimeString("he-IL", { hour: "2-digit", minute: "2-digit" })
        );
      },
    }
  );

  const [isRefreshing, setIsRefreshing] = useState(false);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await mutate();
      toast.success("הנתונים עודכנו");
    } catch (err) {
      console.error("[cpa] refresh failed:", err);
      toast.error(err instanceof Error ? err.message : "שגיאה ברענון הנתונים");
    } finally {
      setIsRefreshing(false);
    }
  }

  // Permission check AFTER all hooks
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-80" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasToolAccess('cpa')) {
    return (
      <Card className="rounded-xl">
        <div className="flex flex-col items-center justify-center p-16 gap-5">
          <p className="font-semibold">אין לך הרשאה לצפות בכלי זה</p>
        </div>
      </Card>
    );
  }

  const activeCount = Array.isArray(data) ? data.length : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <DateRangePicker onDateRangeChange={handleDateRangeChange} />
        <div className="flex-1" />
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className="h-9 gap-1.5"
        >
          {isLoading || isRefreshing ? (
            <span
              className="h-4 w-4 rounded-full border-2 border-neutral-300 animate-spin"
              style={{ borderTopColor: "#1877F2" }}
            />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">רענון</span>
        </Button>

        {data && data.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {activeCount} לקוחות
            {lastUpdated && <> &middot; עודכן {lastUpdated}</>}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="rounded-xl shadow-sm overflow-hidden">
              <div className="h-1 bg-muted" />
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <ErrorBanner
          message={error.message || "שגיאה בטעינת הנתונים"}
          onRetry={handleRefresh}
        />
      ) : !Array.isArray(data) || data.length === 0 ? (
        <Card className="rounded-xl">
          <div className="flex flex-col items-center justify-center p-16 gap-5">
            <div className="h-14 w-14 rounded-2xl bg-[#F3F4F6] flex items-center justify-center">
              <BarChart3 className="h-7 w-7 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold">אין לקוחות פעילים</p>
              <p className="text-sm text-muted-foreground">
                עבור להגדרות כדי לחבר חשבונות פייסבוק ולהפעיל לקוחות
              </p>
            </div>
            <Button asChild className="bg-[#1877F2] hover:bg-[#1565C0] text-white">
              <Link href="/cpa/settings">
                <Settings className="h-4 w-4" />
                עבור להגדרות
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <KpiSummary cards={data} />
          <DashboardGrid cards={data} />
        </>
      )}
    </div>
  );
}

export default function CpaDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-9 w-80" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
