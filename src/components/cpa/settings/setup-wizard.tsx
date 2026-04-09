"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Wifi,
  WifiOff,
  Search,
  Plus,
  Trash2,
  Rocket,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/cpa/ui/dialog";
import { Button } from "@/components/cpa/ui/button";
import { Input } from "@/components/cpa/ui/input";
import { Label } from "@/components/cpa/ui/label";
import { Switch } from "@/components/cpa/ui/switch";
import { Badge } from "@/components/cpa/ui/badge";

// ---- Types ----

interface FBAdAccount {
  id: string;
  name: string;
  account_id: string;
  currency: string;
  account_status: number;
  business_name?: string;
}

interface Client {
  id: string;
  name: string;
  fb_account_id: string;
  fb_account_name: string;
  currency: string;
  is_active: boolean;
}

interface TopicDraft {
  name: string;
  tcpa: number;
  tcpa_currency: string;
  clientId: string;
}

interface AlertDraft {
  clientId: string;
  clientName: string;
  emailRecipients: string;
  threshold: number;
  isEnabled: boolean;
}

interface SetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STEPS = [
  { key: "fb", label: "חיבור פייסבוק" },
  { key: "clients", label: "בחירת לקוחות" },
  { key: "topics", label: "הגדרת נושאים" },
  { key: "alerts", label: "התראות" },
  { key: "done", label: "סיום" },
] as const;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
};

