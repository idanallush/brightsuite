"use client";

import useSWR from "swr";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/cpa/ui/button";
import { Badge } from "@/components/cpa/ui/badge";
import { Input } from "@/components/cpa/ui/input";
import { Switch } from "@/components/cpa/ui/switch";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/cpa/ui/card";
import { Save, Search } from "lucide-react";

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
  conversion_type_override: string | null;
  is_active: boolean;
}

interface ClientDraft {
  fb_account_id: string;
  display_name: string;
  is_active: boolean;
  currency: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
};

const ACCOUNT_STATUS_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "פעיל", color: "#22C55E" },
  2: { label: "מושבת", color: "#EF4444" },
  3: { label: "לא מאושר", color: "#F59E0B" },
  7: { label: "ממתין לבדיקה", color: "#F59E0B" },
  9: { label: "בבדיקה אנושית", color: "#F59E0B" },
  101: { label: "סגור", color: "#6B7280" },
};

export function ClientsTab() {
  const { data: accountsRaw, isLoading: accountsLoading, error: accountsError } =
    useSWR("/api/cpa/facebook/accounts", fetcher);

  const { data: clientsRaw, isLoading: clientsLoading, mutate: mutateClients } =
    useSWR("/api/cpa/clients", fetcher);

  const [drafts, setDrafts] = useState<Record<string, ClientDraft>>({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const accounts: FBAdAccount[] = Array.isArray(accountsRaw?.data) ? accountsRaw.data : [];
  const clients: Client[] = Array.isArray(clientsRaw?.data) ? clientsRaw.data : [];

  const filteredAccounts = searchQuery
    ? accounts.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.account_id.includes(searchQuery) ||
          (a.business_name ?? "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : accounts;

  function getClientForAccount(fbAccountId: string): Client | undefined {
    return clients.find((c) => c.fb_account_id === fbAccountId);
  }

  function getDraft(fbAccountId: string): ClientDraft {
    if (drafts[fbAccountId]) return drafts[fbAccountId];
    const existing = getClientForAccount(fbAccountId);
    const account = accounts.find((a) => a.account_id === fbAccountId);
    return {
      fb_account_id: fbAccountId,
      display_name: existing?.name ?? account?.name ?? "",
      is_active: existing?.is_active ?? false,
      currency: existing?.currency ?? account?.currency ?? "USD",
    };
  }

  function updateDraft(accountId: string, updates: Partial<ClientDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [accountId]: { ...getDraft(accountId), ...updates },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = accounts.map((account) => {
        const draft = getDraft(account.account_id);
        return {
          fb_account_id: account.account_id,
          name: draft.display_name,
          display_name: draft.display_name,
          fb_account_name: account.name,
          is_active: draft.is_active,
          currency: draft.currency,
        };
      });

      const res = await fetch("/api/cpa/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clients: payload }),
      });
      if (!res.ok) throw new Error("שגיאה בשמירת לקוחות");
      toast.success("הלקוחות נשמרו בהצלחה");
      mutateClients();
      setDrafts({});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירת לקוחות");
    } finally {
      setSaving(false);
    }
  }

  if (accountsLoading || clientsLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border p-4">
              <Skeleton className="h-5 w-9" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (accountsError) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-6 text-center">
          <p className="text-destructive">
            שגיאה בטעינת חשבונות פייסבוק. יש לוודא שהחיבור לפייסבוק פעיל.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">
            לא נמצאו חשבונות פרסום. יש להתחבר לפייסבוק תחילה בלשונית &quot;חיבור פייסבוק&quot;.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">חשבונות פרסום</CardTitle>
            <CardDescription>{accounts.length} חשבונות נמצאו</CardDescription>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#1877F2] hover:bg-[#1565C0] text-white"
          >
            <Save className="h-4 w-4" />
            {saving ? "שומר..." : "שמור שינויים"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {accounts.length > 3 && (
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש חשבון..."
              className="ps-9"
            />
          </div>
        )}

        <div className="space-y-2">
          {filteredAccounts.map((account) => {
            const draft = getDraft(account.account_id);
            const statusInfo = ACCOUNT_STATUS_LABELS[account.account_status] ?? { label: "לא ידוע", color: "#6B7280" };

            return (
              <div
                key={account.account_id}
                className="flex items-center justify-between p-3 rounded-xl border bg-white transition-all duration-200 hover:shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: statusInfo.color }}
                  />
                  <div>
                    <Input
                      value={draft.display_name}
                      onChange={(e) =>
                        updateDraft(account.account_id, { display_name: e.target.value })
                      }
                      className="border-0 bg-transparent p-0 h-auto text-sm font-medium shadow-none focus-visible:ring-0"
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span dir="ltr" className="font-mono">{account.account_id}</span>
                      <span>·</span>
                      <span>{account.currency}</span>
                      {account.business_name && (
                        <>
                          <span>·</span>
                          <span>{account.business_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: statusInfo.color + "15",
                      color: statusInfo.color,
                    }}
                  >
                    {statusInfo.label}
                  </Badge>
                  <Switch
                    checked={draft.is_active}
                    onCheckedChange={(checked) =>
                      updateDraft(account.account_id, { is_active: checked })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
