'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/cpa/ui/popover';
import { ScrollArea } from '@/components/cpa/ui/scroll-area';
import { Separator } from '@/components/cpa/ui/separator';
import { formatCurrency } from '@/lib/cpa/format';

const STORAGE_KEY = 'cpa-alerts-seen-at';

interface AlertLogEntry {
  id: string;
  client_id: string;
  topic_id: string;
  client_name: string;
  topic_name: string;
  actual_cpa: number;
  target_cpa: number;
  overshoot_percent: number;
  channels_notified: string[];
  sent_at: string;
}

interface RecentAlertsResponse {
  alerts: AlertLogEntry[];
  unread_count: number;
}

function getLastSeenAt(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.warn(`[cpa] failed to read ${STORAGE_KEY} from localStorage:`, err);
    return null;
  }
}

function setLastSeenAt(timestamp: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, timestamp);
  } catch (err) {
    console.warn(`[cpa] failed to write ${STORAGE_KEY} to localStorage:`, err);
  }
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const date = new Date(isoDate).getTime();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'עכשיו';
  if (diffMinutes < 60) return `לפני ${diffMinutes} דקות`;
  if (diffHours === 1) return 'לפני שעה';
  if (diffHours < 24) return `לפני ${diffHours} שעות`;
  if (diffDays === 1) return 'אתמול';
  return `לפני ${diffDays} ימים`;
}

function getSeverityColor(overshootPercent: number): string {
  if (overshootPercent >= 50) return '#c0392b';
  return '#e67e22';
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const AlertsBell = () => {
  const [open, setOpen] = useState(false);
  const [lastSeenAt, setLastSeenAtState] = useState<string | null>(getLastSeenAt);

  const seenParam = lastSeenAt ? `?seen_after=${encodeURIComponent(lastSeenAt)}` : '';
  const { data, mutate } = useSWR<RecentAlertsResponse>(
    `/api/cpa/alerts/recent${seenParam}`,
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  const unreadCount = data?.unread_count ?? 0;
  const alerts = data?.alerts ?? [];

  const handleMarkAsRead = useCallback(() => {
    const now = new Date().toISOString();
    setLastSeenAt(now);
    setLastSeenAtState(now);
    mutate();
  }, [mutate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors hover:bg-black/5"
          aria-label="התראות"
        >
          <Bell className="w-[18px] h-[18px]" style={{ color: 'var(--text-secondary)' }} />
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white rounded-full"
              style={{ backgroundColor: '#c0392b' }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-80 p-0"
        style={{ border: '1px solid #e5e5e0' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm font-semibold" style={{ color: '#1a1a1a' }}>
            התראות אחרונות
          </span>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAsRead}
              className="text-xs font-medium transition-colors hover:underline"
              style={{ color: '#2563a0' }}
            >
              סמן הכל כנקרא
            </button>
          )}
        </div>
        <Separator />
        <ScrollArea className="max-h-[360px]">
          {alerts.length === 0 ? (
            <div className="flex items-center justify-center py-10 px-4">
              <span className="text-sm" style={{ color: '#8a877f' }}>
                אין התראות חדשות
              </span>
            </div>
          ) : (
            <div>
              {alerts.map((alert) => {
                const isUnread = !lastSeenAt || alert.sent_at > lastSeenAt;
                const severityColor = getSeverityColor(alert.overshoot_percent);
                return (
                  <div
                    key={alert.id}
                    className="relative px-4 py-3 transition-colors hover:bg-black/[0.02]"
                    style={{
                      borderRight: `3px solid ${severityColor}`,
                      backgroundColor: isUnread ? '#fefcf6' : 'transparent',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: '#1a1a1a' }}>
                          {alert.client_name}
                        </p>
                        <p className="text-xs mt-0.5 truncate" style={{ color: '#555550' }}>
                          {alert.topic_name}
                        </p>
                      </div>
                      <span className="text-[11px] whitespace-nowrap flex-shrink-0" style={{ color: '#8a877f' }}>
                        {formatRelativeTime(alert.sent_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-xs" style={{ color: '#555550' }}>
                      <span>CPA: {formatCurrency(alert.actual_cpa)}</span>
                      <span style={{ color: '#8a877f' }}>|</span>
                      <span>יעד: {formatCurrency(alert.target_cpa)}</span>
                      <span style={{ color: '#8a877f' }}>|</span>
                      <span
                        className="font-medium"
                        style={{ color: severityColor }}
                      >
                        חריגה: {alert.overshoot_percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <Separator />
        <div className="px-4 py-2.5">
          <Link
            href="/cpa/alerts"
            onClick={() => setOpen(false)}
            className="block text-center text-xs font-medium transition-colors hover:underline"
            style={{ color: '#2563a0' }}
          >
            צפה בכל ההתראות
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};
