"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/cpa/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/cpa/ui/select";
import { Badge } from "@/components/cpa/ui/badge";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/cpa/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, formatDate } from "@/lib/cpa/format";

const fetcher = (url: string) => fetch(url).then((r) => r.json()).then((r) => r.data ?? r);

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

interface ClientOption {
  id: string;
  name: string;
}

export default function CpaAlertsPage() {
  const { loading, hasToolAccess } = useAuth();
  const [clientFilter, setClientFilter] = useState<string>("all");

  const logUrl = clientFilter === "all"
    ? "/api/cpa/alerts/log"
    : `/api/cpa/alerts/log?client_id=${clientFilter}`;

  const { data: logs, isLoading: logsLoading } = useSWR<AlertLogEntry[]>(logUrl, fetcher);
  const { data: clients } = useSWR<ClientOption[]>("/api/cpa/clients", fetcher);

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

  if (!hasToolAccess('cpa')) {
    return (
      <Card className="rounded-xl">
        <div className="flex flex-col items-center justify-center p-16 gap-5">
          <p className="font-semibold">אין לך הרשאה לצפות בכלי זה</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">היסטוריית התראות</h1>
        <Select value={clientFilter} onValueChange={setClientFilter}>
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
          ) : !logs?.length ? (
            <p className="text-center text-muted-foreground py-8">
              אין התראות עדיין
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
                        ? log.channels_notified.map(ch => channelLabel[ch] || ch).join(", ")
                        : channelLabel[log.channel] || log.channel}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
