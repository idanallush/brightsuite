"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR from "swr";
import { Eye, EyeOff, Filter, ChevronsDownUp, ChevronsUpDown, Bookmark, Trash2, Save, LayoutGrid, TableProperties } from "lucide-react";
import type { ClientCardData, CpaStatus } from "@/lib/cpa/types/dashboard";
import { ClientCard } from "@/components/cpa/dashboard/client-card";
import { TableView } from "@/components/cpa/dashboard/table-view";
import { Button } from "@/components/cpa/ui/button";
import { Checkbox } from "@/components/cpa/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/cpa/ui/dialog";

// Server-backed saved view. payload carries the per-view UI state — currently
// just the visible client-id list, but kept open for future fields (sort/etc.).
interface SavedViewPayload {
  clientIds: string[];
}

interface SavedView {
  id: number;
  name: string;
  payload: SavedViewPayload;
  isDefault: boolean;
}

const VIEWS_ENDPOINT = "/api/cpa/views";
const LEGACY_VIEWS_KEY = "cpa-saved-views";
const LEGACY_MIGRATED_FLAG = "cpa-saved-views-migrated";

interface RawServerView {
  id: number;
  name: string;
  payload: unknown;
  isDefault: boolean;
}

function normalizeServerView(raw: RawServerView): SavedView {
  const p = raw.payload as { clientIds?: unknown } | null;
  const clientIds =
    p && Array.isArray(p.clientIds) ? p.clientIds.filter((x): x is string => typeof x === "string") : [];
  return {
    id: raw.id,
    name: raw.name,
    payload: { clientIds },
    isDefault: Boolean(raw.isDefault),
  };
}

async function viewsFetcher(url: string): Promise<SavedView[]> {
  const res = await fetch(url);
  if (!res.ok) {
    // Fall back to empty list rather than throwing — keeps the dashboard render
    // path alive when the views endpoint is unreachable.
    return [];
  }
  const data = (await res.json().catch(() => ({}))) as { views?: RawServerView[] };
  return Array.isArray(data.views) ? data.views.map(normalizeServerView) : [];
}

