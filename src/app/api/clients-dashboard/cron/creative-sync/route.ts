import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabase, getTurso } from '@/lib/db/turso';
import { getActiveAccessToken } from '@/lib/ads-hub/meta-ads-service';
import {
  syncCreatives,
  syncCreativePerformance,
} from '@/lib/clients-dashboard/creative-sync';

// GET /api/clients-dashboard/cron/creative-sync — daily Vercel cron.
// Iterates every active client with a connected Meta account and runs the
// same creative discovery + last-30-days perf sync the manual POST uses.
// Auth: Bearer ${CRON_SECRET}, matching /api/cron/ad-sync and /api/cron/cd-alerts.
// Schedule lives in vercel.json (04:00 UTC, before cd-alerts at 06:00 UTC).
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

    const errors: Array<{ clientId: number; name: string; error: string }> = [];
    let processed = 0;
    let discoverySynced = 0;
    let performanceSynced = 0;

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
        discoverySynced += discovery.recordsSynced;
        performanceSynced += performance.recordsSynced;
        processed += 1;

        if (discovery.status === 'error') {
          errors.push({ clientId, name, error: discovery.error || 'discovery failed' });
        }
        if (performance.status === 'error') {
          errors.push({ clientId, name, error: performance.error || 'performance failed' });
        }
      } catch (err) {
        errors.push({ clientId, name, error: (err as Error).message });
      }
    }

    return NextResponse.json({
      success: true,
      range: { startDate, endDate },
      processed,
      discoverySynced,
      performanceSynced,
      errors,
      completedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[clients-dashboard/cron/creative-sync] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

// Allow POST as well so the same handler is callable from a curl/cron tester
// without having to flip methods — same Bearer auth applies.
export const POST = GET;
