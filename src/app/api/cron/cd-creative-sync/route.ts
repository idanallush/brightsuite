import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabase, getTurso } from '@/lib/db/turso';
import { getActiveAccessToken } from '@/lib/ads-hub/meta-ads-service';
import {
  syncCreatives,
  syncCreativePerformance,
} from '@/lib/clients-dashboard/creative-sync';

// GET /api/cron/cd-creative-sync — iterates every active client with a
// connected Meta account and runs creative discovery + last-30-days perf.
// Auth: Bearer ${CRON_SECRET}, matching the cd-alerts / ad-sync pattern.
// Scheduled in vercel.json to run before cd-alerts so the alert run sees
// fresh creative data.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabase();
    const accessToken = await getActiveAccessToken();
    if (!accessToken) {
      return NextResponse.json(
        { error: 'No active Meta access token. Connect Facebook in Ads Hub first.' },
        { status: 503 },
      );
    }

    const db = getTurso();
    const clientsResult = await db.execute({
      sql: `SELECT id, name, meta_account_id
            FROM ah_clients
            WHERE is_active = 1 AND meta_account_id IS NOT NULL`,
    });

    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    const startDateD = new Date(today);
    startDateD.setDate(today.getDate() - 30);
    const startDate = startDateD.toISOString().split('T')[0];

    const perClient: Array<{
      clientId: number;
      name: string;
      discoverySynced: number;
      performanceSynced: number;
      status: 'success' | 'error';
      error?: string;
    }> = [];

    for (const row of clientsResult.rows) {
      const clientId = Number(row.id);
      const name = String(row.name);
      const accountId = String(row.meta_account_id);

      try {
        const discovery = await syncCreatives(clientId, accountId, accessToken);
        const performance = await syncCreativePerformance(
          clientId,
          startDate,
          endDate,
          accessToken,
        );
        perClient.push({
          clientId,
          name,
          discoverySynced: discovery.recordsSynced,
          performanceSynced: performance.recordsSynced,
          status:
            discovery.status === 'error' || performance.status === 'error'
              ? 'error'
              : 'success',
          error: discovery.error || performance.error,
        });
      } catch (err) {
        perClient.push({
          clientId,
          name,
          discoverySynced: 0,
          performanceSynced: 0,
          status: 'error',
          error: (err as Error).message,
        });
      }
    }

    const totals = perClient.reduce(
      (acc, c) => {
        acc.discoverySynced += c.discoverySynced;
        acc.performanceSynced += c.performanceSynced;
        if (c.status === 'success') acc.successClients += 1;
        else acc.errorClients += 1;
        return acc;
      },
      { discoverySynced: 0, performanceSynced: 0, successClients: 0, errorClients: 0 },
    );

    return NextResponse.json({
      success: true,
      range: { startDate, endDate },
      clientsProcessed: perClient.length,
      ...totals,
      perClient,
      completedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cd-creative-sync cron] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

// Allow POST so the same handler can be invoked manually from a curl/cron tester.
export const POST = GET;
