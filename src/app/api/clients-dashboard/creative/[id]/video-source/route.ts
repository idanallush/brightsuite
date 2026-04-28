import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';
import { getActiveAccessToken } from '@/lib/ads-hub/meta-ads-service';
import { fbFetch } from '@/lib/facebook/client';

// GET /api/clients-dashboard/creative/[id]/video-source
// Lazy resolver: fetches the playable Meta video source URL on demand
// (the modal calls this only when the video is actually about to be viewed).
// We don't store source URLs at sync time because they expire — Meta only
// hands them out via /{video_id}?fields=source.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  const creativeId = Number(id);
  if (!creativeId) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }

  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT type, raw_json, platform FROM cd_creatives WHERE id = ?`,
    args: [creativeId],
  });
  if (result.rows.length === 0) {
    return NextResponse.json({ error: 'Creative not found' }, { status: 404 });
  }

  const row = result.rows[0];
  if (row.platform !== 'meta') {
    return NextResponse.json(
      { error: 'Video resolution is only supported for Meta creatives' },
      { status: 400 },
    );
  }
  if (row.type !== 'video') {
    return NextResponse.json(
      { error: 'Creative is not a video' },
      { status: 400 },
    );
  }

  const videoId = extractVideoId(row.raw_json as string | null);
  if (!videoId) {
    return NextResponse.json(
      { error: 'No video_id present in raw creative payload' },
      { status: 404 },
    );
  }

  const accessToken = await getActiveAccessToken();
  if (!accessToken) {
    return NextResponse.json(
      { error: 'No active Meta access token' },
      { status: 503 },
    );
  }

  try {
    const meta = await fbFetch<{ source?: string; picture?: string; id?: string }>(
      `/${videoId}?fields=source,picture`,
      accessToken,
    );
    if (!meta.source) {
      return NextResponse.json(
        { error: 'Meta returned no source URL for this video' },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { videoId, source: meta.source, picture: meta.picture ?? null },
      // Source URLs are short-lived; allow the browser to keep it briefly
      // so re-opening the modal in the same session doesn't refetch.
      { headers: { 'Cache-Control': 'private, max-age=300' } },
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to resolve video source' },
      { status: 502 },
    );
  }
}

interface RawCreativePayload {
  creative?: {
    video_id?: string;
    object_story_spec?: {
      video_data?: { video_id?: string };
      link_data?: { child_attachments?: Array<{ video_id?: string }> };
    };
    asset_feed_spec?: { videos?: Array<{ video_id?: string }> };
  };
}

function extractVideoId(rawJson: string | null): string | null {
  if (!rawJson) return null;
  let parsed: RawCreativePayload;
  try {
    parsed = JSON.parse(rawJson) as RawCreativePayload;
  } catch {
    return null;
  }
  const c = parsed.creative;
  if (!c) return null;
  if (c.video_id) return c.video_id;
  const fromVideoData = c.object_story_spec?.video_data?.video_id;
  if (fromVideoData) return fromVideoData;
  const fromAssetFeed = c.asset_feed_spec?.videos?.find((v) => v.video_id)?.video_id;
  if (fromAssetFeed) return fromAssetFeed;
  const fromChild = c.object_story_spec?.link_data?.child_attachments?.find(
    (a) => a.video_id,
  )?.video_id;
  return fromChild ?? null;
}
