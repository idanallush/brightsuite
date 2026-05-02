"use client";

import useSWR from "swr";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save, Send } from "lucide-react";
import { Button } from "@/components/cpa/ui/button";
import { Input } from "@/components/cpa/ui/input";
import { Label } from "@/components/cpa/ui/label";
import { Switch } from "@/components/cpa/ui/switch";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/cpa/ui/select";

interface Client {
  id: string;
  name: string;
  is_active: boolean;
}

interface AlertConfig {
  id: string;
  client_id: string;
  threshold_percent: number;
  notify_emails: string[];
  notify_slack_webhook: string | null;
  notify_telegram_chat_id: string | null;
  is_enabled: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  return res.json();
};

export function AlertsTab() {
  const { data: clientsRaw, isLoading: clientsLoading } =
    useSWR("/api/cpa/clients", fetcher);

  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const {
    data: configRaw,
    isLoading: configLoading,
    mutate: mutateConfig,
  } = useSWR(
    selectedClientId ? `/api/cpa/alerts/config?client_id=${selectedClientId}` : null,
    fetcher,
  );

  const [thresholdPercent, setThresholdPercent] = useState(20);
  const [emailRecipients, setEmailRecipients] = useState("");
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [telegramChatId, setTelegramChatId] = useState("");
  const [isEnabled, setIsEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);

  const clients: Client[] = Array.isArray(clientsRaw?.data) ? clientsRaw.data : [];
  const activeClients = clients.filter((c) => c.is_active !== false);

  const configs: AlertConfig[] = Array.isArray(configRaw?.data) ? configRaw.data : [];

  useEffect(() => {
    if (configs.length > 0) {
      const c = configs[0];
      setConfigId(c.id);
      setThresholdPercent(c.threshold_percent ?? 20);
      setEmailRecipients(Array.isArray(c.notify_emails) ? c.notify_emails.join(", ") : "");
      setSlackWebhookUrl(c.notify_slack_webhook ?? "");
      setTelegramChatId(c.notify_telegram_chat_id ?? "");
      setIsEnabled(c.is_enabled ?? false);
    } else if (configRaw && configs.length === 0) {
      setConfigId(null);
      setThresholdPercent(20);
      setEmailRecipients("");
      setSlackWebhookUrl("");
      setTelegramChatId("");
      setIsEnabled(false);
    }
  }, [configRaw, configs]);

  function validateForm(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

    if (Number.isNaN(thresholdPercent) || thresholdPercent <= 0 || thresholdPercent > 500) {
      errors.push("אחוז הסף חייב להיות מספר בין 1 ל-500");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emails = emailRecipients
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const invalidEmails = emails.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      errors.push(`כתובות מייל לא תקינות: ${invalidEmails.join(", ")}`);
    }

    if (slackWebhookUrl.trim()) {
      const url = slackWebhookUrl.trim();
      if (!url.startsWith("https://")) {
        errors.push("Slack Webhook חייב להתחיל ב-https://");
      } else {
        try {
          new URL(url);
        } catch {
          errors.push("Slack Webhook אינו כתובת URL תקינה");
        }
      }
    }

    if (telegramChatId.trim()) {
      const url = telegramChatId.trim();
      if (!url.startsWith("https://")) {
        errors.push("Telegram Webhook חייב להתחיל ב-https://");
      } else {
        try {
          new URL(url);
        } catch {
          errors.push("Telegram Webhook אינו כתובת URL תקינה");
        }
      }
    }

    return { ok: errors.length === 0, errors };
  }

  async function handleSave() {
    if (!selectedClientId) return;

    const { ok, errors } = validateForm();
    if (!ok) {
      toast.error(errors.join(" • "));
      return;
    }

    if (slackWebhookUrl.trim() && !slackWebhookUrl.trim().startsWith("https://hooks.slack.com/services/")) {
      toast.warning("כתובת ה-Slack Webhook אינה בפורמט הצפוי (https://hooks.slack.com/services/...)");
    }
    if (telegramChatId.trim() && !telegramChatId.trim().startsWith("https://api.telegram.org/bot")) {
      toast.warning("כתובת ה-Telegram Webhook אינה בפורמט הצפוי (https://api.telegram.org/bot...)");
    }

    setSaving(true);
    try {
      const emails = emailRecipients
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);

      const res = await fetch("/api/cpa/alerts/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: configId,
          client_id: selectedClientId,
          threshold_percent: thresholdPercent,
          notify_emails: emails,
          notify_slack_webhook: slackWebhookUrl || null,
          notify_telegram_chat_id: telegramChatId || null,
          is_enabled: isEnabled,
        }),
      });
      if (!res.ok) throw new Error("שגיאה בשמירת הגדרות התראות");
      toast.success("הגדרות ההתראות נשמרו בהצלחה");
      mutateConfig();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירת הגדרות התראות");
    } finally {
      setSaving(false);
    }
  }

  async function handleTestAlert() {
    if (!selectedClientId) return;
    setTesting(true);
    try {
      const res = await fetch("/api/cpa/alerts/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: selectedClientId }),
      });
      if (!res.ok) throw new Error("שגיאה בשליחת התראת בדיקה");
      toast.success("התראת בדיקה נשלחה בהצלחה");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשליחת התראת בדיקה");
    } finally {
      setTesting(false);
    }
  }

  if (clientsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Label className="font-medium">בחר לקוח:</Label>
        <Select value={selectedClientId} onValueChange={setSelectedClientId}>
          <SelectTrigger className="w-64 bg-white">
            <SelectValue placeholder="בחר לקוח" />
          </SelectTrigger>
          <SelectContent>
            {activeClients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedClientId && configLoading && (
        <div className="space-y-4">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      )}

      {selectedClientId && !configLoading && (
        <div className="space-y-6 rounded-xl border border-neutral-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">הגדרות התראות</h2>
            <div className="flex items-center gap-2">
              <Label htmlFor="alert-enabled" className="text-muted-foreground text-sm">פעיל</Label>
              <Switch
                id="alert-enabled"
                checked={isEnabled}
                onCheckedChange={setIsEnabled}
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="threshold" className="text-muted-foreground text-xs">אחוז סף להתראה (%)</Label>
              <Input
                id="threshold"
                type="number"
                value={thresholdPercent}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "") {
                    setThresholdPercent(20);
                    return;
                  }
                  const parsed = parseFloat(v);
                  setThresholdPercent(Number.isNaN(parsed) ? 20 : parsed);
                }}
                placeholder="20"
                className="w-32 bg-neutral-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emails" className="text-muted-foreground text-xs">כתובות מייל להתראות</Label>
              <textarea
                id="emails"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                placeholder="user1@example.com, user2@example.com"
                rows={3}
                className={`flex w-full rounded-lg border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                  emailRecipients
                    .split(",")
                    .map((e) => e.trim())
                    .filter(Boolean)
                    .some((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
                    ? "border-red-500"
                    : "border-input"
                }`}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slack" className="text-muted-foreground text-xs">Slack Webhook URL</Label>
              <Input
                id="slack"
                value={slackWebhookUrl}
                onChange={(e) => setSlackWebhookUrl(e.target.value)}
                placeholder="https://hooks.slack.com/services/..."
                dir="ltr"
                className="bg-neutral-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram" className="text-muted-foreground text-xs">Telegram Chat ID</Label>
              <Input
                id="telegram"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="123456789"
                dir="ltr"
                className="bg-neutral-50"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1877F2] hover:bg-[#1565C0] text-white"
            >
              <Save className="h-4 w-4" />
              {saving ? "שומר..." : "שמור הגדרות"}
            </Button>
            <Button variant="outline" onClick={handleTestAlert} disabled={testing}>
              <Send className="h-4 w-4" />
              {testing ? "שולח..." : "שלח התראת בדיקה"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