// ---- Step Indicator ----

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 py-2" dir="ltr">
      {STEPS.map((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = i < currentStep;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`
                  flex items-center justify-center h-8 w-8 rounded-full text-xs font-semibold
                  transition-all duration-200
                  ${isCompleted
                    ? "bg-[#1a7a4c] text-white"
                    : isActive
                      ? "bg-[#1a1a1a] text-white"
                      : "bg-[#e5e5e0] text-[#8a877f]"
                  }
                `}
              >
                {isCompleted ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`
                  text-[10px] mt-1 whitespace-nowrap
                  ${isActive ? "text-[#1a1a1a] font-medium" : "text-[#8a877f]"}
                `}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`
                  h-px w-6 mx-1 mt-[-14px]
                  ${i < currentStep ? "bg-[#1a7a4c]" : "bg-[#e5e5e0]"}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---- Main Wizard ----

export function SetupWizard({ open, onOpenChange }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);

  // Reset to step 0 when opening
  useEffect(() => {
    if (open) setCurrentStep(0);
  }, [open]);

  // --- Step 1: FB Connection ---
  const { data: fbData, isLoading: fbLoading } = useSWR(
    open ? "/api/cpa/facebook/connection" : null,
    fetcher
  );
  const fbConnected = fbData?.connected === true;

  // --- Step 2: Client selection ---
  const { data: accountsRaw, isLoading: accountsLoading } = useSWR(
    open && fbConnected ? "/api/cpa/facebook/accounts" : null,
    fetcher
  );
  const { data: clientsRaw, mutate: mutateClients } = useSWR(
    open ? "/api/cpa/clients" : null,
    fetcher
  );

  const accounts: FBAdAccount[] = Array.isArray(accountsRaw?.data) ? accountsRaw.data : [];
  const existingClients: Client[] = Array.isArray(clientsRaw?.data) ? clientsRaw.data : [];

  const [clientSearch, setClientSearch] = useState("");
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [savingClients, setSavingClients] = useState(false);

  // Initialize selections from existing active clients
  useEffect(() => {
    if (existingClients.length > 0 && selectedAccountIds.size === 0) {
      const activeIds = new Set(
        existingClients.filter((c) => c.is_active).map((c) => c.fb_account_id)
      );
      if (activeIds.size > 0) setSelectedAccountIds(activeIds);
    }
  }, [existingClients, selectedAccountIds.size]);

  const filteredAccounts = clientSearch
    ? accounts.filter(
        (a) =>
          a.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
          a.account_id.includes(clientSearch) ||
          (a.business_name ?? "").toLowerCase().includes(clientSearch.toLowerCase())
      )
    : accounts;

  function toggleAccount(accountId: string) {
    setSelectedAccountIds((prev) => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  }

  async function saveClients() {
    setSavingClients(true);
    try {
      const payload = accounts.map((account) => ({
        fb_account_id: account.account_id,
        name: account.name,
        display_name: account.name,
        fb_account_name: account.name,
        is_active: selectedAccountIds.has(account.account_id),
        currency: account.currency,
      }));

      const res = await fetch("/api/cpa/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clients: payload }),
      });
      if (!res.ok) throw new Error("Failed to save clients");
      toast.success("הלקוחות נשמרו בהצלחה");
      await mutateClients();
    } catch {
      toast.error("שגיאה בשמירת לקוחות");
    } finally {
      setSavingClients(false);
    }
  }

  // --- Step 3: Topics ---
  const [topicDrafts, setTopicDrafts] = useState<TopicDraft[]>([]);
  const [savingTopics, setSavingTopics] = useState(false);

  const selectedClients = existingClients.filter(
    (c) => selectedAccountIds.has(c.fb_account_id) || c.is_active
  );

  const initializeTopicDrafts = useCallback(() => {
    if (selectedClients.length > 0 && topicDrafts.length === 0) {
      const drafts = selectedClients.map((c) => ({
        name: "",
        tcpa: 0,
        tcpa_currency: "ILS",
        clientId: c.id,
      }));
      setTopicDrafts(drafts);
    }
  }, [selectedClients, topicDrafts.length]);

  function addTopicForClient(clientId: string) {
    setTopicDrafts((prev) => [
      ...prev,
      { name: "", tcpa: 0, tcpa_currency: "ILS", clientId },
    ]);
  }

  function removeTopicDraft(index: number) {
    setTopicDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTopicDraft(index: number, updates: Partial<TopicDraft>) {
    setTopicDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    );
  }

  async function saveTopics() {
    setSavingTopics(true);
    try {
      const validTopics = topicDrafts.filter((t) => t.name.trim());
      for (const topic of validTopics) {
        const res = await fetch("/api/cpa/topics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: topic.clientId,
            name: topic.name,
            campaign_ids: [],
            tcpa: topic.tcpa,
            tcpa_currency: topic.tcpa_currency,
            metric_type: "leads",
          }),
        });
        if (!res.ok) throw new Error("Failed to save topic");
      }
      toast.success(`${validTopics.length} נושאים נשמרו בהצלחה`);
    } catch {
      toast.error("שגיאה בשמירת נושאים");
    } finally {
      setSavingTopics(false);
    }
  }

  // --- Step 4: Alerts ---
  const [alertDrafts, setAlertDrafts] = useState<AlertDraft[]>([]);
  const [savingAlerts, setSavingAlerts] = useState(false);

  const initializeAlertDrafts = useCallback(() => {
    if (selectedClients.length > 0 && alertDrafts.length === 0) {
      setAlertDrafts(
        selectedClients.map((c) => ({
          clientId: c.id,
          clientName: c.name,
          emailRecipients: "",
          threshold: 20,
          isEnabled: false,
        }))
      );
    }
  }, [selectedClients, alertDrafts.length]);

  function updateAlertDraft(index: number, updates: Partial<AlertDraft>) {
    setAlertDrafts((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...updates } : d))
    );
  }

  async function saveAlerts() {
    setSavingAlerts(true);
    try {
      const enabledAlerts = alertDrafts.filter((a) => a.isEnabled);
      for (const alert of enabledAlerts) {
        const emails = alert.emailRecipients
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean);

        const res = await fetch("/api/cpa/alerts/config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            client_id: alert.clientId,
            threshold_percent: alert.threshold,
            notify_emails: emails,
            is_enabled: true,
          }),
        });
        if (!res.ok) throw new Error("Failed to save alert");
      }
      if (enabledAlerts.length > 0) {
        toast.success(`${enabledAlerts.length} התראות הוגדרו בהצלחה`);
      }
    } catch {
      toast.error("שגיאה בשמירת התראות");
    } finally {
      setSavingAlerts(false);
    }
  }

  // --- Step 5: Summary ---
  const topicsCount = topicDrafts.filter((t) => t.name.trim()).length;
  const alertsCount = alertDrafts.filter((a) => a.isEnabled).length;

  // --- Navigation ---
  function canGoNext(): boolean {
    switch (currentStep) {
      case 0: return fbConnected;
      case 1: return selectedAccountIds.size > 0;
      case 2: return true; // topics are optional per step
      case 3: return true; // alerts are optional
      case 4: return true;
      default: return false;
    }
  }

  async function handleNext() {
    if (currentStep === 1) {
      await saveClients();
    }
    if (currentStep === 2) {
      const validTopics = topicDrafts.filter((t) => t.name.trim());
      if (validTopics.length > 0) {
        await saveTopics();
      }
      initializeAlertDrafts();
    }
    if (currentStep === 3) {
      const enabledAlerts = alertDrafts.filter((a) => a.isEnabled);
      if (enabledAlerts.length > 0) {
        await saveAlerts();
      }
    }
    if (currentStep === 4) {
      onOpenChange(false);
      return;
    }

    setCurrentStep((prev) => {
      const next = prev + 1;
      // Initialize topic drafts when entering step 3
      if (next === 2) {
        setTimeout(() => initializeTopicDrafts(), 0);
      }
      return next;
    });
  }

  function handleBack() {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[640px] max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-lg">אשף הגדרה מהירה</DialogTitle>
          <DialogDescription>
            הגדר את המערכת בכמה צעדים פשוטים
          </DialogDescription>
        </DialogHeader>

        <StepIndicator currentStep={currentStep} />

        <div className="min-h-[280px] py-2">
          {/* Step 1: FB Connection */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold">חיבור פייסבוק</h3>
              {fbLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[#8a877f]" />
                </div>
              ) : fbConnected ? (
                <div className="flex items-center gap-3 rounded-xl border border-[#c3e6cb] bg-[#e8f5ee] p-4">
                  <Wifi className="h-5 w-5 text-[#1a7a4c]" />
                  <div>
                    <p className="text-sm font-medium text-[#1a7a4c]">
                      פייסבוק מחובר בהצלחה
                    </p>
                    {fbData?.connection?.fb_user_name && (
                      <p className="text-xs text-[#1a7a4c]/70 mt-0.5">
                        {fbData.connection.fb_user_name}
                      </p>
                    )}
                  </div>
                  <CheckCircle className="h-5 w-5 text-[#1a7a4c] ms-auto" />
                </div>
              ) : (
                <div className="text-center space-y-4 py-6">
                  <WifiOff className="h-10 w-10 text-[#8a877f] mx-auto" />
                  <p className="text-sm text-[#555550]">
                    יש להתחבר לפייסבוק כדי להמשיך
                  </p>
                  <Button asChild className="bg-[#1877F2] hover:bg-[#1565C0] text-white">
                    <a href="/api/cpa/auth/login">התחבר לפייסבוק</a>
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Client selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">בחירת לקוחות</h3>
                <Badge variant="secondary" className="text-xs">
                  {selectedAccountIds.size} נבחרו
                </Badge>
              </div>

              {accountsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-[#8a877f]" />
                </div>
              ) : (
                <>
                  {accounts.length > 3 && (
                    <div className="relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8a877f]" />
                      <Input
                        value={clientSearch}
                        onChange={(e) => setClientSearch(e.target.value)}
                        placeholder="חיפוש חשבון..."
                        className="ps-9"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {filteredAccounts.map((account) => {
                      const isSelected = selectedAccountIds.has(account.account_id);
                      return (
                        <div
                          key={account.account_id}
                          className={`
                            flex items-center justify-between p-3 rounded-xl border
                            transition-all duration-150 cursor-pointer
                            ${isSelected
                              ? "border-[#1a7a4c]/30 bg-[#e8f5ee]/50"
                              : "border-[#e5e5e0] bg-white hover:border-[#c5c5c0]"
                            }
                          `}
                          onClick={() => toggleAccount(account.account_id)}
                        >
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="text-sm font-medium">{account.name}</p>
                              <div className="flex items-center gap-2 text-xs text-[#8a877f] mt-0.5">
                                <span dir="ltr" className="font-mono">{account.account_id}</span>
                                <span>{account.currency}</span>
                                {account.business_name && (
                                  <span>{account.business_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Switch
                            checked={isSelected}
                            onCheckedChange={() => toggleAccount(account.account_id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3: Topics */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold">הגדרת נושאים</h3>
              <p className="text-sm text-[#555550]">
                הגדר לפחות נושא אחד לכל לקוח. ניתן לדלג ולהגדיר אחר כך.
              </p>

              {selectedClients.length === 0 ? (
                <p className="text-sm text-[#8a877f] text-center py-6">
                  אין לקוחות פעילים. חזור לשלב הקודם.
                </p>
              ) : (
                <div className="space-y-4 max-h-[320px] overflow-y-auto">
                  {selectedClients.map((client) => {
                    const clientTopics = topicDrafts
                      .map((t, i) => ({ ...t, _index: i }))
                      .filter((t) => t.clientId === client.id);

                    return (
                      <div key={client.id} className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">{client.name}</span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addTopicForClient(client.id)}
                            className="h-7 text-xs"
                          >
                            <Plus className="h-3 w-3" />
                            הוסף נושא
                          </Button>
                        </div>

                        {clientTopics.length === 0 && (
                          <p className="text-xs text-[#8a877f]">אין נושאים — לחץ להוספה</p>
                        )}

                        {clientTopics.map((topic) => (
                          <div
                            key={topic._index}
                            className="flex items-end gap-2"
                          >
                            <div className="flex-1">
                              <Label className="text-[#8a877f] text-xs">שם</Label>
                              <Input
                                value={topic.name}
                                onChange={(e) =>
                                  updateTopicDraft(topic._index, { name: e.target.value })
                                }
                                placeholder="שם הנושא"
                                className="h-8 text-sm bg-[#f7f7f5]"
                              />
                            </div>
                            <div className="w-24">
                              <Label className="text-[#8a877f] text-xs">TCPA</Label>
                              <Input
                                type="number"
                                value={topic.tcpa || ""}
                                onChange={(e) =>
                                  updateTopicDraft(topic._index, {
                                    tcpa: parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder="0"
                                className="h-8 text-sm bg-[#f7f7f5]"
                              />
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-[#c0392b] hover:bg-[#fceaea]"
                              onClick={() => removeTopicDraft(topic._index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Alerts */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold">הגדרת התראות</h3>
              <p className="text-sm text-[#555550]">
                הפעל התראות למייל כשה-CPA חורג מהיעד. שלב זה אופציונלי.
              </p>

              <div className="space-y-3 max-h-[320px] overflow-y-auto">
                {alertDrafts.map((alert, i) => (
                  <div
                    key={alert.clientId}
                    className={`
                      rounded-xl border p-4 space-y-3 transition-colors
                      ${alert.isEnabled
                        ? "border-[#e5e5e0] bg-white"
                        : "border-[#eeeeea] bg-[#f7f7f5]"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{alert.clientName}</span>
                      <Switch
                        checked={alert.isEnabled}
                        onCheckedChange={(checked) =>
                          updateAlertDraft(i, { isEnabled: checked })
                        }
                      />
                    </div>

                    {alert.isEnabled && (
                      <div className="grid gap-3">
                        <div className="space-y-1">
                          <Label className="text-[#8a877f] text-xs">סף חריגה (%)</Label>
                          <Input
                            type="number"
                            value={alert.threshold}
                            onChange={(e) =>
                              updateAlertDraft(i, {
                                threshold: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="h-8 w-24 text-sm bg-[#f7f7f5]"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[#8a877f] text-xs">מיילים (מופרדים בפסיק)</Label>
                          <Input
                            value={alert.emailRecipients}
                            onChange={(e) =>
                              updateAlertDraft(i, { emailRecipients: e.target.value })
                            }
                            placeholder="user@example.com"
                            dir="ltr"
                            className="h-8 text-sm bg-[#f7f7f5]"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Done */}
          {currentStep === 4 && (
            <div className="flex flex-col items-center text-center py-6 space-y-5">
              <div className="h-14 w-14 rounded-full bg-[#e8f5ee] flex items-center justify-center">
                <Rocket className="h-7 w-7 text-[#1a7a4c]" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">ההגדרה הושלמה</h3>
                <p className="text-sm text-[#555550]">
                  המערכת מוכנה לעבודה. סיכום:
                </p>
              </div>
              <div className="rounded-xl border border-[#e5e5e0] bg-white p-4 w-full max-w-sm space-y-2 text-sm text-start">
                <div className="flex items-center justify-between">
                  <span className="text-[#555550]">לקוחות פעילים</span>
                  <span className="font-semibold">{selectedAccountIds.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#555550]">נושאים</span>
                  <span className="font-semibold">{topicsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#555550]">התראות</span>
                  <span className="font-semibold">{alertsCount}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between pt-2 border-t border-[#e5e5e0]">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="gap-1"
          >
            <ChevronRight className="h-4 w-4" />
            הקודם
          </Button>

          <span className="text-xs text-[#8a877f]">
            {currentStep + 1} / {STEPS.length}
          </span>

          <Button
            onClick={handleNext}
            disabled={
              !canGoNext() ||
              savingClients ||
              savingTopics ||
              savingAlerts
            }
            className="gap-1 bg-[#1a1a1a] hover:bg-[#333] text-white"
          >
            {savingClients || savingTopics || savingAlerts ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : currentStep === 4 ? (
              <>
                התחל לעבוד
                <Rocket className="h-4 w-4" />
              </>
            ) : (
              <>
                הבא
                <ChevronLeft className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
