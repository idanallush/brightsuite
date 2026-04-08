"use client";

import type { ClientCardData } from "@/lib/cpa/types/dashboard";
import { ClientCardSimple } from "@/components/cpa/dashboard/client-card-simple";
import { ClientCardMulti } from "@/components/cpa/dashboard/client-card-multi";

interface ClientCardProps {
  data: ClientCardData;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onHide: () => void;
}

export function ClientCard({ data, isCollapsed, onToggleCollapse, onHide }: ClientCardProps) {
  if (data.is_multi_topic) {
    return (
      <ClientCardMulti
        data={data}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onHide={onHide}
      />
    );
  }
  return (
    <ClientCardSimple
      data={data}
      isCollapsed={isCollapsed}
      onToggleCollapse={onToggleCollapse}
      onHide={onHide}
    />
  );
}
