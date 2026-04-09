"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import type { ClientCardData, CpaStatus } from "@/lib/cpa/types/dashboard";
import { formatCurrency, formatNumber } from "@/lib/cpa/format";
import { CpaBadge } from "@/components/cpa/dashboard/cpa-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/cpa/ui/table";

type SortKey = "client_name" | "spend" | "conversions" | "cpa" | "tcpa" | "overshoot" | "status";
type SortDir = "asc" | "desc";

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

function getOvershootPercent(card: ClientCardData): number | null {
  const topic = card.topics[0];
  if (!topic || topic.cpa === null || topic.tcpa === null || topic.tcpa === 0) return null;
  return ((topic.cpa - topic.tcpa) / topic.tcpa) * 100;
}

function getPrimaryTcpa(card: ClientCardData): number | null {
  return card.topics[0]?.tcpa ?? null;
}

interface TableViewProps {
  cards: ClientCardData[];
}

export function TableView({ cards }: TableViewProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "spend" || key === "cpa" ? "desc" : "asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return cards;
    const arr = [...cards];
    const dir = sortDir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case "client_name":
          return dir * a.client_name.localeCompare(b.client_name, "he");
        case "spend":
          return dir * (a.total_spend - b.total_spend);
        case "conversions":
          return dir * (a.total_conversions - b.total_conversions);
        case "cpa":
          return dir * ((a.overall_cpa ?? Infinity) - (b.overall_cpa ?? Infinity));
        case "tcpa":
          return dir * ((getPrimaryTcpa(a) ?? Infinity) - (getPrimaryTcpa(b) ?? Infinity));
        case "overshoot": {
          const oa = getOvershootPercent(a) ?? -Infinity;
          const ob = getOvershootPercent(b) ?? -Infinity;
          return dir * (oa - ob);
        }
        case "status":
          return dir * (STATUS_ORDER[getWorstStatus(a)] - STATUS_ORDER[getWorstStatus(b)]);
        default:
          return 0;
      }
    });
    return arr;
  }, [cards, sortKey, sortDir]);

  const totals = useMemo(() => {
    const spend = cards.reduce((s, c) => s + c.total_spend, 0);
    const conversions = cards.reduce((s, c) => s + c.total_conversions, 0);
    const cpa = conversions > 0 ? spend / conversions : null;
    return { spend, conversions, cpa };
  }, [cards]);

  function SortIcon({ column }: { column: SortKey }) {
    if (sortKey !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3" />
      : <ArrowDown className="h-3 w-3" />;
  }

  function SortableHead({ column, children }: { column: SortKey; children: React.ReactNode }) {
    return (
      <TableHead
        className={`cursor-pointer select-none text-right whitespace-nowrap ${sortKey === column ? "text-neutral-900" : ""}`}
        onClick={() => handleSort(column)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          <SortIcon column={column} />
        </span>
      </TableHead>
    );
  }

  return (
    <div className="rounded-lg border border-[#e5e5e0] bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#f7f7f5] hover:bg-[#f7f7f5]">
            <SortableHead column="client_name">לקוח</SortableHead>
            <SortableHead column="spend">הוצאה</SortableHead>
            <SortableHead column="conversions">המרות</SortableHead>
            <SortableHead column="cpa">CPA</SortableHead>
            <SortableHead column="tcpa">יעד</SortableHead>
            <SortableHead column="overshoot">חריגה%</SortableHead>
            <SortableHead column="status">סטטוס</SortableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((card) => {
            const worstStatus = getWorstStatus(card);
            const overshoot = getOvershootPercent(card);
            const tcpa = getPrimaryTcpa(card);
            return (
              <TableRow key={card.client_id}>
                <TableCell className="font-semibold text-right">
                  {card.client_name}
                  {card.is_multi_topic && (
                    <span className="text-[10px] text-neutral-400 me-1">
                      ({card.topics.length} נושאים)
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(card.total_spend, card.currency)}</TableCell>
                <TableCell className="text-right">{formatNumber(card.total_conversions)}</TableCell>
                <TableCell className="text-right">{formatCurrency(card.overall_cpa, card.currency)}</TableCell>
                <TableCell className="text-right text-neutral-400">{formatCurrency(tcpa, card.currency)}</TableCell>
                <TableCell className="text-right">
                  <OvershootBadge value={overshoot} />
                </TableCell>
                <TableCell className="text-right">
                  <CpaBadge status={worstStatus} overshootPercent={overshoot !== null && overshoot > 0 ? overshoot : undefined} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
        <TableFooter>
          <TableRow className="font-semibold">
            <TableCell className="text-right">סה״כ ({cards.length})</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.spend)}</TableCell>
            <TableCell className="text-right">{formatNumber(totals.conversions)}</TableCell>
            <TableCell className="text-right">{formatCurrency(totals.cpa)}</TableCell>
            <TableCell />
            <TableCell />
            <TableCell />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}

function OvershootBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-neutral-400">--</span>;
  const isOver = value > 0;
  const bg = isOver ? "#fceaea" : "#e8f5ee";
  const color = isOver ? "#c0392b" : "#1a7a4c";
  return (
    <span
      className="inline-block text-xs font-medium px-1.5 py-0.5 rounded"
      style={{ backgroundColor: bg, color }}
    >
      {isOver ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}
