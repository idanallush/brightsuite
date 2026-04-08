"use client";

import { useState, useCallback, useEffect } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/cpa/ui/card";
import { Button } from "@/components/cpa/ui/button";
import { Badge } from "@/components/cpa/ui/badge";
import { Separator } from "@/components/cpa/ui/separator";
import { Switch } from "@/components/cpa/ui/switch";
import { Label } from "@/components/cpa/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/cpa/ui/select";
import { Input } from "@/components/cpa/ui/input";
import {
  Wifi,
  WifiOff,
  RefreshCcw,
  Shield,
  Clock,
  Users,
  Building2,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Settings,
  Info,
  Search,
  Plus,
  X,
  ChevronDown,
  Star,
  Archive,
} from "lucide-react";
import { ALL_METRICS } from "@/lib/ads/types/metrics";
import { useColumnConfig } from "@/hooks/ads/use-column-config";
import { useFacebookAccounts } from "@/hooks/ads/use-facebook-accounts";
import { useAuth } from "@/hooks/use-auth";

interface ConnectionStatus {
  connected: boolean;
  userName: string;
  userId: string;
  userEmail: string;
  tokenExpiresIn: number | null;
  tokenExpiry: number | null;
  accountCount: number;
}

interface AdAccount {
  id: string;
  name: string;
  account_status: number;
  currency?: string;
  business_name?: string;
}

const statusFetcher = async (url: string): Promise<ConnectionStatus> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

