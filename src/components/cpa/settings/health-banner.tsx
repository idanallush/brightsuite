"use client";

import useSWR from "swr";
import { CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface HealthData {
  fb_connected: boolean;
  fb_token_expires_in_days: number | null;
  active_clients_count: number;
  clients_without_topics: string[];
  topics_without_campaigns: string[];
  topics_without_tcpa: string[];
  alerts_configured_count: number;
  clients_without_alerts: string[];
  overall_status: "healthy" | "warning" | "critical";
}

interface HealthBannerProps {
  onNavigateTab?: (tab: string) => void;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
};

export function HealthBanner({ onNavigateTab }: HealthBannerProps) {
  const { data, isLoading, error } = useSWR<HealthData>(
    "/api/cpa/health",
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading || error || !data) return null;

  if (data.overall_status === "healthy") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-[#c3e6cb] bg-[#e8f5ee] px-4 py-3">
        <CheckCircle className="h-5 w-5 text-[#1a7a4c] shrink-0" />
        <span className="text-sm font-medium text-[#1a7a4c]">
          הכל תקין — המערכת מוגדרת ומוכנה
        </span>
      </div>
    );
  }

  if (data.overall_status === "critical") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-[#f5c6cb] bg-[#fceaea] px-4 py-3">
        <XCircle className="h-5 w-5 text-[#c0392b] shrink-0" />
        <span className="text-sm font-medium text-[#c0392b]">
          {!data.fb_connected
            ? "חובה לתקן — אין חיבור פייסבוק פעיל"
            : data.fb_token_expires_in_days !== null && data.fb_token_expires_in_days < 0
              ? "חובה לתקן — טוקן הפייסבוק פג תוקף"
              : "חובה לתקן — בעיה קריטית בהגדרות"}
        </span>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab("fb-connection")}
            className="text-sm text-[#c0392b] underline underline-offset-2 hover:no-underline me-auto"
          >
            תקן עכשיו
          </button>
        )}
      </div>
    );
  }

  // Warning status
  const issues: { text: string; tab: string }[] = [];

  if (data.fb_token_expires_in_days !== null && data.fb_token_expires_in_days <= 7 && data.fb_token_expires_in_days >= 0) {
    issues.push({
      text: `הטוקן פג תוקף בעוד ${data.fb_token_expires_in_days} ימים`,
      tab: "fb-connection",
    });
  }

  if (data.clients_without_topics.length > 0) {
    issues.push({
      text: `${data.clients_without_topics.length} לקוחות בלי נושאים מוגדרים`,
      tab: "topics",
    });
  }

  if (data.topics_without_campaigns.length > 0) {
    issues.push({
      text: `${data.topics_without_campaigns.length} נושאים בלי קמפיינים משויכים`,
      tab: "topics",
    });
  }

  if (data.topics_without_tcpa.length > 0) {
    issues.push({
      text: `${data.topics_without_tcpa.length} נושאים בלי יעד TCPA`,
      tab: "topics",
    });
  }

  if (data.clients_without_alerts.length > 0) {
    issues.push({
      text: `${data.clients_without_alerts.length} לקוחות בלי התראות מוגדרות`,
      tab: "alerts",
    });
  }

  if (issues.length === 0) return null;

  return (
    <div className="rounded-xl border border-[#f5deb3] bg-[#fef9e7] px-4 py-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-[#b8860b] shrink-0" />
        <span className="text-sm font-semibold text-[#856404]">
          נדרשת השלמת הגדרות
        </span>
      </div>
      <ul className="space-y-1 ps-7">
        {issues.map((issue, i) => (
          <li key={i} className="text-sm text-[#856404]">
            {onNavigateTab ? (
              <button
                onClick={() => onNavigateTab(issue.tab)}
                className="text-start underline underline-offset-2 decoration-[#b8860b]/40 hover:decoration-[#b8860b] transition-colors"
              >
                {issue.text}
              </button>
            ) : (
              issue.text
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