function getHiddenCards(): Set<string> {
  try {
    const stored = localStorage.getItem("cpa-hidden-cards");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (err) {
    console.warn("[cpa] failed to parse cpa-hidden-cards from localStorage:", err);
    return new Set();
  }
}

function setHiddenCards(ids: Set<string>) {
  localStorage.setItem("cpa-hidden-cards", JSON.stringify([...ids]));
}

function getCollapsedCards(): Set<string> {
  try {
    const stored = localStorage.getItem("cpa-collapsed-cards");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (err) {
    console.warn("[cpa] failed to parse cpa-collapsed-cards from localStorage:", err);
    return new Set();
  }
}

function setCollapsedCards(ids: Set<string>) {
  localStorage.setItem("cpa-collapsed-cards", JSON.stringify([...ids]));
}

// Read legacy localStorage views; tolerant to the old shape `{ name, clientIds }`.
function readLegacyViews(): { name: string; clientIds: string[] }[] {
  try {
    const stored = localStorage.getItem(LEGACY_VIEWS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (v): v is { name: string; clientIds: string[] } =>
          v && typeof v.name === "string" && Array.isArray(v.clientIds),
      )
      .map((v) => ({
        name: v.name,
        clientIds: v.clientIds.filter((x: unknown): x is string => typeof x === "string"),
      }));
  } catch {
    return [];
  }
}

type ViewMode = "grid" | "table";
type SortOption = "default" | "status-red" | "status-green" | "spend-desc" | "spend-asc" | "cpa-desc" | "cpa-asc";

function getViewMode(): ViewMode {
  try {
    const stored = localStorage.getItem("cpa-view-mode");
    return stored === "table" ? "table" : "grid";
  } catch {
    return "grid";
  }
}

const STATUS_ORDER: Record<CpaStatus, number> = {
  red: 0,
  yellow: 1,
  green: 2,
  no_data: 3,
};

function getWorstStatus(card: ClientCardData): CpaStatus {
  if (card.topics.length === 0) return "no_data";
  let worst: CpaStatus = "no_data";
  for (const t of card.topics) {
    if (STATUS_ORDER[t.status] < STATUS_ORDER[worst]) worst = t.status;
  }
  return worst;
}

function sortCards(cards: ClientCardData[], option: SortOption): ClientCardData[] {
  if (option === "default") return cards;
  const arr = [...cards];
  switch (option) {
    case "status-red":
      return arr.sort((a, b) => STATUS_ORDER[getWorstStatus(a)] - STATUS_ORDER[getWorstStatus(b)]);
    case "status-green":
      return arr.sort((a, b) => STATUS_ORDER[getWorstStatus(b)] - STATUS_ORDER[getWorstStatus(a)]);
    case "spend-desc":
      return arr.sort((a, b) => b.total_spend - a.total_spend);
    case "spend-asc":
      return arr.sort((a, b) => a.total_spend - b.total_spend);
    case "cpa-desc":
      return arr.sort((a, b) => (b.overall_cpa ?? -1) - (a.overall_cpa ?? -1));
    case "cpa-asc":
      return arr.sort((a, b) => (a.overall_cpa ?? Infinity) - (b.overall_cpa ?? Infinity));
    default:
      return arr;
  }
}

interface DashboardGridProps {
  cards: ClientCardData[];
}

export function DashboardGrid({ cards }: DashboardGridProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortOption, setSortOption] = useState<SortOption>("default");

  // Server-driven saved views via SWR. Fallback path: on fetch failure we
  // surface an empty list so the rest of the dashboard still renders.
  const {
    data: savedViews = [],
    mutate: mutateViews,
  } = useSWR<SavedView[]>(VIEWS_ENDPOINT, viewsFetcher, {
    revalidateOnFocus: false,
  });

  // Load per-device UI state from localStorage on mount (hidden / collapsed /
  // viewMode stay local — they're per-device, not per-user).
  useEffect(() => {
    setHidden(getHiddenCards());
    setCollapsed(getCollapsedCards());
    setViewMode(getViewMode());
  }, []);

  // One-shot localStorage → server migration. Runs after the SWR fetch resolves.
  // Logic:
  //   1. If server already has views → set the migrated flag and skip (covers
  //      the "server has views but legacy flag is missing" case — e.g. user
  //      already migrated on another device and now hits a fresh browser).
  //   2. If server is empty AND the migrated flag isn't set AND localStorage
  //      has legacy views → POST them as a batch, then delete the legacy key.
  //   3. Either way, set the migrated flag so we don't re-attempt on next load.
  useEffect(() => {
    if (savedViews === undefined) return; // SWR still loading
    if (typeof window === "undefined") return;

    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem(LEGACY_MIGRATED_FLAG) === "1") return;

        if (savedViews.length > 0) {
          localStorage.setItem(LEGACY_MIGRATED_FLAG, "1");
          localStorage.removeItem(LEGACY_VIEWS_KEY);
          return;
        }

        const legacy = readLegacyViews();
        if (legacy.length === 0) {
          localStorage.setItem(LEGACY_MIGRATED_FLAG, "1");
          return;
        }

        const res = await fetch(VIEWS_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            views: legacy.map((v) => ({
              name: v.name,
              payload: { clientIds: v.clientIds },
              isDefault: false,
            })),
          }),
        });
        if (cancelled) return;
        if (res.ok) {
          localStorage.setItem(LEGACY_MIGRATED_FLAG, "1");
          localStorage.removeItem(LEGACY_VIEWS_KEY);
          await mutateViews();
        }
      } catch (err) {
        console.warn("[cpa] saved-views migration failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // We only want this to run once SWR has produced its first value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedViews.length === 0]);

  function handleViewModeChange(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem("cpa-view-mode", mode);
  }

  function toggleCollapse(clientId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      setCollapsedCards(next);
      return next;
    });
  }

  function collapseAll() {
    const visibleIds = new Set(cards.filter((c) => !hidden.has(c.client_id)).map((c) => c.client_id));
    setCollapsed((prev) => {
      const next = new Set([...prev, ...visibleIds]);
      setCollapsedCards(next);
      return next;
    });
  }

  function expandAll() {
    setCollapsed(new Set());
    setCollapsedCards(new Set());
  }

  function hideCard(clientId: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      next.add(clientId);
      setHiddenCards(next);
      return next;
    });
  }

  function toggleVisibility(clientId: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      setHiddenCards(next);
      return next;
    });
  }

  function showAll() {
    setHidden(new Set());
    setHiddenCards(new Set());
  }

  function hideAll() {
    const allIds = new Set(cards.map((c) => c.client_id));
    setHidden(allIds);
    setHiddenCards(allIds);
  }

  async function handleSaveView() {
    const name = newViewName.trim();
    if (!name) return;
    const visibleIds = cards.filter((c) => !hidden.has(c.client_id)).map((c) => c.client_id);
    const optimistic: SavedView = {
      id: -Date.now(),
      name,
      payload: { clientIds: visibleIds },
      isDefault: false,
    };

    setNewViewName("");
    setSaveDialogOpen(false);

    try {
      await mutateViews(
        async (current = []) => {
          const res = await fetch(VIEWS_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              payload: { clientIds: visibleIds },
              isDefault: false,
            }),
          });
          if (!res.ok) throw new Error(await res.text());
          const body = (await res.json()) as { view: RawServerView };
          return [...current.filter((v) => v.id !== optimistic.id), normalizeServerView(body.view)];
        },
        {
          optimisticData: (current = []) => [...current, optimistic],
          rollbackOnError: true,
          revalidate: false,
        },
      );
    } catch (err) {
      console.warn("[cpa] save view failed:", err);
    }
  }

  function applyView(view: SavedView) {
    const visibleSet = new Set(view.payload.clientIds);
    const newHidden = new Set(cards.filter((c) => !visibleSet.has(c.client_id)).map((c) => c.client_id));
    setHidden(newHidden);
    setHiddenCards(newHidden);
  }

  async function deleteView(viewId: number) {
    try {
      await mutateViews(
        async (current = []) => {
          const res = await fetch(`${VIEWS_ENDPOINT}/${viewId}`, { method: "DELETE" });
          if (!res.ok && res.status !== 404) throw new Error(await res.text());
          return current.filter((v) => v.id !== viewId);
        },
        {
          optimisticData: (current = []) => current.filter((v) => v.id !== viewId),
          rollbackOnError: true,
          revalidate: false,
        },
      );
    } catch (err) {
      console.warn("[cpa] delete view failed:", err);
    }
  }

  const visibleCards = useMemo(() => cards.filter((c) => !hidden.has(c.client_id)), [cards, hidden]);
  const sortedVisibleCards = useMemo(() => sortCards(visibleCards, sortOption), [visibleCards, sortOption]);
  const hiddenCount = cards.length - visibleCards.length;
  const allCollapsed = visibleCards.length > 0 && visibleCards.every((c) => collapsed.has(c.client_id));

  return (
    <div className="space-y-4">
      {/* Filter bar + collapse/expand + saved views */}
      {cards.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Client filter popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Filter className="h-3.5 w-3.5" />
                לקוחות מוצגים
                {hiddenCount > 0 && (
                  <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {hiddenCount} מוסתרים
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0" align="end">
              <div className="p-3 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  בחר לקוחות להצגה
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto p-2 space-y-0.5">
                {cards.map((card) => {
                  const isVisible = !hidden.has(card.client_id);
                  return (
                    <label
                      key={card.client_id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-neutral-50 cursor-pointer text-sm"
                    >
                      <Checkbox
                        checked={isVisible}
                        onCheckedChange={() => toggleVisibility(card.client_id)}
                        className="data-[state=checked]:bg-[#1877F2] data-[state=checked]:border-[#1877F2]"
                      />
                      <span className={isVisible ? "font-medium" : "text-muted-foreground"}>
                        {card.client_name}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="p-2 border-t flex gap-2">
                <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={showAll}>
                  <Eye className="h-3 w-3" />
                  הצג הכל
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 h-7 text-xs" onClick={hideAll}>
                  <EyeOff className="h-3 w-3" />
                  הסתר הכל
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Saved views dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Bookmark className="h-3.5 w-3.5" />
                תצוגות שמורות
                {savedViews.length > 0 && (
                  <span className="bg-blue-100 text-[#1877F2] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {savedViews.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <div className="p-3 border-b flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  תצוגות שמורות
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] text-[#1877F2]"
                  onClick={() => setSaveDialogOpen(true)}
                >
                  <Save className="h-3 w-3" />
                  שמור תצוגה
                </Button>
              </div>
              {savedViews.length === 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  אין תצוגות שמורות
                </div>
              ) : (
                <div className="p-2 space-y-0.5 max-h-48 overflow-y-auto">
                  {savedViews.map((view) => (
                    <div
                      key={view.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-50 group"
                    >
                      <button
                        className="flex-1 text-start text-sm font-medium"
                        onClick={() => applyView(view)}
                      >
                        {view.name}
                        <span className="text-[10px] text-muted-foreground ms-1">
                          ({view.payload.clientIds.length})
                        </span>
                      </button>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                        onClick={() => deleteView(view.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Collapse / Expand all */}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            onClick={allCollapsed ? expandAll : collapseAll}
          >
            {allCollapsed ? (
              <ChevronsUpDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronsDownUp className="h-3.5 w-3.5" />
            )}
            {allCollapsed ? "פתח הכל" : "כווץ הכל"}
          </Button>

          {/* Sort dropdown - grid view only */}
          {viewMode === "grid" && (
            <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
              <SelectTrigger className="h-8 w-auto min-w-[160px] text-xs">
                <SelectValue placeholder="מיון" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">ברירת מחדל</SelectItem>
                <SelectItem value="status-red">סטטוס — אדום קודם</SelectItem>
                <SelectItem value="status-green">סטטוס — ירוק קודם</SelectItem>
                <SelectItem value="spend-desc">הוצאה — גבוה לנמוך</SelectItem>
                <SelectItem value="spend-asc">הוצאה — נמוך לגבוה</SelectItem>
                <SelectItem value="cpa-desc">CPA — גבוה לנמוך</SelectItem>
                <SelectItem value="cpa-asc">CPA — נמוך לגבוה</SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* View mode toggle */}
          <div className="flex items-center border border-neutral-200 rounded-md overflow-hidden">
            <button
              className={`h-8 px-2 flex items-center justify-center transition-colors ${viewMode === "grid" ? "bg-neutral-100 text-neutral-900" : "text-neutral-400 hover:text-neutral-600"}`}
              onClick={() => handleViewModeChange("grid")}
              aria-label="תצוגת כרטיסים"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              className={`h-8 px-2 flex items-center justify-center transition-colors ${viewMode === "table" ? "bg-neutral-100 text-neutral-900" : "text-neutral-400 hover:text-neutral-600"}`}
              onClick={() => handleViewModeChange("table")}
              aria-label="תצוגת טבלה"
            >
              <TableProperties className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1" />
        </div>
      )}

      {/* Hidden cards notice */}
      {hiddenCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 flex items-center gap-2">
          <EyeOff className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-700 flex-1">
            {hiddenCount} לקוחות מוסתרים
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-100"
            onClick={showAll}
          >
            הצג הכל
          </Button>
        </div>
      )}

      {/* Cards grid or table view */}
      {viewMode === "table" ? (
        <TableView cards={sortedVisibleCards} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedVisibleCards.map((card) => (
            <ClientCard
              key={card.client_id}
              data={card}
              isCollapsed={collapsed.has(card.client_id)}
              onToggleCollapse={() => toggleCollapse(card.client_id)}
              onHide={() => hideCard(card.client_id)}
            />
          ))}
        </div>
      )}

      {/* Save view dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>שמור תצוגה</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="שם התצוגה (למשל: לקוחות פרימיום)"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveView()}
            />
            <p className="text-xs text-muted-foreground">
              {visibleCards.length} לקוחות מוצגים יישמרו בתצוגה זו
            </p>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">ביטול</Button>
            </DialogClose>
            <Button
              onClick={handleSaveView}
              disabled={!newViewName.trim()}
              className="bg-[#1877F2] hover:bg-[#1565C0] text-white"
            >
              <Save className="h-4 w-4" />
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