function getAccountStatusLabel(status: number) {
  switch (status) {
    case 1:
      return { label: "פעיל", variant: "default" as const, dotColor: "#22C55E", badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200" };
    case 2:
      return { label: "מושבת", variant: "destructive" as const, dotColor: "#EF4444", badgeClass: "bg-red-100 text-red-700 border-red-200" };
    case 3:
      return { label: "לא מאושר", variant: "secondary" as const, dotColor: "#F97316", badgeClass: "bg-orange-100 text-orange-700 border-orange-200" };
    case 7:
      return { label: "בבדיקה", variant: "secondary" as const, dotColor: "#9CA3AF", badgeClass: "bg-gray-100 text-gray-600 border-gray-200" };
    case 9:
      return { label: "תקופת חסד", variant: "secondary" as const, dotColor: "#F97316", badgeClass: "bg-orange-100 text-orange-700 border-orange-200" };
    case 100:
      return { label: "סגור לצמיתות", variant: "destructive" as const, dotColor: "#EF4444", badgeClass: "bg-red-100 text-red-700 border-red-200" };
    case 101:
      return { label: "מושעה זמנית", variant: "destructive" as const, dotColor: "#EF4444", badgeClass: "bg-red-100 text-red-700 border-red-200" };
    default:
      return { label: "לא פעיל", variant: "secondary" as const, dotColor: "#9CA3AF", badgeClass: "bg-gray-100 text-gray-600 border-gray-200" };
  }
}

function formatTimeRemaining(ms: number): string {
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} ימים ו-${hours} שעות`;
  if (hours > 0) return `${hours} שעות`;
  return "פחות משעה";
}

function AccountCard({
  account,
  variant,
  onAction,
}: {
  account: AdAccount;
  variant: "selected" | "available";
  onAction: (id: string) => void;
}) {
  const statusInfo = getAccountStatusLabel(account.account_status);

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-xl border bg-white transition-all duration-200 ${
        variant === "selected" ? "border-zinc-200" : "border-zinc-200 opacity-75"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: statusInfo.dotColor }}
          aria-label={statusInfo.label}
        />
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{account.name}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
            <span dir="ltr" className="font-mono">{account.id}</span>
            {account.currency && (
              <><span>·</span><span>{account.currency}</span></>
            )}
            {account.business_name && (
              <>
                <span>·</span>
                <span className="flex items-center gap-1 truncate">
                  <Building2 className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {account.business_name}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <Badge
          variant={statusInfo.variant}
          className={`text-[10px] ${statusInfo.badgeClass}`}
        >
          {statusInfo.label}
        </Badge>
        {variant === "selected" ? (
          <button
            type="button"
            onClick={() => onAction(account.id)}
            className="h-7 w-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            aria-label={`הסר את ${account.name} מהרשימה`}
            title="הסר מהרשימה"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAction(account.id)}
            className="h-7 w-7 rounded-full flex items-center justify-center text-white bg-[#1877F2] hover:bg-[#1565C0] transition-colors"
            aria-label={`הוסף את ${account.name} לרשימה`}
            title="הוסף לרשימה"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { hasToolAccess, loading: authLoading } = useAuth();

  const {
    data: status,
    isLoading: statusLoading,
    mutate: refreshStatus,
  } = useSWR<ConnectionStatus>("/api/ads/auth/status", statusFetcher);

  const { accounts, isLoading: accountsLoading } = useFacebookAccounts();

  const [isReconnecting, setIsReconnecting] = useState(false);

  const { visibleMetrics, toggleMetric } = useColumnConfig();
  const [defaultDateRange, setDefaultDateRange] = useState("LAST_7_DAYS");

  const [availableSearch, setAvailableSearch] = useState("");
  const [showAllAvailable, setShowAllAvailable] = useState(false);

  const [hiddenAccounts, setHiddenAccounts] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const stored = localStorage.getItem("fb-ads-hidden-accounts");
      if (stored) {
        const arr = JSON.parse(stored) as string[];
        setHiddenAccounts(new Set(arr));
      }
    } catch {
      // ignore
    }
  }, []);

  const addToSelected = useCallback((accountId: string) => {
    setHiddenAccounts((prev) => {
      const next = new Set(prev);
      next.delete(accountId);
      localStorage.setItem("fb-ads-hidden-accounts", JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const removeFromSelected = useCallback((accountId: string) => {
    setHiddenAccounts((prev) => {
      const next = new Set(prev);
      next.add(accountId);
      localStorage.setItem("fb-ads-hidden-accounts", JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const selectedAccounts = accounts.filter((a) => !hiddenAccounts.has(a.id));
  const availableAccounts = accounts.filter((a) => hiddenAccounts.has(a.id));

  const filteredAvailable = availableAccounts.filter((a) => {
    if (!availableSearch.trim()) return true;
    const q = availableSearch.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.id.toLowerCase().includes(q) ||
      (a.business_name?.toLowerCase().includes(q) ?? false)
    );
  });

  const displayedAvailable = showAllAvailable
    ? filteredAvailable
    : filteredAvailable.slice(0, 3);
  const hasMoreAvailable = filteredAvailable.length > 3;

  const isTokenExpiringSoon =
    status?.tokenExpiresIn != null &&
    status.tokenExpiresIn < 7 * 24 * 60 * 60 * 1000;

  const isTokenExpired =
    status?.tokenExpiresIn != null && status.tokenExpiresIn <= 0;

  const handleReconnect = useCallback(() => {
    setIsReconnecting(true);
    window.location.href = "/api/ads/auth/facebook";
  }, []);

  const handleDisconnect = useCallback(async () => {
    await fetch("/api/ads/auth/logout", { method: "POST" });
    window.location.href = "/";
  }, []);

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
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 text-zinc-500" aria-hidden="true" />
          הגדרות
        </h1>
        <p className="text-sm text-zinc-400 mt-0.5">
          ניהול חיבור הפייסבוק, חשבונות מודעות והעדפות תצוגה.
        </p>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="h-5 w-5" aria-hidden="true" />
                חיבור פייסבוק
              </CardTitle>
              <CardDescription>
                סטטוס וניהול טוקן הגישה של פייסבוק.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refreshStatus()}
              disabled={statusLoading}
              aria-label="רענון סטטוס חיבור"
            >
              <RefreshCcw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {statusLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              טוען...
            </div>
          ) : status?.connected ? (
            <>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                <Wifi className="h-5 w-5 text-green-600" aria-hidden="true" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">מחובר בהצלחה</p>
                  <p className="text-xs text-green-600">
                    {status.userName}
                    {status.userEmail && ` (${status.userEmail})`}
                  </p>
                </div>
                <Badge variant="outline" className="border-green-300 text-green-700">פעיל</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">תוקף טוקן</p>
                    {status.tokenExpiresIn != null ? (
                      <p className="text-xs text-muted-foreground">
                        {isTokenExpired
                          ? "פג תוקף!"
                          : `פג תוקף בעוד ${formatTimeRemaining(status.tokenExpiresIn)}`}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">לא ידוע</p>
                    )}
                    {status.tokenExpiry && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(status.tokenExpiry), "MMM d, yyyy HH:mm")}
                      </p>
                    )}
                    {isTokenExpiringSoon && !isTokenExpired && (
                      <Badge variant="destructive" className="text-[10px] mt-1">
                        <AlertTriangle className="h-3 w-3 me-1" aria-hidden="true" />
                        פג תוקף בקרוב
                      </Badge>
                    )}
                    {isTokenExpired && (
                      <Badge variant="destructive" className="text-[10px] mt-1">פג תוקף</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-lg border">
                  <Users className="h-4 w-4 mt-0.5 text-muted-foreground" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium">חשבונות מודעות</p>
                    <p className="text-xs text-muted-foreground">
                      {status.accountCount} חשבונות נגישים
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant={isTokenExpiringSoon || isTokenExpired ? "default" : "outline"}
                  size="sm"
                  onClick={handleReconnect}
                  disabled={isReconnecting}
                  className="gap-2"
                >
                  {isReconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isTokenExpired ? "התחבר מחדש" : "רענון טוקן"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => window.open("https://business.facebook.com/settings/", "_blank")}
                  aria-label="פתח הגדרות עסקיות בפייסבוק (נפתח בלשונית חדשה)"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  הגדרות עסקיות פייסבוק
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDisconnect}
                  aria-label="נתק חשבון פייסבוק"
                >
                  <WifiOff className="h-4 w-4" aria-hidden="true" />
                  ניתוק
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                <WifiOff className="h-5 w-5 text-red-600" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-red-800">לא מחובר</p>
                  <p className="text-xs text-red-600">
                    חבר את חשבון הפייסבוק שלך כדי לגשת לנתוני חשבון המודעות.
                  </p>
                </div>
              </div>
              <Button onClick={handleReconnect} disabled={isReconnecting} className="gap-2">
                {isReconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Wifi className="h-4 w-4" aria-hidden="true" />
                )}
                התחבר עם פייסבוק
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2A: החשבונות שלי (Selected / Visible) */}
      <Card className="border-[#E3F2FD]" style={{ backgroundColor: "#FFFFFF" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Star className="h-5 w-5 text-[#1877F2]" aria-hidden="true" />
            החשבונות שלי
            <Badge variant="outline" className="mr-auto text-[11px] font-normal border-[#BBDEFB] text-[#1877F2]">
              {selectedAccounts.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            חשבונות שמוצגים בתפריט הבחירה בדשבורד.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {accountsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              טוען חשבונות...
            </div>
          ) : selectedAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 opacity-30" aria-hidden="true" />
              <p className="text-sm font-medium">אין חשבונות נבחרים</p>
              <p className="text-xs mt-1">
                הוסף חשבונות מהרשימה למטה כדי שיופיעו בתפריט הדשבורד.
              </p>
            </div>
          ) : (
            selectedAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                variant="selected"
                onAction={removeFromSelected}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Section 2B: כל החשבונות (Available / Hidden) */}
      <Card className="border-[#E5E7EB]" style={{ backgroundColor: "#F9FAFB" }}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Archive className="h-5 w-5 text-zinc-500" aria-hidden="true" />
            כל החשבונות
            <Badge variant="outline" className="mr-auto text-[11px] font-normal border-zinc-300 text-zinc-500">
              {availableAccounts.length}
            </Badge>
          </CardTitle>
          <CardDescription>
            חשבונות שמוסתרים מהתפריט. לחץ + כדי להוסיף אותם לרשימה.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {accountsLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              טוען חשבונות...
            </div>
          ) : availableAccounts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30 text-green-500" aria-hidden="true" />
              <p className="text-sm font-medium">כל החשבונות נבחרו</p>
              <p className="text-xs mt-1">
                כל החשבונות מוצגים בתפריט הדשבורד.
              </p>
            </div>
          ) : (
            <>
              {availableAccounts.length > 3 && (
                <div className="relative">
                  <Search
                    className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400"
                    aria-hidden="true"
                  />
                  <Input
                    type="search"
                    placeholder="חיפוש חשבונות..."
                    value={availableSearch}
                    onChange={(e) => setAvailableSearch(e.target.value)}
                    className="ps-8 h-9 text-sm bg-white"
                    aria-label="חיפוש חשבונות זמינים לפי שם או מזהה"
                  />
                </div>
              )}

              <div className="relative">
                <div className="space-y-2">
                  {filteredAvailable.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-4">
                      לא נמצאו חשבונות תואמים.
                    </p>
                  ) : (
                    displayedAvailable.map((account) => (
                      <AccountCard
                        key={account.id}
                        account={account}
                        variant="available"
                        onAction={addToSelected}
                      />
                    ))
                  )}
                </div>

                {!showAllAvailable && hasMoreAvailable && (
                  <div
                    className="absolute bottom-0 left-0 right-0 h-20 pointer-events-none"
                    style={{
                      background: "linear-gradient(to bottom, transparent, #F9FAFB)",
                    }}
                  />
                )}
              </div>

              {hasMoreAvailable && (
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAllAvailable((prev) => !prev)}
                    className="text-sm font-medium hover:underline flex items-center gap-1 mx-auto"
                    style={{ color: "#1877F2" }}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${showAllAvailable ? "rotate-180" : ""}`}
                    />
                    {showAllAvailable
                      ? "הצג פחות"
                      : `הצג את כל ${filteredAvailable.length} החשבונות`}
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-5 w-5" aria-hidden="true" />
            העדפות תצוגה
          </CardTitle>
          <CardDescription>
            התאמת טווח תאריכים ברירת מחדל ועמודות מטריקות מוצגות.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="default-date-range" className="font-medium">
              טווח תאריכים ברירת מחדל
            </Label>
            <Select value={defaultDateRange} onValueChange={setDefaultDateRange}>
              <SelectTrigger id="default-date-range" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LAST_3_DAYS">3 ימים אחרונים</SelectItem>
                <SelectItem value="LAST_7_DAYS">7 ימים אחרונים</SelectItem>
                <SelectItem value="LAST_14_DAYS">14 ימים אחרונים</SelectItem>
                <SelectItem value="LAST_30_DAYS">30 ימים אחרונים</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div>
              <Label className="font-medium">מטריקות ברירת מחדל</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                בחר אילו עמודות מטריקות יוצגו כברירת מחדל בספריית המודעות.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ALL_METRICS.map((metric) => (
                <div
                  key={metric.key}
                  className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Switch
                    id={`metric-${metric.key}`}
                    checked={visibleMetrics.includes(metric.key)}
                    onCheckedChange={() => toggleMetric(metric.key)}
                    aria-label={`הצג/הסתר ${metric.label}`}
                  />
                  <div className="min-w-0">
                    <Label htmlFor={`metric-${metric.key}`} className="text-sm font-medium cursor-pointer">
                      {metric.label}
                    </Label>
                    {metric.description && (
                      <p className="text-xs text-muted-foreground truncate">{metric.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="ms-auto text-[10px] shrink-0">
                    {metric.category}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section: Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5" aria-hidden="true" />
            הרשאות נדרשות
          </CardTitle>
          <CardDescription>
            הרשאות Facebook API הנדרשות לפעולת הכלי.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { perm: "ads_read", desc: "קריאת נתוני חשבון מודעות, קריאייטיבים ומטריקות ביצועים" },
              { perm: "business_management", desc: "גישה לחשבונות עסקיים ורשימות חשבונות מודעות" },
            ].map(({ perm, desc }) => (
              <div key={perm} className="flex items-center gap-3 p-2.5 rounded border">
                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium font-mono">{perm}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section: About */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-5 w-5" aria-hidden="true" />
            אודות
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">FB Ads Reporter</span> — כלי פנימי לסוכנויות
            לצפייה, סינון וייצוא דוחות קריאייטיב של מודעות פייסבוק.
          </p>
          <p>גרסה 1.0.0</p>
          <a
            href="https://developers.facebook.com/status/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-blue-600 hover:underline w-fit"
            aria-label="בדוק סטטוס Facebook API (נפתח בלשונית חדשה)"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            סטטוס Facebook API
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
