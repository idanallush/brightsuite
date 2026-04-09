import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getFbConnection } from '@/lib/facebook/connection';

export async function GET() {
  const { session, error } = await requireApiAuth();
  if (error) return error;

  const conn = await getFbConnection(session.userId);
  if (!conn) {
    return NextResponse.json({ connected: false });
  }

  const expiresAt = conn.tokenExpiresAt ? new Date(conn.tokenExpiresAt).getTime() : null;
  const expiresIn = expiresAt ? expiresAt - Date.now() : null;

  return NextResponse.json({
    connected: true,
    fbUserName: conn.fbUserName,
    fbUserId: conn.fbUserId,
    tokenExpiresIn: expiresIn,
    tokenExpiry: expiresAt,
  });
}
