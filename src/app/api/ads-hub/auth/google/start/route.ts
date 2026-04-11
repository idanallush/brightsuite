import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';

const SCOPES = [
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/analytics.readonly',
  'openid',
  'email',
];

export async function GET() {
  const session = await getServerSession();
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_ADS_CLIENT_ID not configured' }, { status: 500 });
  }

  const csrfState = crypto.randomUUID();
  session.csrfState = csrfState;
  await session.save();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${baseUrl}/api/ads-hub/auth/google/callback`,
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state: csrfState,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
