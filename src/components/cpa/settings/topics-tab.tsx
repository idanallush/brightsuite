"use client";

import useSWR from "swr";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Save,
  Loader2,
  Zap,
  CheckCircle2,
  AlertTriangle,
  SkipForward,
  UserPlus,
  ShoppingCart,
  Heart,
  Users,
} from "lucide-react";
import { Button } from "@/components/cpa/ui/button";
import { Input } from "@/components/cpa/ui/input";
import { Label } from "@/components/cpa/ui/label";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import { Badge } from "@/components/cpa/ui/badge";
import { Separator } from "@/components/cpa/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/cpa/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/cpa/ui/dialog";
import { CampaignSelector } from "@/components/cpa/settings/campaign-selector";
import type { MetricType } from "@/lib/cpa/metric-presets";

interface Client {
  id: string;
  name: string;
  fb_account_id: string;
}

interface Topic {
  id: string;
  client_id: string;
  name: string;
  campaign_ids: string[];
  tcpa: number;
  tcpa_currency: string;
  metric_type: MetricType;
}

interface TopicDraft {
  id?: string;
  name: string;
  campaign_ids: string[];
  tcpa: number;
  tcpa_currency: string;
  metric_type: MetricType;
  _isNew?: boolean;
}

interface AutoSetupResult {
  client_id: string;
  client_name: string;
  matched: boolean;
  seed_name?: string;
  topics_created: number;
  campaigns_matched: number;
  unmatched_campaigns: string[];
  skipped_existing: boolean;
}

const METRIC_TYPE_OPTIONS: { value: MetricType; label: string; icon: typeof UserPlus }[] = [
  { value: "leads", label: "לידים", icon: UserPlus },
  { value: "ecommerce", label: "איקומרס", icon: ShoppingCart },
  { value: "engagement", label: "אינגייג׳מנט", icon: Heart },
];

const fetcher = async (url: string) => {
  const res = await fetch(url);
  return res.json();
};

