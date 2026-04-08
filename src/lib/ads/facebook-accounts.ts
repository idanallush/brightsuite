import { fbFetchAll } from "@/lib/facebook/client";
import type { FBAdAccount } from "@/lib/facebook/types";

const ACCOUNT_FIELDS = "name,account_id,account_status,currency,business_name";

export async function fetchAdAccounts(accessToken: string): Promise<FBAdAccount[]> {
  const accounts = await fbFetchAll<FBAdAccount>(
    `/me/adaccounts?fields=${ACCOUNT_FIELDS}&limit=100`,
    accessToken
  );

  // Filter only active accounts (status 1 = ACTIVE)
  return accounts.filter((account) => account.account_status === 1);
}
