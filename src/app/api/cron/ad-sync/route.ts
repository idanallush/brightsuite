import { NextRequest, NextResponse } from 'next/server';
import { runDailySync } from '@/lib/ads-hub/sync-orchestrator';

// POST /api/cron/ad-sync — nightly sync triggered by Vercel cron
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runDailySync();
    return NextResponse.json({
      success: true,
      ...result,
      completedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[ad-sync cron] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
