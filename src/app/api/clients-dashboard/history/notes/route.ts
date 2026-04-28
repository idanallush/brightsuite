import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';

// POST /api/clients-dashboard/history/notes
// Body: { campaignId: number, note: string }
// Inserts a manual note into cd_campaign_changes with source='user'.
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const body = (await request.json().catch(() => ({}))) as {
    campaignId?: number | string;
    note?: string;
  };
  const campaignId = body.campaignId ? Number(body.campaignId) : null;
  const note = (body.note ?? '').trim();
  if (!campaignId || !note) {
    return NextResponse.json(
      { error: 'campaignId and note are required' },
      { status: 400 }
    );
  }

  const db = getTurso();
  const cmpResult = await db.execute({
    sql: 'SELECT id, client_id, platform, platform_campaign_id FROM ah_campaigns WHERE id = ?',
    args: [campaignId],
  });
  if (cmpResult.rows.length === 0) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }
  const cmp = cmpResult.rows[0];

  const inserted = await db.execute({
    sql: `INSERT INTO cd_campaign_changes
          (client_id, campaign_id, platform, platform_campaign_id, change_type, field, old_value, new_value, source, user_id, detected_at, note)
          VALUES (?, ?, ?, ?, 'note', NULL, NULL, NULL, 'user', ?, datetime('now'), ?)
          RETURNING id, detected_at`,
    args: [
      Number(cmp.client_id),
      campaignId,
      String(cmp.platform),
      String(cmp.platform_campaign_id),
      auth.session.userId,
      note,
    ],
  });

  return NextResponse.json({
    id: inserted.rows[0]?.id != null ? Number(inserted.rows[0].id) : null,
    detectedAt: inserted.rows[0]?.detected_at ?? null,
  });
}
