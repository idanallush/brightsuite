"use client";

import { Input } from "@/components/cpa/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/cpa/ui/select";
import { Search } from "lucide-react";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  objectiveFilter: string;
  onObjectiveChange: (objective: string) => void;
  campaignFilter: string;
  onCampaignChange: (campaign: string) => void;
  objectives: string[];
  campaigns: string[];
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  objectiveFilter,
  onObjectiveChange,
  campaignFilter,
  onCampaignChange,
  objectives,
  campaigns,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          placeholder="חיפוש מודעות..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="ps-9 w-56"
          aria-label="חיפוש מודעות לפי שם או קופי"
        />
      </div>

      {/* Objective filter */}
      <Select value={objectiveFilter} onValueChange={onObjectiveChange}>
        <SelectTrigger className="w-40" aria-label="סינון לפי מטרה">
          <SelectValue placeholder="מטרה" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל המטרות</SelectItem>
          {objectives.map((obj) => (
            <SelectItem key={obj} value={obj}>
              {obj}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Campaign filter */}
      <Select value={campaignFilter} onValueChange={onCampaignChange}>
        <SelectTrigger className="w-48" aria-label="סינון לפי קמפיין">
          <SelectValue placeholder="קמפיין" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">כל הקמפיינים</SelectItem>
          {campaigns.map((camp) => (
            <SelectItem key={camp} value={camp}>
              {camp}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
