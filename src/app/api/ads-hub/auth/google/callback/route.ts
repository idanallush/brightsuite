import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { ensureDatabase } from '@/lib/db/turso';
import { saveGoogleConnection } from '@/lib/google/connection';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
}

function decodeIdToken(idToken: string): GoogleIdTokenPayload | null {
  try {
    const [, payload] = idToken.split('.');
    const decoded = Buffer.from(payload, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  await ensureDatabase();
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${BASE_URL}/ads-hub/settings?google_error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/ads-hub/settings?google_error=no_code`);
  }

  const session = await getServerSession();
  if (!session.userId) {
    return NextResponse.redirect(`${BASE_URL}/login`);
  }

  if (!state || state !== session.csrfState) {
    return NextResponse.redirect(`${BASE_URL}/ads-hub/settings?google_error=invalid_state`);
  }

  try {
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${BASE_URL}/api/ads-hub/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new Error(`Token exchange failed: ${err.slice(0, 200)}`);
    }

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;

    if (!tokenData.refresh_token) {
      // Happens if the user previously authorized and Google didn't return a
      // new refresh token. We forced `prompt=consent` so this is rare.
      return NextResponse.redirect(`${BASE_URL}/ads-hub/settings?google_error=no_refresh_token`);
    }

    let googleUserId: string | null = null;
    let googleUserEmail: string | null = null;
    if (tokenData.id_token) {
      const payload = decodeIdToken(tokenData.id_token);
      if (payload) {
        googleUserId = payload.sub;
        googleUserEmail = payload.email;
      }
    }

    await saveGoogleConnection(session.userId, {
      googleUserId,
      googleUserEmail,
      refreshToken: tokenData.refresh_token,
      accessToken: tokenData.access_token,
      expiresIn: tokenData.expires_in,
      scopes: tokenData.scope.split(' '),
    });

    session.csrfState = undefined;
    await session.save();

    return NextResponse.redirect(`${BASE_URL}/ads-hub/settings?google_connected=1`);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    return NextResponse.redirect(
      `${BASE_URL}/ads-hub/settings?google_error=${encodeURIComponent(
        err instanceof Error ? err.message : 'unknown'
      )}`
    );
  }
}
