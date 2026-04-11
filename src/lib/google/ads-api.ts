// Shared Google Ads API utilities
// Used by both BudgetFlow and Ads Hub

import { getFreshGoogleAccessToken } from '@/lib/google/connection';

const GOOGLE_ADS_API_VERSION = 'v23';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export async function getGoogleAdsAccessToken(): Promise<string> {
  // Prefer DB-stored OAuth connection over env var refresh token.
  const dbToken = await getFreshGoogleAccessToken('adwords').catch(() => null);
  if (dbToken) return dbToken;

  // Legacy env-var fallback
  if (!process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    throw new Error('No Google connection found. Connect Google in Ads Hub settings.');
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to get Google access token: ${err}`);
  }

  const data = (await res.json()) as GoogleTokenResponse;
  return data.access_token;
}

export async function queryGoogleAds(
  customerId: string,
  accessToken: string,
  query: string,
  loginCustomerId: string
): Promise<Record<string, unknown>[]> {
  const cleanCustomerId = customerId.replace(/-/g, '');

  const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${cleanCustomerId}/googleAds:searchStream`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
      'login-customer-id': loginCustomerId,
    },
    body: JSON.stringify({ query }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google Ads API error: ${err}`);
  }

  const data = await res.json();
  const results: Record<string, unknown>[] = [];
  if (Array.isArray(data)) {
    for (const batch of data) {
      if (batch.results) {
        results.push(...(batch.results as Record<string, unknown>[]));
      }
    }
  }
  return results;
}

export function isGoogleAdsAvailable(): boolean {
  // Legacy sync check based only on env vars (for backwards compat).
  // New callers should use isGoogleAdsAvailableAsync which also checks the DB.
  return !!(
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN
  );
}

export async function isGoogleAdsAvailableAsync(): Promise<boolean> {
  // Ads API always needs client ID/secret + developer token as env vars.
  const hasBaseConfig = !!(
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  );
  if (!hasBaseConfig) return false;

  // Refresh token can come from env var OR DB-stored OAuth connection.
  if (process.env.GOOGLE_ADS_REFRESH_TOKEN) return true;

  const { getAnyGoogleConnection } = await import('@/lib/google/connection');
  const conn = await getAnyGoogleConnection();
  return !!conn && conn.scopes.some((s) => s.includes('adwords'));
}
