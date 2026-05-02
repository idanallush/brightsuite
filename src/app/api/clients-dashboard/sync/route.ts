import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { runDailySync } from '@/lib/ads-hub/sync-orchestrator';

// POST /api/clients-dashboard/sync — trigger manual sync for all clients
export async function POST(_request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const result = await runDailySync();
  return NextResponse.json(result);
}
