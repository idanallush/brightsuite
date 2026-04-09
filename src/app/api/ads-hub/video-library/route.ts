import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';

// GET /api/ads-hub/video-library — video ads with filters
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const clientId = searchParams.get('clientId');
  const search = searchParams.get('search');
  const filter = searchParams.get('filter'); // 'all' | 'with-utms' | 'missing-transcript'

  const db = getTurso();

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (clientId) {
    conditions.push('v.client_id = ?');
    args.push(clientId);
  }

  if (search) {
    conditions.push('v.ad_name LIKE ?');
    args.push(`%${search}%`);
  }

  if (filter === 'with-utms') {
    conditions.push('v.utm_campaign IS NOT NULL');
  } else if (filter === 'missing-transcript') {
    conditions.push('(v.transcript IS NULL OR v.transcript = "")');
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.execute({
    sql: `
      SELECT
        v.*,
        c.name as client_name,
        COALESCE(SUM(vp.spend), 0) as total_spend,
        COALESCE(SUM(vp.impressions), 0) as total_impressions,
        COALESCE(SUM(vp.views), 0) as total_views
      FROM ah_video_ads v
      LEFT JOIN ah_clients c ON c.id = v.client_id
      LEFT JOIN ah_video_performance vp ON vp.video_ad_id = v.id
      ${whereClause}
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT 100
    `,
    args,
  });

  return NextResponse.json({ videos: result.rows });
}
