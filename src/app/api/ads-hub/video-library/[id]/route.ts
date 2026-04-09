import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';

// GET /api/ads-hub/video-library/[id] — video detail + performance
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const db = getTurso();

  const videoResult = await db.execute({
    sql: 'SELECT v.*, c.name as client_name FROM ah_video_ads v LEFT JOIN ah_clients c ON c.id = v.client_id WHERE v.id = ?',
    args: [id],
  });

  if (videoResult.rows.length === 0) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  const perfResult = await db.execute({
    sql: 'SELECT * FROM ah_video_performance WHERE video_ad_id = ? ORDER BY date ASC',
    args: [id],
  });

  return NextResponse.json({
    video: videoResult.rows[0],
    performance: perfResult.rows,
  });
}

// PUT /api/ads-hub/video-library/[id] — update transcript
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { transcript } = body;

  const db = getTurso();

  await db.execute({
    sql: 'UPDATE ah_video_ads SET transcript = ? WHERE id = ?',
    args: [transcript || null, id],
  });

  const updated = await db.execute({
    sql: 'SELECT * FROM ah_video_ads WHERE id = ?',
    args: [id],
  });

  return NextResponse.json({ video: updated.rows[0] });
}
