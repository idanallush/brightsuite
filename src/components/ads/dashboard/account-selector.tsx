"use client";

import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/cpa/ui/select";
import type { FBAdAccount } from "@/lib/facebook/types";
import { LoadingSpinner } from "@/components/ads/ui/loading-spinner";
import { AlertTriangle } from "lucide-react";

const HIDDEN_ACCOUNTS_KEY = "fb-ads-hidden-accounts";

function getHiddenAccounts(): Set<string> {
  try {
    const stored = localStorage.getItem(HIDDEN_ACCOUNTS_KEY);
    if (stored) {
      return new Set(JSON.parse(stored) as string[]);
    }
  } catch {
    // ignore
  }
  return new Set();
}

interface AccountSelectorProps {
  accounts: FBAdAccount[];
  selectedAccountId: string | null;
  onAccountChange: (accountId: string) => void;
  isLoading: boolean;
}

export function AccountSelector({
  accounts,
  selectedAccountId,
  onAccountChange,
  isLoading,
}: AccountSelectorProps) {
  const visibleAccounts = useMemo(() => {
    const hidden = getHiddenAccounts();
    if (hidden.size === 0) return accounts;
    return accounts.filter((a) => !hidden.has(a.id));
  }, [accounts]);

  const selectedAccount = visibleAccounts.find((a) => a.id === selectedAccountId);

  if (isLoading) {
    return (
      <div className="flex items-center h-9 w-64">
        <LoadingSpinner message="טוען חשבונות..." size="sm" />
      </div>
    );
  }

  return (
    <Select
      value={selectedAccountId || ""}
      onValueChange={onAccountChange}
    >
      <SelectTrigger
        className={`w-72 h-9 text-right ${
          selectedAccountId
            ? "bg-blue-50 border-blue-200 text-blue-700"
            : "bg-white border-zinc-200 text-zinc-700"
        }`}
        aria-label="בחירת חשבון פרסום"
        title="בחירת חשבון פרסום"
      >
        <SelectValue placeholder="בחר חשבון פרסום">
          {selectedAccount && (
            <span className="truncate">
              {selectedAccount.name}
              <span className="text-zinc-400 text-xs ms-1.5">
                ({selectedAccount.account_id.slice(0, 6)}...)
              </span>
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="text-right max-h-80">
        {visibleAccounts.map((account) => (
          <SelectItem
            key={account.id}
            value={account.id}
            className="py-3 px-4 cursor-pointer hover:bg-[#F0F7FF] data-[state=checked]:bg-[#F0F7FF] data-[state=checked]:border-s-2 data-[state=checked]:border-s-[#1877F2]"
          >
            <div className="flex flex-col items-end gap-0.5">
              <span className="flex items-center gap-2">
                {account.account_status !== undefined && account.account_status !== 1 && (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" aria-label="החשבון לא פעיל" />
                )}
                <span className="font-medium text-zinc-800">{account.name}</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
                <span>{account.account_id}</span>
                {account.business_name && (
                  <span>· {account.business_name}</span>
                )}
              </span>
            </div>
          </SelectItem>
        ))}
        {visibleAccounts.length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            לא נמצאו חשבונות פרסום
          </div>
        )}
      </SelectContent>
    </Select>
  );
}
