import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { runBackfill } from '@/lib/ads-hub/sync-orchestrator';
import type { Platform } from '@/lib/ads-hub/types';

// POST /api/ads-hub/sync/backfill — trigger historical backfill
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { clientId, platform, startDate, endDate } = body as {
    clientId: number;
    platform: Platform;
    startDate: string;
    endDate: string;
  };

  if (!clientId || !platform || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'clientId, platform, startDate, and endDate are required' },
      { status: 400 }
    );
  }

  const validPlatforms: Platform[] = ['meta', 'google', 'ga4'];
  if (!validPlatforms.includes(platform)) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 });
  }

  const results = await runBackfill(clientId, platform, startDate, endDate);
  return NextResponse.json({ results });
}
