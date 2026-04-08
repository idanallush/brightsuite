"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/cpa/ui/table";
import { Badge } from "@/components/cpa/ui/badge";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import { MediaPreview } from "./media-preview";
import { ALL_METRICS } from "@/lib/ads/types/metrics";
import { formatMetricValue, truncateText, formatObjective, formatCallToAction } from "@/lib/ads/format";
import type { AdCreativeRow } from "@/lib/ads/types/ad";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/cpa/ui/dialog";

interface CreativeTableProps {
  ads: AdCreativeRow[];
  visibleMetrics: string[];
  isLoading: boolean;
  currency?: string;
}

export function CreativeTable({
  ads,
  visibleMetrics,
  isLoading,
  currency = "USD",
}: CreativeTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo<ColumnDef<AdCreativeRow>[]>(() => {
    const fixedColumns: ColumnDef<AdCreativeRow>[] = [
      {
        id: "preview",
        header: "",
        size: 80,
        cell: ({ row }) => (
          <MediaPreview
            mediaType={row.original.mediaType}
            mediaUrl={row.original.mediaUrl}
            adName={row.original.adName}
            carouselCount={row.original.carouselCards?.length}
          />
        ),
      },
      {
        accessorKey: "adName",
        header: ({ column }) => (
          <button
            className="flex items-center gap-1"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            שם מודעה
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        size: 200,
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium text-sm">{row.original.adName}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.campaignName}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "adCopy",
        header: "קופי",
        size: 250,
        cell: ({ row }) => {
          const copy = row.original.adCopy;
          if (!copy) return <span className="text-muted-foreground text-xs">-</span>;
          return (
            <Dialog>
              <DialogTrigger asChild>
                <button className="text-end text-sm hover:text-primary transition-colors max-w-[240px]">
                  {truncateText(copy, 80)}
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-lg" dir="rtl" aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle>קופי מודעה</DialogTitle>
                </DialogHeader>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {copy}
                </div>
                {row.original.headline && (
                  <div className="pt-2 border-t">
                    <span className="text-xs text-muted-foreground">כותרת: </span>
                    <span className="text-sm font-medium">{row.original.headline}</span>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          );
        },
      },
      {
        accessorKey: "mediaType",
        header: "סוג",
        size: 90,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.original.mediaType}
          </Badge>
        ),
      },
      {
        accessorKey: "objective",
        header: "מטרה",
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs">{formatObjective(row.original.objective)}</span>
        ),
      },
      {
        accessorKey: "destinationUrl",
        header: "קישור",
        size: 60,
        cell: ({ row }) => {
          const url = row.original.destinationUrl;
          if (!url) return <span className="text-muted-foreground">-</span>;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
              title={url}
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          );
        },
      },
      {
        accessorKey: "callToAction",
        header: "CTA",
        size: 100,
        cell: ({ row }) => (
          <span className="text-xs">
            {row.original.callToAction
              ? formatCallToAction(row.original.callToAction)
              : "-"}
          </span>
        ),
      },
    ];

    const metricColumns: ColumnDef<AdCreativeRow>[] = visibleMetrics
      .map((metricKey) => {
        const metricDef = ALL_METRICS.find((m) => m.key === metricKey);
        if (!metricDef) return null;

        return {
          id: metricKey,
          header: ({ column }: { column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => false | "asc" | "desc" } }) => (
            <button
              className="flex items-center gap-1 whitespace-nowrap"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {metricDef.label}
              <ArrowUpDown className="h-3 w-3" />
            </button>
          ),
          size: 100,
          accessorFn: (row: AdCreativeRow) => row.metrics[metricKey] ?? null,
          cell: ({ getValue }: { getValue: () => unknown }) => {
            const value = getValue() as number | null;
            return (
              <span className="text-sm tabular-nums" dir="ltr">
                {formatMetricValue(value, metricDef.format, currency)}
              </span>
            );
          },
          sortingFn: "basic" as const,
        } satisfies ColumnDef<AdCreativeRow>;
      })
      .filter(Boolean) as ColumnDef<AdCreativeRow>[];

    return [...fixedColumns, ...metricColumns];
  }, [visibleMetrics, currency]);

  const table = useReactTable({
    data: ads,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (ads.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">אין מודעות פעילות</p>
        <p className="text-sm mt-2">בחר חשבון מודעות ותאריכים כדי לראות קריאייטיבים</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  style={{ width: header.getSize() }}
                  className="whitespace-nowrap text-xs"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="py-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
