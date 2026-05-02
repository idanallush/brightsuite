import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getGoogleAdsAccessToken, isGoogleAdsAvailable } from '@/lib/google/ads-api';

const GOOGLE_ADS_API_VERSION = 'v23';

interface CustomerClient {
  customerClient: {
    id: string;
    descriptiveName: string;
    currencyCode: string;
    manager: boolean;
    status: string;
  };
}

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  if (!isGoogleAdsAvailable()) {
    return NextResponse.json({ accounts: [], message: 'Google Ads not configured' });
  }

  const mccId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  if (!mccId) {
    return NextResponse.json({ accounts: [], message: 'No MCC ID configured' });
  }

  try {
    const accessToken = await getGoogleAdsAccessToken();

    const url = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}/customers/${mccId}/googleAds:searchStream`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'developer-token': process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
        'login-customer-id': mccId,
      },
      body: JSON.stringify({
        query: `
          SELECT
            customer_client.id,
            customer_client.descriptive_name,
            customer_client.currency_code,
            customer_client.manager,
            customer_client.status
          FROM customer_client
          WHERE customer_client.manager = false
            AND customer_client.status = 'ENABLED'
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[Google Ads] Failed to list accounts:', err);
      return NextResponse.json({ error: 'Failed to fetch Google accounts' }, { status: 500 });
    }

    const data = await res.json();
    const accounts: { id: string; name: string; currency: string }[] = [];

    if (Array.isArray(data)) {
      for (const batch of data) {
        if (batch.results) {
          for (const row of batch.results as CustomerClient[]) {
            const c = row.customerClient;
            accounts.push({
              id: c.id,
              name: c.descriptiveName || `Account ${c.id}`,
              currency: c.currencyCode,
            });
          }
        }
      }
    }

    return NextResponse.json({ accounts, mccId });
  } catch (err) {
    console.error('[Google Ads] Error fetching accounts:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
