"use client";

import useSWR from "swr";
import { useState } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/cpa/ui/button";
import { Badge } from "@/components/cpa/ui/badge";
import { Checkbox } from "@/components/cpa/ui/checkbox";
import { Input } from "@/components/cpa/ui/input";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import { Separator } from "@/components/cpa/ui/separator";

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: string;
}

interface OtherTopicAssignment {
  campaignId: string;
  topicName: string;
}

interface CampaignSelectorProps {
  accountId: string;
  selectedCampaignIds: string[];
  onSelect: (ids: string[]) => void;
  otherTopicAssignments?: OtherTopicAssignment[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function CampaignSelector({
  accountId,
  selectedCampaignIds,
  onSelect,
  otherTopicAssignments = [],
}: CampaignSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useSWR(
    accountId ? `/api/cpa/facebook/campaigns?account_id=${accountId}` : null,
    fetcher,
  );

  const campaigns: Campaign[] = Array.isArray(data?.data) ? data.data : [];

  const otherAssignmentMap = new Map<string, string>();
  for (const a of otherTopicAssignments) {
    otherAssignmentMap.set(a.campaignId, a.topicName);
  }

  function toggleCampaign(campaignId: string) {
    if (selectedCampaignIds.includes(campaignId)) {
      onSelect(selectedCampaignIds.filter((id) => id !== campaignId));
    } else {
      onSelect([...selectedCampaignIds, campaignId]);
    }
  }

  const sortedCampaigns = [...campaigns].sort((a, b) => {
    if (a.status === "ACTIVE" && b.status !== "ACTIVE") return -1;
    if (a.status !== "ACTIVE" && b.status === "ACTIVE") return 1;
    return a.name.localeCompare(b.name);
  });

  const filteredCampaigns = sortedCampaigns.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) {
    return <Skeleton className="h-9 w-full" />;
  }

  return (
    <div className="space-y-0">
      <Button
        variant="outline"
        className="w-full justify-between h-9"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-sm">
          בחר קמפיינים
          {selectedCampaignIds.length > 0 && (
            <span className="text-muted-foreground"> ({selectedCampaignIds.length})</span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          {selectedCampaignIds.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {selectedCampaignIds.length} קמפיינים
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </Button>

      {expanded && (
        <div className="mt-2 rounded-lg border bg-white overflow-hidden">
          {campaigns.length > 5 && (
            <>
              <div className="relative p-2">
                <Search className="absolute start-5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="חפש קמפיין..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="ps-9 h-8 text-sm"
                />
              </div>
              <Separator />
            </>
          )}

          <div className="max-h-64 overflow-y-auto">
            {filteredCampaigns.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                {campaigns.length === 0 ? "לא נמצאו קמפיינים בחשבון" : "אין תוצאות"}
              </p>
            ) : (
              filteredCampaigns.map((campaign) => {
                const isSelected = selectedCampaignIds.includes(campaign.id);
                const assignedToOther = otherAssignmentMap.get(campaign.id);
                const isDisabled = !!assignedToOther;

                return (
                  <label
                    key={campaign.id}
                    className={`flex items-center gap-3 px-3 py-2 text-sm cursor-pointer transition-colors ${
                      isDisabled
                        ? "opacity-50 cursor-not-allowed bg-neutral-50"
                        : "hover:bg-[#FAFBFC]"
                    }`}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      onCheckedChange={() => {
                        if (!isDisabled) toggleCampaign(campaign.id);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`truncate block ${isDisabled ? "text-muted-foreground" : ""}`}>
                        {campaign.name}
                      </span>
                      {assignedToOther && (
                        <span className="text-[10px] text-muted-foreground">
                          משויך ל: {assignedToOther}
                        </span>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 ${
                        campaign.status === "ACTIVE"
                          ? "border-green-300 text-green-700 bg-green-50"
                          : "border-gray-300 text-gray-500"
                      }`}
                    >
                      {campaign.status === "ACTIVE"
                        ? "פעיל"
                        : campaign.status === "PAUSED"
                          ? "מושהה"
                          : campaign.status}
                    </Badge>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
