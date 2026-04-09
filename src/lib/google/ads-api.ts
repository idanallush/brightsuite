// Shared Google Ads API utilities
// Used by both BudgetFlow and Ads Hub

const GOOGLE_ADS_API_VERSION = 'v23';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export async function getGoogleAdsAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
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
  return !!(
    process.env.GOOGLE_ADS_CLIENT_ID &&
    process.env.GOOGLE_ADS_CLIENT_SECRET &&
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
    process.env.GOOGLE_ADS_REFRESH_TOKEN
  );
}
