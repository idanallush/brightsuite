import { NextRequest } from 'next/server';
import { getTurso } from '@/lib/db/turso';
import { json, error } from '@/lib/budget/api-helpers';

const GOOGLE_ADS_API_VERSION = 'v23';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

async function getAccessToken(): Promise<string> {
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

  const data = await res.json() as GoogleTokenResponse;
  return data.access_token;
}

async function queryGoogleAds(
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
      'Authorization': `Bearer ${accessToken}`,
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
  // searchStream returns array of batches, each with results
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

function mapGoogleStatus(status: string): 'active' | 'paused' | 'stopped' {
  switch (status) {
    case 'ENABLED': return 'active';
    case 'PAUSED': return 'paused';
    default: return 'stopped';
  }
}

// POST /api/budget/google/sync — sync campaigns from Google Ads
export async function POST(request: NextRequest) {
  const requiredEnvVars = [
    'GOOGLE_ADS_DEVELOPER_TOKEN',
    'GOOGLE_ADS_CLIENT_ID',
    'GOOGLE_ADS_CLIENT_SECRET',
    'GOOGLE_ADS_REFRESH_TOKEN',
  ];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      return error(`${envVar} not configured`, 500);
    }
  }

  const body = await request.json().catch(() => null);
  const { client_id, google_customer_id, google_mcc_id } = body ?? {};
  if (!client_id) return error('client_id is required');

  try {
    const db = getTurso();

    const clientResult = await db.execute({
      sql: 'SELECT * FROM bf_clients WHERE id = ? LIMIT 1',
      args: [client_id],
    });
    if (clientResult.rows.length === 0) return error('Client not found', 404);
    const client = clientResult.rows[0];

    // Determine Customer ID
    let customerId = client.google_customer_id as string | null;
    if (google_customer_id) {
      const cleaned = google_customer_id.replace(/-/g, '');
      await db.execute({
        sql: 'UPDATE bf_clients SET google_customer_id = ? WHERE id = ?',
        args: [cleaned, client_id],
      });
      customerId = cleaned;
    }
    if (!customerId) return error('No Google Ads Customer ID configured for this client');

    // Determine MCC ID (login-customer-id) — per client, fallback to env
    let mccId = client.google_mcc_id as string | null;
    if (google_mcc_id) {
      const cleanedMcc = google_mcc_id.replace(/-/g, '');
      await db.execute({
        sql: 'UPDATE bf_clients SET google_mcc_id = ? WHERE id = ?',
        args: [cleanedMcc, client_id],
      });
      mccId = cleanedMcc;
    }
    if (!mccId) {
      mccId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || null;
    }
    if (!mccId) return error('No Google MCC ID configured for this client');

    const accessToken = await getAccessToken();

    const now = new Date();
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const today = now.toISOString().split('T')[0];

    // GAQL: campaigns with impressions this month
    const query = `
      SELECT
        campaign.id,
        campaign.name,
        campaign.status,
        metrics.cost_micros,
        metrics.impressions
      FROM campaign
      WHERE segments.date BETWEEN '${monthStart}' AND '${today}'
        AND metrics.impressions > 0
    `;

    const rows = await queryGoogleAds(customerId, accessToken, query, mccId);

    // Aggregate per campaign (rows are per-day due to segments.date)
    const campaignMap = new Map<string, {
      id: string;
      name: string;
      status: string;
      startDate: string | null;
      endDate: string | null;
      totalCostMicros: number;
      totalImpressions: number;
    }>();

    for (const row of rows) {
      const c = row.campaign as Record<string, string>;
      const m = row.metrics as Record<string, string>;
      const cId = c.id;

      const existing = campaignMap.get(cId);
      if (existing) {
        existing.totalCostMicros += Number(m.costMicros || 0);
        existing.totalImpressions += Number(m.impressions || 0);
      } else {
        campaignMap.set(cId, {
          id: cId,
          name: c.name,
          status: c.status,
          startDate: null,
          endDate: null,
          totalCostMicros: Number(m.costMicros || 0),
          totalImpressions: Number(m.impressions || 0),
        });
      }
    }

    // Existing Google campaigns for this client
    const existingResult = await db.execute({
      sql: 'SELECT * FROM bf_campaigns WHERE client_id = ?',
      args: [client_id],
    });
    const existingCampaigns = existingResult.rows;
    const googleIdMap = new Map(
      existingCampaigns
        .filter((c) => c.meta_campaign_id && c.platform === 'google')
        .map((c) => [c.meta_campaign_id as string, c])
    );

    let created = 0;
    let updated = 0;

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (const [, gc] of campaignMap) {
      const spend = Math.round((gc.totalCostMicros / 1_000_000) * 100) / 100;
      const status = mapGoogleStatus(gc.status);
      const googleAdLink = `https://ads.google.com/aw/campaigns?campaignId=${gc.id}&ocid=${customerId}`;

      const existing = googleIdMap.get(gc.id);

      if (existing) {
        await db.execute({
          sql: `UPDATE bf_campaigns SET actual_spend = ?, actual_spend_month = ?, status = ?, ad_link = ?, last_synced_at = ? WHERE id = ?`,
          args: [spend, currentMonth, status, googleAdLink, now.toISOString(), existing.id as string],
        });
        updated++;
      } else {
        const startDate = today;

        const newCampaignResult = await db.execute({
          sql: `INSERT INTO bf_campaigns (client_id, name, technical_name, platform, campaign_type, meta_campaign_id, actual_spend, actual_spend_month, status, start_date, end_date, ad_link, last_synced_at)
                VALUES (?, ?, ?, 'google', ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
          args: [
            client_id,
            gc.name,
            gc.name,
            null,
            gc.id,
            spend,
            currentMonth,
            status,
            startDate,
            gc.endDate,
            googleAdLink,
            now.toISOString(),
          ],
        });

        const newCampaign = newCampaignResult.rows[0];

        await db.execute({
          sql: `INSERT INTO bf_changelog (campaign_id, action, description, performed_by)
                VALUES (?, 'campaign_added', ?, 'Google Sync')`,
          args: [newCampaign.id as string, `קמפיין סונכרן מ-Google Ads: ${gc.name}`],
        });

        created++;
      }
    }

    return json({
      success: true,
      google_customer_id: customerId,
      total_campaigns: campaignMap.size,
      created,
      updated,
      synced_at: now.toISOString(),
    });
  } catch (err) {
    console.error('Google sync error:', err);
    return error(`Sync failed: ${(err as Error).message}`, 500);
  }
}
