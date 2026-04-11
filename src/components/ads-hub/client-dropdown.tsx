'use client';

import { Users } from 'lucide-react';
import { useDashboardStore } from '@/stores/ads-hub/dashboard-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/cpa/ui/select';
import type { AdsHubClientRow } from './client-card';

interface ClientDropdownProps {
  clients: AdsHubClientRow[];
  loading?: boolean;
}

export const ClientDropdown = ({ clients, loading }: ClientDropdownProps) => {
  const { selectedClientId, setSelectedClient } = useDashboardStore();

  const handleChange = (value: string) => {
    setSelectedClient(Number(value));
  };

  const currentValue = selectedClientId !== null ? String(selectedClientId) : undefined;

  return (
    <Select value={currentValue} onValueChange={handleChange} disabled={loading || clients.length === 0}>
      <SelectTrigger className="h-9 min-w-[240px] gap-2 text-sm">
        <Users className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder={clients.length === 0 ? 'אין לקוחות' : 'בחר לקוח'} />
      </SelectTrigger>
      <SelectContent>
        {clients.map((client) => (
          <SelectItem key={client.id} value={String(client.id)}>
            <span className="font-medium">{client.name}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
