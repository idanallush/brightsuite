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

const ALL_CLIENTS_VALUE = '__all__';

export const ClientDropdown = ({ clients, loading }: ClientDropdownProps) => {
  const { selectedClientId, setSelectedClient } = useDashboardStore();

  const currentValue = selectedClientId === null ? ALL_CLIENTS_VALUE : String(selectedClientId);

  const handleChange = (value: string) => {
    if (value === ALL_CLIENTS_VALUE) {
      setSelectedClient(null);
    } else {
      setSelectedClient(Number(value));
    }
  };

  return (
    <Select value={currentValue} onValueChange={handleChange} disabled={loading}>
      <SelectTrigger className="h-9 min-w-[220px] gap-2 text-sm">
        <Users className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="בחר לקוח" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_CLIENTS_VALUE}>
          <span className="font-medium">כל הלקוחות (מצטבר)</span>
        </SelectItem>
        {clients.map((client) => (
          <SelectItem key={client.id} value={String(client.id)}>
            <span className="font-medium">{client.name}</span>
            {client.slug && (
              <span className="text-xs text-muted-foreground mr-2 font-mono" dir="ltr">
                {client.slug}
              </span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
