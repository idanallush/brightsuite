"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { format, subDays, parse } from "date-fns";
import { ChevronRight, ChevronLeft, CalendarDays } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/cpa/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/cpa/ui/select";
import { Badge } from "@/components/cpa/ui/badge";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/cpa/ui/card";
import { Button } from "@/components/cpa/ui/button";
import { Input } from "@/components/cpa/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/cpa/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/cpa/format";

interface AlertLogEntry {
  id: string;
  client_id: string;
  topic_id: string;
  client_name: string;
  topic_name: string;
  actual_cpa: number;
  target_cpa: number;
  overshoot_percent: number;
  date_range_since: string;
  date_range_until: string;
  channel: string;
  channels_notified: string[];
  sent_at: string;
}

interface AlertLogResponse {
  logs: AlertLogEntry[];
  total: number;
  page: number;
  pageSize: number;
}

interface ClientOption {
  id: string;
  name: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;
const DEFAULT_PAGE_SIZE = 50;

function todayStr(): string {
  return format(new Date(), "yyyy-MM-dd");
}

function thirtyDaysAgoStr(): string {
  return format(subDays(new Date(), 29), "yyyy-MM-dd");
}

function toDisplay(dateStr: string): string {
  try {
    return format(parse(dateStr, "yyyy-MM-dd", new Date()), "dd.MM.yy");
  } catch {
    return dateStr;
  }
}

const fetcher = async (url: string): Promise<AlertLogResponse> => {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || "שגיאה בטעינת הנתונים");
  }
  // New shape: { logs, total, page, pageSize }
  if (body && Array.isArray(body.logs)) {
    return body as AlertLogResponse;
  }
  // Back-compat: legacy shape was { data: [...] } or a flat array
  const legacy: AlertLogEntry[] = Array.isArray(body)
    ? body
    : Array.isArray(body?.data)
      ? body.data
      : [];
  return {
    logs: legacy,
    total: legacy.length,
    page: 1,
    pageSize: legacy.length || DEFAULT_PAGE_SIZE,
  };
};

const clientsFetcher = async (url: string): Promise<ClientOption[]> => {
  const res = await fetch(url);
  const body = await res.json();
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.data)) return body.data;
  return [];
};

