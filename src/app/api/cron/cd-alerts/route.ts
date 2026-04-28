import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabase } from '@/lib/db/turso';
import { runAllDetectors } from '@/lib/clients-dashboard/alerts-detector';

// GET /api/cron/cd-alerts — runs all clients-dashboard detectors.
// Auth: Bearer ${CRON_SECRET}, matching the existing ad-sync cron pattern.
// Vercel cron invokes this daily; can also be triggered manually via curl.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureDatabase();
    const result = await runAllDetectors();
    return NextResponse.json({
      success: true,
      ...result,
      completedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[cd-alerts cron] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

// Allow POST as well so users can trigger from the UI without auth changes.
export const POST = GET;
