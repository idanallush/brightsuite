"use client";

import { useState, useMemo, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import useSWR from "swr";
import { toast } from "sonner";

import { AdGrid } from "@/components/ads/AdGrid";
import { CampaignView } from "@/components/ads/CampaignView";
import { ErrorBanner } from "@/components/ads/ui/ErrorBanner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/cpa/ui/tabs";
import { AccountSelector } from "@/components/ads/dashboard/account-selector";
import { DateRangePicker } from "@/components/ads/dashboard/date-range-picker";
import { ExportButton } from "@/components/ads/dashboard/export-button";
import { Button } from "@/components/cpa/ui/button";
import { Badge } from "@/components/cpa/ui/badge";
import { Input } from "@/components/cpa/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/cpa/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/cpa/ui/popover";

import { useAdStore } from "@/stores/ads/useAdStore";
import { useColumnConfig } from "@/hooks/ads/use-column-config";
import { useFacebookAccounts } from "@/hooks/ads/use-facebook-accounts";
import { MetricPresetSelector } from "@/components/ads/dashboard/metric-preset-selector";
import { METRIC_PRESETS, DEFAULT_PRESET, type PresetKey, PRESET_KEYS } from "@/lib/ads/metric-presets";
import { formatMetricValue } from "@/lib/ads/format";
import type { AdCreativeRow, DateRange } from "@/lib/ads/types/ad";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/cpa/ui/dropdown-menu";
import { RefreshCcw, Search, X, SlidersHorizontal, Filter, LayoutGrid, Megaphone, Download, Loader2, XCircle, Check, BarChart3, FolderPlus, Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { SyncProgress } from "@/components/ui/sync-progress";
import { HelpTip } from "@/components/ui/help-tip";

// ------------------------------------------------------------------
// Summary Groups
// ------------------------------------------------------------------
interface SummaryGroup {
  label: string;
  adIds: Set<string>;
}

// ------------------------------------------------------------------
// Data fetching
// ------------------------------------------------------------------
async function adsFetcher(url: string): Promise<AdCreativeRow[]> {
  const res = await fetch(url);
  if (res.status === 401) {
    window.location.href = "/";
    throw new Error("Not authenticated");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error || "Failed to fetch ads");
  }
  const body = await res.json() as { ads: AdCreativeRow[] };
  return body.ads;
}

function useAds(
  accountId: string | null,
  dateRange: DateRange,
  enabled: boolean = true,
) {
  const shouldFetch = !!accountId && enabled;

  const params = new URLSearchParams();
  if (accountId) params.set("account_id", accountId);
  params.set("since", dateRange.since);
  params.set("until", dateRange.until);

  const key = shouldFetch ? `/api/ads/facebook/ads?${params.toString()}` : null;

  const { data, error, isLoading, mutate } = useSWR<AdCreativeRow[]>(
    key,
    adsFetcher,
    { revalidateOnFocus: false, dedupingInterval: 3600000 }
  );

  return {
    ads: data ?? [],
    error,
    isLoading: shouldFetch ? isLoading : false,
    refresh: mutate,
  };
}

// ------------------------------------------------------------------
// Selection summary bar
// ------------------------------------------------------------------
function SelectionSummaryBar({
  selectedAdIds,
  allAds,
  activePreset,
  currency,
  accountName,
  accountId,
  dateRange,
  presetMetrics,
  visibleMetrics,
  onClear,
  summaryGroups,
  onAddToGroup,
  onRemoveGroup,
  onClearAllGroups,
  onGroupedExport,
  isSummaryExporting,
}: {
  selectedAdIds: Set<string>;
  allAds: AdCreativeRow[];
  activePreset: PresetKey;
  currency: string;
  accountName: string;
  accountId: string;
  dateRange: { since: string; until: string };
  presetMetrics: string[];
  visibleMetrics: string[];
  onClear: () => void;
  summaryGroups: SummaryGroup[];
  onAddToGroup: (groupLabel?: string) => void;
  onRemoveGroup: (label: string) => void;
  onClearAllGroups: () => void;
  onGroupedExport: () => void;
  isSummaryExporting: boolean;
}) {
  const [isExporting, setIsExporting] = useState(false);

  const selectedAds = useMemo(
    () => allAds.filter((ad) => selectedAdIds.has(ad.adId)),
    [allAds, selectedAdIds]
  );

  const summaryConfig = METRIC_PRESETS[activePreset].campaignSummary;

  const sums = useMemo(() => {
    const result: Record<string, number> = {};
    const keys = ["spend", "leads", "impressions", "reach", "purchases", "revenue", "clicks"];
    for (const k of keys) result[k] = 0;
    for (const ad of selectedAds) {
      for (const k of keys) {
        result[k] += (ad.metrics[k] as number) ?? 0;
      }
    }
    return result;
  }, [selectedAds]);

  const handleExportSelected = async () => {
    if (selectedAds.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      const res = await fetch("/api/ads/pdf/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ads: selectedAds,
          visibleMetrics: presetMetrics || visibleMetrics,
          accountName,
          accountId,
          dateRange,
          title: `Creative Report – ${accountName} (${selectedAds.length} נבחרות)`,
          currency,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "Failed to generate PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${accountName || "report"}-selected-${dateRange.since}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("הדוח הורד בהצלחה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת הדוח");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDirectSummaryExport = async () => {
    if (selectedAds.length === 0 || isSummaryExporting) return;
    onAddToGroup();
  };

  return (
    <>
      {(isExporting || isSummaryExporting) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl px-10 py-8 flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="text-sm text-zinc-600">מייצא דוח PDF...</span>
          </div>
        </div>
      )}

      {summaryGroups.length > 0 && (
        <div className="fixed bottom-[72px] left-4 right-4 z-50 bg-zinc-800 rounded-xl shadow-[0_-4px_20px_rgba(0,0,0,0.2)] px-5 py-3 flex items-center gap-3 flex-wrap" dir="rtl">
          <span className="text-sm font-medium text-zinc-300">קבוצות סיכום:</span>
          {summaryGroups.map((g) => (
            <div key={g.label} className="flex items-center gap-1.5 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1.5">
              <span className="text-sm font-semibold text-white">קבוצה {g.label}</span>
              <span className="text-xs text-zinc-400">({g.adIds.size} מודעות)</span>
              <button
                onClick={() => onRemoveGroup(g.label)}
                className="text-zinc-400 hover:text-red-400 transition-colors ms-1"
                aria-label={`הסר קבוצה ${g.label}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          <div className="w-px h-6 bg-zinc-600 mx-1" />

          <Button
            size="sm"
            className="gap-1.5 bg-[#1877F2] hover:bg-[#1668d9] text-white"
            onClick={onGroupedExport}
            disabled={isSummaryExporting}
          >
            {isSummaryExporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4" />
            )}
            ייצוא דוח מסוכם ({summaryGroups.length} קבוצות)
          </Button>

          <button
            onClick={onClearAllGroups}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            נקה הכל
          </button>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 shadow-[0_-4px_20px_rgba(0,0,0,0.25)]" dir="rtl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-sm px-3 py-1">
              {selectedAdIds.size}
            </Badge>
            <span className="text-sm font-medium text-zinc-200">מודעות נבחרות</span>
          </div>

          <div className="hidden sm:flex items-center gap-5 border-r border-zinc-700 pr-5">
            {summaryConfig.map((cfg) => {
              let value: number | null;
              if (cfg.aggregate === "sum") {
                value = sums[cfg.key] ?? 0;
              } else {
                const divisor = sums[cfg.divisorKey!] ?? 0;
                if (cfg.key === "roas") {
                  value = divisor > 0 ? (sums.revenue ?? 0) / divisor : null;
                } else if (cfg.key === "cpm") {
                  value = divisor > 0 ? ((sums.spend ?? 0) / divisor) * 1000 : null;
                } else {
                  value = divisor > 0 ? (sums.spend ?? 0) / divisor : null;
                }
              }
              return (
                <div key={cfg.key} className="flex flex-col items-start gap-0.5">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide">{cfg.label}</span>
                  <span className="text-sm font-semibold text-white tabular-nums" dir="ltr">
                    {value !== null && value !== undefined
                      ? formatMetricValue(value, cfg.format, currency)
                      : "–"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-2 ms-auto">
            <Button
              size="sm"
              className="gap-1.5 bg-white text-zinc-900 hover:bg-zinc-100"
              onClick={handleExportSelected}
              disabled={isExporting || selectedAds.length === 0}
              title="ייצוא מודעות נבחרות ל-PDF"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              ייצוא PDF
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  className="gap-1.5 bg-[#1877F2] hover:bg-[#1668d9] text-white"
                  disabled={selectedAds.length === 0}
                >
                  <FolderPlus className="h-4 w-4" aria-hidden="true" />
                  הוסף לקבוצה
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAddToGroup()}>
                  <Plus className="h-4 w-4 me-2" />
                  קבוצה חדשה
                </DropdownMenuItem>
                {summaryGroups.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {summaryGroups.map((g) => (
                      <DropdownMenuItem key={g.label} onClick={() => onAddToGroup(g.label)}>
                        קבוצה {g.label} ({g.adIds.size} מודעות)
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {summaryGroups.length === 0 && (
              <Button
                size="sm"
                className="gap-1.5 bg-zinc-700 text-zinc-200 hover:bg-zinc-600 border border-zinc-600"
                onClick={handleDirectSummaryExport}
                disabled={selectedAds.length === 0}
                title="דוח מסוכם — עמוד אחד עם נתונים מצטברים"
              >
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                דוח מסוכם
              </Button>
            )}

            <Button
              size="sm"
              className="gap-1.5 bg-zinc-700 text-zinc-300 hover:bg-zinc-600 border border-zinc-600"
              onClick={onClear}
              title="נקה בחירה"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              נקה בחירה
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------
// Page
// ------------------------------------------------------------------
function AdLibraryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hasToolAccess, loading: authLoading } = useAuth();

  const { accounts, isLoading: accountsLoading } = useFacebookAccounts();
  const selectedAccountId = useAdStore((s) => s.selectedAccountId);
  const setSelectedAccountId = useAdStore((s) => s.setSelectedAccountId);

  const dateRange = useAdStore((s) => s.dateRange);
  const setDateRange = useAdStore((s) => s.setDateRange);

  const [activePreset, setActivePreset] = useState<PresetKey>(() => {
    const p = searchParams.get("preset");
    return p && PRESET_KEYS.includes(p as PresetKey) ? (p as PresetKey) : DEFAULT_PRESET;
  });

  const presetMetrics = METRIC_PRESETS[activePreset].metrics;

  const activeTab = useAdStore((s) => s.activeTab);
  const setActiveTab = useAdStore((s) => s.setActiveTab);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [selectedCampaigns, setSelectedCampaigns] = useState<{ id: string; name: string }[]>([]);

  const [sortBy, setSortBy] = useState("spend");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [metricFilter, setMetricFilter] = useState<{
    metric: string;
    operator: "gt" | "lt" | "eq";
    value: number;
  } | null>(null);
  const [metricFilterOpen, setMetricFilterOpen] = useState(false);
  const [pendingMetric, setPendingMetric] = useState("leads");
  const [pendingOperator, setPendingOperator] = useState<"gt" | "lt" | "eq">("gt");
  const [pendingValue, setPendingValue] = useState("");

  const [selectedAdIds, setSelectedAdIds] = useState<Set<string>>(new Set());
  const toggleAdSelection = useCallback((adId: string) => {
    setSelectedAdIds((prev) => {
      const next = new Set(prev);
      if (next.has(adId)) {
        next.delete(adId);
      } else {
        next.add(adId);
      }
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedAdIds(new Set()), []);

  const [summaryGroups, setSummaryGroups] = useState<SummaryGroup[]>([]);
  const [isSummaryExporting, setIsSummaryExporting] = useState(false);

  const getNextGroupLabel = useCallback((): string => {
    const used = new Set(summaryGroups.map((g) => g.label));
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (const ch of letters) {
      if (!used.has(ch)) return ch;
    }
    return `G${summaryGroups.length + 1}`;
  }, [summaryGroups]);

  const addToGroup = useCallback((groupLabel?: string) => {
    if (selectedAdIds.size === 0) return;

    if (groupLabel) {
      setSummaryGroups((prev) =>
        prev.map((g) =>
          g.label === groupLabel
            ? { ...g, adIds: new Set([...g.adIds, ...selectedAdIds]) }
            : g
        )
      );
    } else {
      const label = getNextGroupLabel();
      setSummaryGroups((prev) => [...prev, { label, adIds: new Set(selectedAdIds) }]);
    }

    setSelectedAdIds(new Set());
  }, [selectedAdIds, getNextGroupLabel]);

  const removeGroup = useCallback((label: string) => {
    setSummaryGroups((prev) => prev.filter((g) => g.label !== label));
  }, []);

  const clearAllGroups = useCallback(() => {
    setSummaryGroups([]);
  }, []);

  const { visibleMetrics, toggleMetric, toggleCategory } = useColumnConfig();

  const { ads: rawAds, error, isLoading, refresh } = useAds(
    selectedAccountId,
    dateRange,
    activeTab === "ads" || activeTab === "campaigns",
  );

  const addCampaignToGroup = useCallback((campaignId: string, campaignName: string) => {
    const campaignAdsForGroup = rawAds.filter((ad) => ad.campaignId === campaignId);
    if (campaignAdsForGroup.length === 0) {
      toast.info("אין מודעות בקמפיין זה");
      return;
    }
    const label = getNextGroupLabel();
    const adIds = new Set(campaignAdsForGroup.map((ad) => ad.adId));
    setSummaryGroups((prev) => [...prev, { label, adIds }]);
    toast.success(`קמפיין "${campaignName}" נוסף כקבוצה ${label}`);
  }, [rawAds, getNextGroupLabel]);

  const handleGroupedSummaryExport = useCallback(async () => {
    if (summaryGroups.length === 0) return;
    setIsSummaryExporting(true);
    try {
      const groupsPayload = summaryGroups.map((g) => ({
        label: g.label,
        ads: rawAds.filter((ad) => g.adIds.has(ad.adId)),
      }));

      const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
      const res = await fetch("/api/ads/pdf/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groups: groupsPayload,
          visibleMetrics: METRIC_PRESETS[activePreset].metrics || visibleMetrics,
          accountName: selectedAccount?.name || "",
          accountId: selectedAccountId || "",
          dateRange: dateRange || { since: "", until: "" },
          currency: selectedAccount?.currency || "USD",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || "Failed to generate summary PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `summary-${selectedAccount?.name || "report"}-${dateRange?.since || "report"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("הדוח המסוכם הורד בהצלחה");
      clearAllGroups();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בייצוא");
    } finally {
      setIsSummaryExporting(false);
    }
  }, [summaryGroups, rawAds, activePreset, visibleMetrics, selectedAccountId, accounts, dateRange, clearAllGroups]);

  const filteredAds = useMemo(() => {
    let result = [...rawAds];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (ad) =>
          ad.adName.toLowerCase().includes(q) ||
          ad.adCopy?.toLowerCase().includes(q) ||
          ad.campaignName?.toLowerCase().includes(q)
      );
    }

    if (metricFilter) {
      result = result.filter((ad) => {
        const val = (ad.metrics[metricFilter.metric] as number) ?? 0;
        switch (metricFilter.operator) {
          case "gt": return val > metricFilter.value;
          case "lt": return val < metricFilter.value;
          case "eq": return val === metricFilter.value;
        }
      });
    }

    result = [...result].sort((a, b) => {
      if (sortBy === "name") {
        return sortDirection === "asc"
          ? a.adName.localeCompare(b.adName)
          : b.adName.localeCompare(a.adName);
      }
      const aVal = (a.metrics[sortBy] as number) ?? -1;
      const bVal = (b.metrics[sortBy] as number) ?? -1;
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [rawAds, searchQuery, sortBy, sortDirection, metricFilter]);

  const matchingCampaigns = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const seen = new Set<string>();
    return rawAds
      .filter((ad) => ad.campaignName?.toLowerCase().includes(q) && ad.campaignId && !seen.has(ad.campaignId) && seen.add(ad.campaignId))
      .map((ad) => ({ id: ad.campaignId, name: ad.campaignName }))
      .slice(0, 5);
  }, [searchQuery, rawAds]);

  const campaignSWRKeys = useMemo(() => {
    if (selectedCampaigns.length === 0 || !selectedAccountId) return [];
    return selectedCampaigns.map((c) => {
      const p = new URLSearchParams();
      p.set("account_id", selectedAccountId);
      p.set("campaign_id", c.id);
      p.set("since", dateRange.since);
      p.set("until", dateRange.until);
      return `/api/ads/facebook/ads?${p.toString()}`;
    });
  }, [selectedCampaigns, selectedAccountId, dateRange]);

  const c0 = useSWR<AdCreativeRow[]>(campaignSWRKeys[0] ?? null, adsFetcher, { revalidateOnFocus: false, dedupingInterval: 3600000 });
  const c1 = useSWR<AdCreativeRow[]>(campaignSWRKeys[1] ?? null, adsFetcher, { revalidateOnFocus: false, dedupingInterval: 3600000 });
  const c2 = useSWR<AdCreativeRow[]>(campaignSWRKeys[2] ?? null, adsFetcher, { revalidateOnFocus: false, dedupingInterval: 3600000 });
  const c3 = useSWR<AdCreativeRow[]>(campaignSWRKeys[3] ?? null, adsFetcher, { revalidateOnFocus: false, dedupingInterval: 3600000 });
  const c4 = useSWR<AdCreativeRow[]>(campaignSWRKeys[4] ?? null, adsFetcher, { revalidateOnFocus: false, dedupingInterval: 3600000 });
  const campaignSWRResults = [c0, c1, c2, c3, c4];

  const campaignAds = useMemo(() => {
    if (selectedCampaigns.length === 0) return [];
    const merged: AdCreativeRow[] = [];
    for (let i = 0; i < selectedCampaigns.length; i++) {
      const data = campaignSWRResults[i]?.data;
      if (data) merged.push(...data);
    }
    return merged;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaigns.length, c0.data, c1.data, c2.data, c3.data, c4.data]);

  const campaignLoading = selectedCampaigns.length > 0 && campaignSWRResults.slice(0, selectedCampaigns.length).some((r) => r.isLoading);

  const handleCampaignSelect = useCallback((campaign: { id: string; name: string }) => {
    setSelectedCampaigns((prev) => {
      const exists = prev.some((c) => c.id === campaign.id);
      if (exists) return prev.filter((c) => c.id !== campaign.id);
      if (prev.length >= 5) {
        toast.info("ניתן לבחור עד 5 קמפיינים");
        return prev;
      }
      return [...prev, campaign];
    });
  }, []);

  const removeCampaign = useCallback((id: string) => {
    setSelectedCampaigns((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const clearCampaignSearch = useCallback(() => {
    setSelectedCampaigns([]);
  }, []);

  const hasCampaignSearch = selectedCampaigns.length > 0;

  const allAdsForSelection = filteredAds;

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const handleRetry = useCallback(() => {
    toast.info("מנסה שוב...");
    refresh();
  }, [refresh]);

  const buildParams = useCallback(
    (overrides?: { account?: string | null; since?: string; until?: string; preset?: PresetKey }) => {
      const params = new URLSearchParams();
      const acct = overrides?.account !== undefined ? overrides.account : selectedAccountId;
      if (acct) params.set("account", acct);
      params.set("since", overrides?.since ?? dateRange.since);
      params.set("until", overrides?.until ?? dateRange.until);
      params.set("preset", overrides?.preset ?? activePreset);
      return params;
    },
    [selectedAccountId, dateRange, activePreset]
  );

  const handleAccountChange = useCallback(
    (accountId: string | null) => {
      setSelectedAccountId(accountId);
      router.replace(`?${buildParams({ account: accountId }).toString()}`);
    },
    [buildParams, router, setSelectedAccountId]
  );

  const handleDateRangeChange = useCallback(
    (range: DateRange) => {
      setDateRange(range);
      router.replace(`?${buildParams({ since: range.since, until: range.until }).toString()}`);
    },
    [buildParams, router, setDateRange]
  );

  const handlePresetChange = useCallback(
    (preset: PresetKey) => {
      setActivePreset(preset);
      router.replace(`?${buildParams({ preset }).toString()}`);
    },
    [buildParams, router]
  );

  const toggleSortDirection = () => {
    setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
  };

  const METRIC_FILTER_OPTIONS = [
    { value: "leads", label: "לידים" },
    { value: "spend", label: "הוצאה" },
    { value: "ctr", label: "CTR" },
    { value: "clicks", label: "הקלקות" },
    { value: "purchases", label: "רכישות" },
    { value: "impressions", label: "חשיפות" },
    { value: "cpl", label: "עלות ליד" },
    { value: "revenue", label: "הכנסות" },
  ];

  const OPERATOR_OPTIONS = [
    { value: "gt" as const, label: "גדול מ-" },
    { value: "lt" as const, label: "קטן מ-" },
    { value: "eq" as const, label: "שווה ל-" },
  ];

  const sortOptions = [
    { value: "spend", label: "הוצאה" },
    { value: "impressions", label: "חשיפות" },
    { value: "clicks", label: "קליקים" },
    { value: "ctr", label: "CTR" },
    { value: "roas", label: "ROAS" },
    { value: "leads", label: "לידים" },
    { value: "purchases", label: "רכישות" },
    { value: "name", label: "שם (א-ת)" },
  ];

  // Permission check AFTER all hooks
  if (!authLoading && !hasToolAccess('ads')) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h2 className="text-base font-medium text-zinc-700 mb-1">אין גישה לכלי זה</h2>
        <p className="text-sm text-zinc-400">פנה למנהל המערכת לקבלת הרשאה.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-zinc-500" aria-hidden="true" />
        <h1 className="text-xl font-bold tracking-tight">ספריית מודעות</h1>
        {filteredAds.length > 0 && (
          <Badge variant="secondary" className="ms-1">
            {filteredAds.length} מודעות
          </Badge>
        )}
      </div>

      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="ads" className="gap-1.5" title="ספריית מודעות">
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
            ספריית מודעות
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1.5" title="תצוגת קמפיינים">
            <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
            קמפיינים
          </TabsTrigger>
        </TabsList>

      <div className="flex flex-row-reverse flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1">
          <AccountSelector
            accounts={accounts}
            selectedAccountId={selectedAccountId}
            onAccountChange={handleAccountChange}
            isLoading={accountsLoading}
          />
          <HelpTip text="בחר את חשבון הפרסום שממנו תרצה לטעון מודעות. ניתן לנהל חשבונות בהגדרות." />
        </div>

        <div className="flex items-center gap-1">
          <DateRangePicker dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />
          <HelpTip text="טווח התאריכים קובע את תקופת המדדים (הוצאות, לידים וכו'). ברירת מחדל: 7 ימים אחרונים." />
        </div>

        <div className="flex items-center gap-1">
          <MetricPresetSelector value={activePreset} onChange={handlePresetChange} />
          <HelpTip text="בחר פריסט מטריקות מותאם לסוג הקמפיין: לידים, איקומרס או אנגייג'מנט." />
        </div>

        <div className="flex-1" />

        {searchOpen ? (
          <div className="relative">
            <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1.5">
              <Search className="h-4 w-4 text-zinc-400" aria-hidden="true" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => { setTimeout(() => { if (!searchQuery) setSearchOpen(false); }, 200); }}
                placeholder="חיפוש..."
                className="outline-none text-sm w-48 bg-transparent"
                autoFocus
                aria-label="חיפוש מודעות לפי שם או קופי"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} title="נקה חיפוש" className="flex items-center justify-center min-w-[44px] min-h-[44px] cursor-pointer rounded-lg hover:bg-zinc-100 transition-colors duration-200">
                  <X className="h-3 w-3 text-zinc-400" />
                </button>
              )}
            </div>
            {matchingCampaigns.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-zinc-200 rounded-lg shadow-lg z-50 overflow-hidden" dir="rtl">
                <p className="px-3 py-1.5 text-[11px] text-zinc-400 font-medium border-b border-zinc-100">טען את כל מודעות הקמפיין</p>
                {matchingCampaigns.map((c) => {
                  const isSelected = selectedCampaigns.some((sc) => sc.id === c.id);
                  return (
                    <button
                      key={c.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleCampaignSelect(c)}
                      className={`w-full text-right px-3 py-2.5 text-sm hover:bg-blue-50 transition-colors duration-150 cursor-pointer flex items-center gap-2 ${isSelected ? "bg-blue-50" : ""}`}
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" aria-hidden="true" />
                      ) : (
                        <Megaphone className="h-3.5 w-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                      )}
                      <span className="truncate">{c.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border hover:bg-zinc-50 cursor-pointer transition-colors duration-200"
            title="חיפוש מודעות"
            aria-label="חיפוש מודעות"
          >
            <Search className="h-4 w-4 text-zinc-500" />
          </button>
        )}

        <ExportButton
          ads={filteredAds}
          visibleMetrics={visibleMetrics}
          presetMetrics={presetMetrics}
          accountName={selectedAccount?.name || ""}
          accountId={selectedAccountId || ""}
          dateRange={dateRange}
          disabled={filteredAds.length === 0 || !selectedAccountId}
          currency={selectedAccount?.currency || "USD"}
        />
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => refresh()}
          disabled={isLoading || !selectedAccountId}
          aria-label="רענון נתוני מודעות"
          title="רענון מודעות"
        >
          {isLoading ? (
            <div
              className="h-4 w-4 rounded-full border-2 border-zinc-200 animate-spin"
              style={{ borderTopColor: "#1877F2", borderRightColor: "#1877F2" }}
              aria-hidden="true"
            />
          ) : (
            <RefreshCcw className="h-4 w-4" aria-hidden="true" />
          )}
          <span className="hidden sm:inline">רענון</span>
        </Button>
      </div>

      <div className="flex flex-row-reverse flex-wrap items-center gap-4 py-2 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-3.5 w-3.5 text-zinc-400" aria-hidden="true" />
          <span className="text-sm text-zinc-500">מיון לפי</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="h-8 w-36 text-sm" aria-label="מיון לפי מטריקה" title="מיון לפי">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="min-w-[44px] min-h-[44px] p-0 cursor-pointer"
            onClick={toggleSortDirection}
            aria-label={sortDirection === "asc" ? "סדר עולה" : "סדר יורד"}
            title={sortDirection === "asc" ? "סדר עולה" : "סדר יורד"}
          >
            {sortDirection === "asc" ? "↑" : "↓"}
          </Button>
        </div>

        <div className="w-px h-6 bg-zinc-200" aria-hidden="true" />

        <div className="flex items-center gap-2">
          <Popover open={metricFilterOpen} onOpenChange={setMetricFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={`gap-1.5 h-8 ${metricFilter ? "border-blue-300 bg-blue-50 text-blue-700" : ""}`}
                title="פילטר מתקדם"
              >
                <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="text-sm">פילטר</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-4 space-y-3" dir="rtl">
              <p className="text-sm font-medium">פילטר לפי מטריקה</p>
              <Select value={pendingMetric} onValueChange={setPendingMetric}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METRIC_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={pendingOperator} onValueChange={(v) => setPendingOperator(v as "gt" | "lt" | "eq")}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATOR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                placeholder="ערך"
                value={pendingValue}
                onChange={(e) => setPendingValue(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!pendingValue}
                  onClick={() => {
                    setMetricFilter({ metric: pendingMetric, operator: pendingOperator, value: Number(pendingValue) });
                    setMetricFilterOpen(false);
                  }}
                >
                  החל פילטר
                </Button>
                {metricFilter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMetricFilter(null);
                      setPendingValue("");
                      setMetricFilterOpen(false);
                    }}
                  >
                    נקה
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {metricFilter && (
            <Badge variant="secondary" className="gap-1 bg-blue-50 text-blue-700 border-blue-200">
              {METRIC_FILTER_OPTIONS.find((o) => o.value === metricFilter.metric)?.label}{" "}
              {OPERATOR_OPTIONS.find((o) => o.value === metricFilter.operator)?.label}{" "}
              {metricFilter.value}
              <button
                onClick={() => { setMetricFilter(null); setPendingValue(""); }}
                title="הסר פילטר"
                aria-label="הסר פילטר"
                className="flex items-center justify-center min-w-[24px] min-h-[24px] cursor-pointer rounded hover:bg-blue-100 transition-colors duration-200"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>

        {selectedAccountId && !isLoading && !hasCampaignSearch && (
          <span className="text-sm text-zinc-400 me-auto">
            מציג {filteredAds.length} מודעות
          </span>
        )}
      </div>

      {error && (
        <ErrorBanner
          message={error instanceof Error ? error.message : "אירעה שגיאה בלתי צפויה."}
          onRetry={handleRetry}
        />
      )}

      {accountsLoading && (
        <SyncProgress message="טוען חשבונות..." subtitle="מתחבר לפייסבוק" />
      )}

      {!selectedAccountId && !accountsLoading && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <LayoutGrid className="h-12 w-12 text-zinc-200 mb-4" aria-hidden="true" />
          <h2 className="text-base font-medium text-zinc-700 mb-1">בחר חשבון מודעות</h2>
          <p className="text-sm text-zinc-400 mb-2">
            בחר חשבון מהתפריט למעלה כדי לצפות במודעות שלו.
          </p>
          <p className="text-xs text-zinc-300">
            חבר את חשבון הפייסבוק שלך דרך הגדרות &gt; חיבורים, ואז בחר חשבון מודעות.
          </p>
        </div>
      )}

      {hasCampaignSearch && (
        <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg mt-2" dir="rtl">
          <Megaphone className="h-4 w-4 text-blue-600 shrink-0" aria-hidden="true" />
          {selectedCampaigns.map((c) => (
            <Badge key={c.id} variant="secondary" className="gap-1 bg-blue-100 text-blue-800 border-blue-200">
              {c.name}
              <button
                onClick={() => removeCampaign(c.id)}
                title={`הסר ${c.name}`}
                className="flex items-center justify-center cursor-pointer rounded hover:bg-blue-200 transition-colors duration-150"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <span className="flex-1" />
          {campaignLoading && (
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" aria-hidden="true" />
          )}
          <span className="text-xs text-blue-500">
            {campaignAds.length > 0 ? `${campaignAds.length} מודעות` : campaignLoading ? "טוען..." : ""}
          </span>
          <button
            onClick={clearCampaignSearch}
            className="flex items-center justify-center min-w-[32px] min-h-[32px] cursor-pointer rounded-md hover:bg-blue-100 transition-colors duration-200"
            title="נקה הכל"
            aria-label="נקה הכל"
          >
            <XCircle className="h-4 w-4 text-blue-500" aria-hidden="true" />
          </button>
        </div>
      )}

      {(selectedAccountId || isLoading) && !error && (
        <>
          <TabsContent value="ads" className="mt-0">
            <AdGrid
              ads={hasCampaignSearch ? campaignAds : filteredAds}
              loading={hasCampaignSearch ? campaignLoading : isLoading}
              selectedMetrics={visibleMetrics}
              presetMetrics={presetMetrics}
              accountName={selectedAccount?.name}
              dateRange={dateRange}
              currency={selectedAccount?.currency || "USD"}
            />
          </TabsContent>

          <TabsContent value="campaigns" className="mt-0">
            <CampaignView
              ads={hasCampaignSearch ? campaignAds : rawAds}
              selectedMetrics={visibleMetrics}
              presetMetrics={presetMetrics}
              activePreset={activePreset}
              loading={hasCampaignSearch ? campaignLoading : isLoading}
              accountName={selectedAccount?.name}
              dateRange={dateRange}
              currency={selectedAccount?.currency || "USD"}
              accountId={selectedAccountId}
              selectedAdIds={selectedAdIds}
              onToggleAd={toggleAdSelection}
              summaryGroups={summaryGroups}
              onAddCampaignToGroup={addCampaignToGroup}
            />
          </TabsContent>
        </>
      )}
      </Tabs>

      {(selectedAdIds.size > 0 || summaryGroups.length > 0) && (
        <SelectionSummaryBar
          selectedAdIds={selectedAdIds}
          allAds={allAdsForSelection}
          activePreset={activePreset}
          currency={selectedAccount?.currency || "USD"}
          accountName={selectedAccount?.name || ""}
          accountId={selectedAccountId || ""}
          dateRange={dateRange}
          presetMetrics={presetMetrics}
          visibleMetrics={visibleMetrics}
          onClear={clearSelection}
          summaryGroups={summaryGroups}
          onAddToGroup={addToGroup}
          onRemoveGroup={removeGroup}
          onClearAllGroups={clearAllGroups}
          onGroupedExport={handleGroupedSummaryExport}
          isSummaryExporting={isSummaryExporting}
        />
      )}
    </div>
  );
}

export default function AdLibraryPage() {
  return (
    <Suspense>
      <AdLibraryContent />
    </Suspense>
  );
}