function AlertsLogContent() {
  const { loading, hasToolAccess } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL state with sane defaults (last 30 days).
  const urlSince = searchParams.get("since");
  const urlUntil = searchParams.get("until");
  const urlClient = searchParams.get("clientId") ?? searchParams.get("client_id") ?? "all";
  const urlPage = parseInt(searchParams.get("page") ?? "1", 10);
  const urlPageSize = parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10);

  const since = urlSince && DATE_RE.test(urlSince) ? urlSince : thirtyDaysAgoStr();
  const until = urlUntil && DATE_RE.test(urlUntil) ? urlUntil : todayStr();
  const clientFilter = urlClient || "all";
  const page = Number.isFinite(urlPage) && urlPage > 0 ? urlPage : 1;
  const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(urlPageSize)
    ? urlPageSize
    : DEFAULT_PAGE_SIZE;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftSince, setDraftSince] = useState(since);
  const [draftUntil, setDraftUntil] = useState(until);

  const updateUrl = useCallback(
    (next: Partial<{ since: string; until: string; clientId: string; page: number; pageSize: number }>) => {
      const params = new URLSearchParams();
      const nSince = next.since ?? since;
      const nUntil = next.until ?? until;
      const nClient = next.clientId ?? clientFilter;
      const nPage = next.page ?? page;
      const nPageSize = next.pageSize ?? pageSize;
      params.set("since", nSince);
      params.set("until", nUntil);
      if (nClient && nClient !== "all") params.set("clientId", nClient);
      params.set("page", String(nPage));
      params.set("pageSize", String(nPageSize));
      router.replace(`?${params.toString()}`);
    },
    [since, until, clientFilter, page, pageSize, router]
  );

  const logUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("since", since);
    params.set("until", until);
    if (clientFilter !== "all") params.set("client_id", clientFilter);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    return `/api/cpa/alerts/log?${params.toString()}`;
  }, [since, until, clientFilter, page, pageSize]);

  const { data, isLoading: logsLoading } = useSWR<AlertLogResponse>(logUrl, fetcher);
  const { data: clients } = useSWR<ClientOption[]>("/api/cpa/clients", clientsFetcher);

  const channelLabel: Record<string, string> = {
    email: "מייל",
    slack: "Slack",
    telegram: "Telegram",
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!hasToolAccess("cpa")) {
    return (
      <Card className="rounded-xl">
        <div className="flex flex-col items-center justify-center p-16 gap-5">
          <p className="font-semibold">אין לך הרשאה לצפות בכלי זה</p>
        </div>
      </Card>
    );
  }

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  function applyDraftRange() {
    if (!DATE_RE.test(draftSince) || !DATE_RE.test(draftUntil)) return;
    if (draftSince > draftUntil) return;
    updateUrl({ since: draftSince, until: draftUntil, page: 1 });
    setPickerOpen(false);
  }

  function handlePreset(days: number) {
    const today = todayStr();
    const start = format(subDays(new Date(), days - 1), "yyyy-MM-dd");
    setDraftSince(start);
    setDraftUntil(today);
    updateUrl({ since: start, until: today, page: 1 });
    setPickerOpen(false);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">היסטוריית התראות</h1>

        <div className="flex flex-wrap items-center gap-2">
          <Popover
            open={pickerOpen}
            onOpenChange={(o) => {
              setPickerOpen(o);
              if (o) {
                setDraftSince(since);
                setDraftUntil(until);
              }
            }}
          >
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2 text-sm h-9 font-medium">
                <CalendarDays className="h-4 w-4 text-[#1877F2]" />
                <span>
                  {toDisplay(since)} — {toDisplay(until)}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="end">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">מתאריך</label>
                  <Input
                    type="date"
                    value={draftSince}
                    max={draftUntil}
                    onChange={(e) => setDraftSince(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">עד תאריך</label>
                  <Input
                    type="date"
                    value={draftUntil}
                    min={draftSince}
                    max={todayStr()}
                    onChange={(e) => setDraftUntil(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handlePreset(7)}>
                    7 ימים
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handlePreset(30)}>
                    30 ימים
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => handlePreset(90)}>
                    90 ימים
                  </Button>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" onClick={applyDraftRange} className="h-8">
                    החל
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Select
            value={clientFilter}
            onValueChange={(v) => updateUrl({ clientId: v, page: 1 })}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="כל הלקוחות" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הלקוחות</SelectItem>
              {clients?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>התראות שנשלחו</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              אין התראות בטווח הזה
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תאריך</TableHead>
                  <TableHead>לקוח</TableHead>
                  <TableHead>נושא</TableHead>
                  <TableHead>CPA בפועל</TableHead>
                  <TableHead>יעד</TableHead>
                  <TableHead>חריגה%</TableHead>
                  <TableHead>ערוץ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{formatDate(log.sent_at)}</TableCell>
                    <TableCell className="font-medium">{log.client_name}</TableCell>
                    <TableCell>{log.topic_name}</TableCell>
                    <TableCell>{formatCurrency(log.actual_cpa)}</TableCell>
                    <TableCell>{formatCurrency(log.target_cpa)}</TableCell>
                    <TableCell>
                      <Badge variant={log.overshoot_percent > 20 ? "destructive" : "secondary"}>
                        {log.overshoot_percent}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {log.channels_notified?.length
                        ? log.channels_notified.map((ch) => channelLabel[ch] || ch).join(", ")
                        : channelLabel[log.channel] || log.channel}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {!logsLoading && total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  מציג {rangeStart}–{rangeEnd} מתוך {total}
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => updateUrl({ pageSize: parseInt(v, 10), page: 1 })}
                >
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / עמוד
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  disabled={page <= 1}
                  onClick={() => updateUrl({ page: page - 1 })}
                >
                  <ChevronRight className="h-4 w-4" />
                  הקודם
                </Button>
                <span className="text-sm text-muted-foreground">
                  עמוד {page} מתוך {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1"
                  disabled={page >= totalPages}
                  onClick={() => updateUrl({ page: page + 1 })}
                >
                  הבא
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CpaAlertsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-6">
          <Skeleton className="h-9 w-80" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <AlertsLogContent />
    </Suspense>
  );
}
