import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import { getActiveAccessToken } from '@/lib/ads-hub/meta-ads-service';
import {
  syncCreatives,
  syncCreativePerformance,
} from '@/lib/clients-dashboard/creative-sync';

// POST /api/clients-dashboard/creative/sync?clientId=X
// Admin-only. Discovers creatives + syncs the last 30 days of perf into
// cd_creatives / cd_creative_assets / cd_creative_performance.
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const clientIdStr = request.nextUrl.searchParams.get('clientId');
  const clientId = Number(clientIdStr);
  if (!clientId) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const db = getTurso();
  const clientRow = await db.execute({
    sql: 'SELECT meta_account_id FROM ah_clients WHERE id = ? AND is_active = 1',
    args: [clientId],
  });
  if (clientRow.rows.length === 0) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }

  const accountId = clientRow.rows[0].meta_account_id as string | null;
  if (!accountId) {
    return NextResponse.json(
      { error: 'Client has no Meta account connected' },
      { status: 400 },
    );
  }

  const accessToken = await getActiveAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: 'No active Meta access token. Connect Facebook in Ads Hub first.' },
      { status: 400 },
    );
  }

  // Discovery first so we have creative_ids to attach perf rows to.
  const discovery = await syncCreatives(clientId, accountId, accessToken);

  // Default to last 30 days.
  const today = new Date();
  const endDate = today.toISOString().split('T')[0];
  const startDateD = new Date(today);
  startDateD.setDate(today.getDate() - 30);
  const startDate = startDateD.toISOString().split('T')[0];

  const performance = await syncCreativePerformance(
    clientId,
    startDate,
    endDate,
    accessToken,
  );

  return NextResponse.json({
    discovery,
    performance,
    range: { startDate, endDate },
  });
}
