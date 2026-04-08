"use client";

import { useState, useEffect } from "react";
import { Eye, EyeOff, Filter, ChevronsDownUp, ChevronsUpDown, Bookmark, Trash2, Save } from "lucide-react";
import type { ClientCardData } from "@/lib/cpa/types/dashboard";
import { ClientCard } from "@/components/cpa/dashboard/client-card";
import { Button } from "@/components/cpa/ui/button";
import { Checkbox } from "@/components/cpa/ui/checkbox";
import { Input } from "@/components/cpa/ui/input";
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

interface SavedView {
  name: string;
  clientIds: string[];
}

function getHiddenCards(): Set<string> {
  try {
    const stored = localStorage.getItem("cpa-hidden-cards");
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
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
  } catch {
    return new Set();
  }
}

function setCollapsedCards(ids: Set<string>) {
  localStorage.setItem("cpa-collapsed-cards", JSON.stringify([...ids]));
}

function getSavedViews(): SavedView[] {
  try {
    const stored = localStorage.getItem("cpa-saved-views");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setSavedViews(views: SavedView[]) {
  localStorage.setItem("cpa-saved-views", JSON.stringify(views));
}

interface DashboardGridProps {
  cards: ClientCardData[];
}

export function DashboardGrid({ cards }: DashboardGridProps) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [savedViews, setSavedViewsState] = useState<SavedView[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // Load from localStorage on mount
  useEffect(() => {
    setHidden(getHiddenCards());
    setCollapsed(getCollapsedCards());
    setSavedViewsState(getSavedViews());
  }, []);

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

  function handleSaveView() {
    if (!newViewName.trim()) return;
    const visibleIds = cards.filter((c) => !hidden.has(c.client_id)).map((c) => c.client_id);
    const newView: SavedView = { name: newViewName.trim(), clientIds: visibleIds };
    const updated = [...savedViews, newView];
    setSavedViewsState(updated);
    setSavedViews(updated);
    setNewViewName("");
    setSaveDialogOpen(false);
  }

  function applyView(view: SavedView) {
    const visibleSet = new Set(view.clientIds);
    const newHidden = new Set(cards.filter((c) => !visibleSet.has(c.client_id)).map((c) => c.client_id));
    setHidden(newHidden);
    setHiddenCards(newHidden);
  }

  function deleteView(index: number) {
    const updated = savedViews.filter((_, i) => i !== index);
    setSavedViewsState(updated);
    setSavedViews(updated);
  }

  const visibleCards = cards.filter((c) => !hidden.has(c.client_id));
  const hiddenCount = cards.length - visibleCards.length;
  const allCollapsed = visibleCards.length > 0 && visibleCards.every((c) => collapsed.has(c.client_id));

  return (
    <div className="space-y-4">
      {/* Filter bar + collapse/expand + saved views */}
      {cards.length > 0 && (
        <div className="flex flex-row-reverse flex-wrap items-center gap-2">
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
                  {savedViews.map((view, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-50 group"
                    >
                      <button
                        className="flex-1 text-start text-sm font-medium"
                        onClick={() => applyView(view)}
                      >
                        {view.name}
                        <span className="text-[10px] text-muted-foreground ms-1">
                          ({view.clientIds.length})
                        </span>
                      </button>
                      <button
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-opacity"
                        onClick={() => deleteView(idx)}
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

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleCards.map((card) => (
          <ClientCard
            key={card.client_id}
            data={card}
            isCollapsed={collapsed.has(card.client_id)}
            onToggleCollapse={() => toggleCollapse(card.client_id)}
            onHide={() => hideCard(card.client_id)}
          />
        ))}
      </div>

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
