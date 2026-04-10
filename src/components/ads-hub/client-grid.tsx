'use client';

import { useState, useEffect, useMemo } from 'react';
import { Eye, Filter, ChevronsDownUp, ChevronsUpDown } from 'lucide-react';
import { ClientCard, type AdsHubClientRow } from './client-card';
import { Button } from '@/components/cpa/ui/button';
import { Checkbox } from '@/components/cpa/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/cpa/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/cpa/ui/select';

interface ClientGridProps {
  clients: AdsHubClientRow[];
  loading?: boolean;
}

type SortOption = 'default' | 'spend-desc' | 'spend-asc' | 'conversions-desc' | 'cpl-asc';

const HIDDEN_KEY = 'ads-hub-hidden-cards';
const COLLAPSED_KEY = 'ads-hub-collapsed-cards';

const loadSet = (key: string): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(key);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

const saveSet = (key: string, set: Set<string>) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify([...set]));
};

export const ClientGrid = ({ clients, loading }: ClientGridProps) => {
  const [hiddenIds, setHiddenIdsState] = useState<Set<string>>(new Set());
  const [collapsedIds, setCollapsedIdsState] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<SortOption>('spend-desc');

  useEffect(() => {
    setHiddenIdsState(loadSet(HIDDEN_KEY));
    setCollapsedIdsState(loadSet(COLLAPSED_KEY));
  }, []);

  const updateHidden = (next: Set<string>) => {
    setHiddenIdsState(new Set(next));
    saveSet(HIDDEN_KEY, next);
  };

  const updateCollapsed = (next: Set<string>) => {
    setCollapsedIdsState(new Set(next));
    saveSet(COLLAPSED_KEY, next);
  };

  const toggleHidden = (id: string) => {
    const next = new Set(hiddenIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateHidden(next);
  };

  const toggleCollapsed = (id: string) => {
    const next = new Set(collapsedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    updateCollapsed(next);
  };

  const visibleClients = useMemo(() => {
    const filtered = clients.filter((c) => !hiddenIds.has(String(c.id)));
    const sorted = [...filtered];

    switch (sortOption) {
      case 'spend-desc':
        sorted.sort((a, b) => Number(b.total_spend) - Number(a.total_spend));
        break;
      case 'spend-asc':
        sorted.sort((a, b) => Number(a.total_spend) - Number(b.total_spend));
        break;
      case 'conversions-desc':
        sorted.sort((a, b) => Number(b.total_conversions) - Number(a.total_conversions));
        break;
      case 'cpl-asc':
        sorted.sort((a, b) => {
          const aCpl = a.cpl ?? Infinity;
          const bCpl = b.cpl ?? Infinity;
          return Number(aCpl) - Number(bCpl);
        });
        break;
    }
    return sorted;
  }, [clients, hiddenIds, sortOption]);

  const allCollapsed = visibleClients.length > 0 && visibleClients.every((c) => collapsedIds.has(String(c.id)));

  const handleToggleAll = () => {
    if (allCollapsed) {
      updateCollapsed(new Set());
    } else {
      updateCollapsed(new Set(visibleClients.map((c) => String(c.id))));
    }
  };

  const hiddenCount = hiddenIds.size;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <p style={{ color: 'var(--text-secondary)' }}>
          אין לקוחות עדיין. הוסיפו לקוח חדש בהגדרות.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Client visibility filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <Filter className="h-3.5 w-3.5" />
              לקוחות מוצגים
              {hiddenCount > 0 && (
                <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full">
                  {hiddenCount} מוסתרים
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {clients.map((c) => {
                const id = String(c.id);
                const isHidden = hiddenIds.has(id);
                return (
                  <label
                    key={id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-gray-50"
                  >
                    <Checkbox
                      checked={!isHidden}
                      onCheckedChange={() => toggleHidden(id)}
                    />
                    <span className="text-sm flex-1">{c.name}</span>
                  </label>
                );
              })}
              {hiddenCount > 0 && (
                <button
                  onClick={() => updateHidden(new Set())}
                  className="w-full text-xs text-[#2563a0] hover:underline pt-2 border-t mt-2"
                >
                  הצג את כולם
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Collapse/Expand all */}
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleToggleAll}>
          {allCollapsed ? (
            <>
              <ChevronsUpDown className="h-3.5 w-3.5" />
              פתח הכל
            </>
          ) : (
            <>
              <ChevronsDownUp className="h-3.5 w-3.5" />
              כווץ הכל
            </>
          )}
        </Button>

        {/* Sort */}
        <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
          <SelectTrigger className="h-8 min-w-[140px] text-xs">
            <SelectValue placeholder="מיון" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="spend-desc">הוצאה (גבוה לנמוך)</SelectItem>
            <SelectItem value="spend-asc">הוצאה (נמוך לגבוה)</SelectItem>
            <SelectItem value="conversions-desc">המרות</SelectItem>
            <SelectItem value="cpl-asc">CPL (נמוך לגבוה)</SelectItem>
            <SelectItem value="default">ברירת מחדל</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <span className="text-xs text-muted-foreground">
          <Eye className="inline-block h-3 w-3 ml-1" />
          {visibleClients.length} מתוך {clients.length}
        </span>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleClients.map((client) => {
          const id = String(client.id);
          return (
            <ClientCard
              key={id}
              client={client}
              isCollapsed={collapsedIds.has(id)}
              onToggleCollapse={() => toggleCollapsed(id)}
              onHide={() => toggleHidden(id)}
            />
          );
        })}
      </div>
    </div>
  );
};