export function TopicsTab() {
  const { data: clientsRaw, isLoading: clientsLoading } =
    useSWR("/api/cpa/clients", fetcher);

  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const {
    data: topicsRaw,
    isLoading: topicsLoading,
    mutate: mutateTopics,
  } = useSWR(
    selectedClientId ? `/api/cpa/topics?client_id=${selectedClientId}` : null,
    fetcher,
  );

  const [drafts, setDrafts] = useState<TopicDraft[]>([]);
  const [initialized, setInitialized] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [autoSetupLoading, setAutoSetupLoading] = useState(false);
  const [autoSetupResult, setAutoSetupResult] = useState<AutoSetupResult | null>(null);
  const [autoSetupAllLoading, setAutoSetupAllLoading] = useState(false);
  const [autoSetupAllResults, setAutoSetupAllResults] = useState<AutoSetupResult[] | null>(null);
  const [autoSetupAllProgress, setAutoSetupAllProgress] = useState("");

  const clients: Client[] = Array.isArray(clientsRaw?.data) ? clientsRaw.data : [];
  const activeClients = clients.filter(
    (c: Client & { is_active?: boolean }) =>
      (c as Client & { is_active?: boolean }).is_active !== false,
  );
  const topics: Topic[] = Array.isArray(topicsRaw?.data) ? topicsRaw.data : [];

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  if (topicsRaw && initialized !== selectedClientId) {
    setDrafts(
      topics.map((t) => ({
        id: t.id,
        name: t.name,
        campaign_ids: t.campaign_ids || [],
        tcpa: t.tcpa,
        tcpa_currency: t.tcpa_currency || "ILS",
        metric_type: t.metric_type || "leads",
      })),
    );
    setInitialized(selectedClientId);
  }

  function handleClientChange(clientId: string) {
    setSelectedClientId(clientId);
    setInitialized(null);
    setDrafts([]);
    setAutoSetupResult(null);
  }

  function addTopic() {
    setDrafts((prev) => [
      ...prev,
      {
        name: "",
        campaign_ids: [],
        tcpa: 0,
        tcpa_currency: "ILS",
        metric_type: "leads",
        _isNew: true,
      },
    ]);
  }

  function updateDraft(index: number, updates: Partial<TopicDraft>) {
    setDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d)),
    );
  }

  function removeDraftAtIndex(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleDeleteTopic(topicId: string) {
    setDeletingId(topicId);
    try {
      const res = await fetch("/api/cpa/topics", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: topicId }),
      });
      if (!res.ok) throw new Error("שגיאה במחיקת נושא");
      toast.success("הנושא נמחק בהצלחה");
      mutateTopics();
      setDrafts((prev) => prev.filter((d) => d.id !== topicId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה במחיקת נושא");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSave() {
    if (!selectedClientId) return;
    setSaving(true);
    try {
      const existing = drafts.filter((d) => d.id && !d._isNew);
      for (const topic of existing) {
        const res = await fetch("/api/cpa/topics", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: topic.id,
            name: topic.name,
            campaign_ids: topic.campaign_ids,
            tcpa: topic.tcpa,
            tcpa_currency: topic.tcpa_currency,
            metric_type: topic.metric_type,
          }),
        });
        if (!res.ok) throw new Error("שגיאה בעדכון נושאים");
      }

      const newTopics = drafts.filter((d) => d._isNew);
      for (const topic of newTopics) {
        const res = await fetch("/api/cpa/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: selectedClientId,
            name: topic.name,
            campaign_ids: topic.campaign_ids,
            tcpa: topic.tcpa,
            tcpa_currency: topic.tcpa_currency,
            metric_type: topic.metric_type,
          }),
        });
        if (!res.ok) throw new Error("שגיאה בהוספת נושא חדש");
      }

      toast.success("הנושאים נשמרו בהצלחה");
      setInitialized(null);
      mutateTopics();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירת נושאים");
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoSetup() {
    if (!selectedClientId) return;
    setAutoSetupLoading(true);
    setAutoSetupResult(null);
    try {
      const res = await fetch("/api/cpa/auto-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: selectedClientId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה בהגדרה אוטומטית");
      setAutoSetupResult(json.data);
      if (json.data.matched && json.data.topics_created > 0) {
        toast.success(`נוצרו ${json.data.topics_created} נושאים בהצלחה`);
        setInitialized(null);
        mutateTopics();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בהגדרה אוטומטית");
    } finally {
      setAutoSetupLoading(false);
    }
  }

  async function handleAutoSetupAll() {
    setAutoSetupAllLoading(true);
    setAutoSetupAllResults(null);
    setAutoSetupAllProgress("מתחיל הגדרה אוטומטית...");
    try {
      const res = await fetch("/api/cpa/auto-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "שגיאה בהגדרה אוטומטית");
      setAutoSetupAllResults(json.data);
      const matched = json.data.filter((r: AutoSetupResult) => r.matched && r.topics_created > 0);
      toast.success(`הגדרה אוטומטית הושלמה — ${matched.length} לקוחות הוגדרו`);
      if (selectedClientId) {
        setInitialized(null);
        mutateTopics();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בהגדרה אוטומטית");
    } finally {
      setAutoSetupAllLoading(false);
      setAutoSetupAllProgress("");
    }
  }

  if (clientsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-blue-900">הגדרה אוטומטית לכל הלקוחות</h3>
            <p className="text-xs text-blue-700 mt-0.5">
              יצירת נושאים, הגדרת TCPA ושיוך קמפיינים אוטומטי לכל הלקוחות בבת אחת
            </p>
          </div>
          <Button
            onClick={handleAutoSetupAll}
            disabled={autoSetupAllLoading}
            className="bg-[#1877F2] hover:bg-[#1565C0] text-white shrink-0"
          >
            {autoSetupAllLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {autoSetupAllLoading ? "מגדיר..." : "הגדר את כל הלקוחות"}
          </Button>
        </div>
        {autoSetupAllProgress && (
          <p className="text-xs text-blue-600 mt-2">{autoSetupAllProgress}</p>
        )}
      </div>

      {autoSetupAllResults && (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">תוצאות הגדרה אוטומטית</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {autoSetupAllResults.map((r) => (
              <div
                key={r.client_id}
                className="flex items-center gap-2 text-sm py-1.5 px-2 rounded-lg bg-neutral-50"
              >
                {r.skipped_existing ? (
                  <SkipForward className="h-4 w-4 text-neutral-400 shrink-0" />
                ) : r.matched && r.topics_created > 0 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : !r.matched ? (
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-neutral-400 shrink-0" />
                )}
                <span className="font-medium flex-1">{r.client_name}</span>
                {r.skipped_existing && (
                  <Badge variant="outline" className="text-[10px]">כבר מוגדר</Badge>
                )}
                {r.matched && r.topics_created > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {r.topics_created} נושאים, {r.campaigns_matched} קמפיינים
                  </Badge>
                )}
                {!r.matched && (
                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                    לא נמצאה התאמה
                  </Badge>
                )}
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoSetupAllResults(null)}
          >
            סגור
          </Button>
        </div>
      )}

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Label className="font-medium">בחר לקוח:</Label>
          <Select value={selectedClientId} onValueChange={handleClientChange}>
            <SelectTrigger className="w-64 bg-white">
              <SelectValue placeholder={`בחר לקוח (${activeClients.length} פעילים)`} />
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
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          {activeClients.length > 0 ? (
            <span>{activeClients.length} לקוחות פעילים מתוך {clients.length} חשבונות</span>
          ) : (
            <span>אין לקוחות פעילים. עבור לטאב &quot;לקוחות&quot; כדי להפעיל חשבונות.</span>
          )}
        </div>
      </div>

      {selectedClientId && topicsLoading && (
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {selectedClientId && !topicsLoading && (
        <>
          {drafts.length === 0 && !autoSetupResult && (
            <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50/30 p-6 text-center space-y-3">
              <Zap className="h-8 w-8 text-blue-500 mx-auto" />
              <div>
                <h3 className="text-base font-semibold">הגדרה אוטומטית</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  ניתן להגדיר נושאים ו-TCPA אוטומטית עבור {selectedClient?.name}.
                  המערכת תשייך קמפיינים לנושאים לפי שם.
                </p>
              </div>
              <Button
                onClick={handleAutoSetup}
                disabled={autoSetupLoading}
                className="bg-[#1877F2] hover:bg-[#1565C0] text-white"
              >
                {autoSetupLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {autoSetupLoading ? "מגדיר..." : "הפעל הגדרה אוטומטית"}
              </Button>
            </div>
          )}

          {autoSetupResult && (
            <div className="rounded-xl border bg-white p-5 space-y-3">
              <h3 className="text-sm font-semibold">תוצאות הגדרה אוטומטית</h3>
              {autoSetupResult.matched ? (
                autoSetupResult.skipped_existing ? (
                  <p className="text-sm text-muted-foreground">
                    ללקוח זה כבר מוגדרים נושאים. ניתן לערוך אותם ידנית.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      נוצרו {autoSetupResult.topics_created} נושאים
                    </div>
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle2 className="h-4 w-4" />
                      שויכו {autoSetupResult.campaigns_matched} קמפיינים
                    </div>
                    {autoSetupResult.unmatched_campaigns.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <AlertTriangle className="h-4 w-4" />
                          {autoSetupResult.unmatched_campaigns.length} קמפיינים לא שויכו:
                        </div>
                        <div className="ps-6 space-y-0.5">
                          {autoSetupResult.unmatched_campaigns.map((name, i) => (
                            <p key={i} className="text-xs text-muted-foreground truncate">
                              {name}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                <p className="text-sm text-amber-600">
                  לא נמצאה התאמה עבור לקוח &quot;{autoSetupResult.client_name}&quot; בנתוני הגדרה.
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoSetupResult(null)}
              >
                אשר
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              נושאים עבור {selectedClient?.name}
            </h2>
            <div className="flex gap-2">
              <Button variant="outline" onClick={addTopic}>
                <Plus className="h-4 w-4" />
                הוסף נושא
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#1877F2] hover:bg-[#1565C0] text-white"
              >
                <Save className="h-4 w-4" />
                {saving ? "שומר..." : "שמור שינויים"}
              </Button>
            </div>
          </div>

          {drafts.length === 0 && autoSetupResult && (
            <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center">
              <p className="text-muted-foreground">אין נושאים. הוסף נושא חדש.</p>
            </div>
          )}

          <div className="space-y-4">
            {drafts.map((draft, index) => (
              <div
                key={draft.id ?? `new-${index}`}
                className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5"
              >
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-muted-foreground text-xs">שם הנושא</Label>
                    <Input
                      value={draft.name}
                      onChange={(e) => updateDraft(index, { name: e.target.value })}
                      placeholder="שם הנושא"
                      className="bg-neutral-50"
                    />
                  </div>

                  <div className="w-36">
                    <Label className="text-muted-foreground text-xs">TCPA</Label>
                    <Input
                      type="number"
                      value={draft.tcpa || ""}
                      onChange={(e) =>
                        updateDraft(index, {
                          tcpa: parseFloat(e.target.value) || 0,
                        })
                      }
                      placeholder="0"
                      className="bg-neutral-50"
                    />
                  </div>

                  <div className="w-32">
                    <Label className="text-muted-foreground text-xs">מטבע</Label>
                    <Select
                      value={draft.tcpa_currency}
                      onValueChange={(value) =>
                        updateDraft(index, { tcpa_currency: value })
                      }
                    >
                      <SelectTrigger className="bg-neutral-50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ILS">₪ ILS</SelectItem>
                        <SelectItem value="USD">$ USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {draft.id && !draft._isNew ? (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="icon"
                          disabled={deletingId === draft.id}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>מחיקת נושא</DialogTitle>
                          <DialogDescription>
                            האם למחוק את הנושא &quot;{draft.name}&quot;? פעולה
                            זו לא ניתנת לביטול.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">ביטול</Button>
                          </DialogClose>
                          <Button
                            variant="destructive"
                            onClick={() => handleDeleteTopic(draft.id!)}
                          >
                            מחק
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => removeDraftAtIndex(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">סוג מדד</Label>
                  <div className="flex gap-1 mt-1">
                    {METRIC_TYPE_OPTIONS.map((opt) => {
                      const isActive = draft.metric_type === opt.value;
                      const Icon = opt.icon;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => updateDraft(index, { metric_type: opt.value })}
                          className={`
                            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                            border transition-all duration-150
                            ${isActive
                              ? "bg-[#E3F2FD] text-[#1877F2] border-[#1877F2]"
                              : "bg-white text-muted-foreground border-neutral-200 hover:border-neutral-300"
                            }
                          `}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground text-xs">קמפיינים</Label>
                  <CampaignSelector
                    accountId={selectedClient?.fb_account_id ?? ""}
                    selectedCampaignIds={draft.campaign_ids}
                    onSelect={(ids) => updateDraft(index, { campaign_ids: ids })}
                    otherTopicAssignments={drafts
                      .filter((_, i) => i !== index)
                      .flatMap((d) =>
                        d.campaign_ids.map((cid) => ({
                          campaignId: cid,
                          topicName: d.name || "ללא שם",
                        })),
                      )}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
