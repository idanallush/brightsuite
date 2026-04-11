import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getAnyGoogleConnection } from '@/lib/google/connection';

export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const conn = await getAnyGoogleConnection();
  if (!conn) {
    return NextResponse.json({ connected: false });
  }

  const hasAds = conn.scopes.some((s) => s.includes('adwords'));
  const hasGa4 = conn.scopes.some((s) => s.includes('analytics.readonly'));

  return NextResponse.json({
    connected: true,
    email: conn.googleUserEmail,
    scopes: conn.scopes,
    hasAdsScope: hasAds,
    hasGa4Scope: hasGa4,
    tokenExpiresAt: conn.tokenExpiresAt,
  });
}
