"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Settings2, Save, Loader2, X, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/cpa/ui/dialog";
import { Button } from "@/components/cpa/ui/button";
import { Input } from "@/components/cpa/ui/input";
import { Badge } from "@/components/cpa/ui/badge";
import { Checkbox } from "@/components/cpa/ui/checkbox";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import { Separator } from "@/components/cpa/ui/separator";
import type { ClientCardData } from "@/lib/cpa/types/dashboard";

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: string;
}

interface TopicFromDB {
  id: string;
  client_id: string;
  name: string;
  campaign_ids: string[];
  tcpa: number | null;
  tcpa_currency: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface CampaignManageDialogProps {
  data: ClientCardData;
}

export function CampaignManageDialog({ data }: CampaignManageDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [localSelections, setLocalSelections] = useState<Record<string, string[]>>({});
  const [initialized, setInitialized] = useState(false);

  // Fetch campaigns from FB
  const { data: campaignsRaw, isLoading: campaignsLoading } = useSWR(
    open ? `/api/cpa/facebook/campaigns?account_id=${data.fb_account_id}` : null,
    fetcher,
  );

  // Fetch topics from DB
  const { data: topicsRaw, isLoading: topicsLoading, mutate: mutateTopics } = useSWR(
    open ? `/api/cpa/topics?client_id=${data.client_id}` : null,
    fetcher,
  );

  const campaigns: Campaign[] = Array.isArray(campaignsRaw?.data) ? campaignsRaw.data : [];
  const topics: TopicFromDB[] = Array.isArray(topicsRaw?.data) ? topicsRaw.data : [];

  // Initialize local selections from DB topics on first load
  if (open && !initialized && topics.length > 0 && !topicsLoading) {
    const selections: Record<string, string[]> = {};
    for (const topic of topics) {
      selections[topic.id] = [...topic.campaign_ids];
    }
    setLocalSelections(selections);
    setInitialized(true);
  }

  const handleOpenChange = useCallback((isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setInitialized(false);
      setLocalSelections({});
      setSearch("");
    }
  }, []);

  function toggleCampaign(topicId: string, campaignId: string) {
    setLocalSelections((prev) => {
      const current = prev[topicId] || [];
      if (current.includes(campaignId)) {
        return { ...prev, [topicId]: current.filter((id) => id !== campaignId) };
      }
      return { ...prev, [topicId]: [...current, campaignId] };
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const promises = topics.map((topic) =>
        fetch("/api/cpa/topics", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: topic.id,
            campaign_ids: localSelections[topic.id] || [],
          }),
        }),
      );
      await Promise.all(promises);
      await mutateTopics();
      setOpen(false);
      setInitialized(false);
      setLocalSelections({});
    } catch (err) {
      console.error("Failed to save campaign assignments:", err);
    } finally {
      setSaving(false);
    }
  }

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const isLoading = campaignsLoading || topicsLoading;

  // Determine if anything changed
  const hasChanges = topics.some((topic) => {
    const original = topic.campaign_ids;
    const current = localSelections[topic.id] || [];
    if (original.length !== current.length) return true;
    return !original.every((id) => current.includes(id));
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="ניהול קמפיינים"
          aria-label="ניהול קמפיינים"
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col" dir="rtl">
        <DialogHeader className="text-start">
          <DialogTitle className="text-base">{data.client_name} — ניהול קמפיינים</DialogTitle>
          <DialogDescription>
            בחר אילו קמפיינים משויכים לכל נושא
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : topics.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            אין נושאים מוגדרים ללקוח זה. הוסף נושאים בהגדרות.
          </div>
        ) : (
          <>
            {/* Search */}
            {campaigns.length > 5 && (
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חפש קמפיין..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9 h-9"
                />
              </div>
            )}

            {/* Topics with campaigns */}
            <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
              {topics.map((topic) => {
                const selectedIds = localSelections[topic.id] || [];
                return (
                  <div key={topic.id} className="rounded-lg border">
                    <div className="flex items-center justify-between px-3 py-2.5 bg-[#F8F9FA]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{topic.name}</span>
                        {topic.name === "__default__" && (
                          <Badge variant="outline" className="text-[10px]">ברירת מחדל</Badge>
                        )}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {selectedIds.length} קמפיינים
                      </Badge>
                    </div>
                    <Separator />
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCampaigns.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-3 text-center">
                          {campaigns.length === 0 ? "לא נמצאו קמפיינים בחשבון" : "אין תוצאות"}
                        </p>
                      ) : (
                        filteredCampaigns.map((campaign) => {
                          const isSelected = selectedIds.includes(campaign.id);
                          return (
                            <label
                              key={campaign.id}
                              className="flex items-center gap-3 px-3 py-2 hover:bg-[#FAFBFC] cursor-pointer text-sm"
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleCampaign(topic.id, campaign.id)}
                              />
                              <span className="flex-1 truncate">{campaign.name}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    campaign.status === "ACTIVE"
                                      ? "border-green-300 text-green-700 bg-green-50"
                                      : "border-gray-300 text-gray-500"
                                  }`}
                                >
                                  {campaign.status === "ACTIVE" ? "פעיל" : campaign.status === "PAUSED" ? "מושהה" : campaign.status}
                                </Badge>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                ביטול
              </Button>
              <Button
                size="sm"
                className="bg-[#1877F2] hover:bg-[#1565C0] text-white"
                onClick={handleSave}
                disabled={saving || !hasChanges}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                שמור שינויים
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
