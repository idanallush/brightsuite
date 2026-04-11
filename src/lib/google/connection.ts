import { getTurso } from '@/lib/db/turso';

export interface GoogleConnection {
  id: number;
  userId: number;
  googleUserId: string | null;
  googleUserEmail: string | null;
  refreshToken: string;
  accessToken: string | null;
  tokenExpiresAt: string | null;
  scopes: string[];
  isActive: boolean;
}

export async function getGoogleConnection(userId: number): Promise<GoogleConnection | null> {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT * FROM bs_google_connections
          WHERE created_by = ? AND is_active = 1
          ORDER BY updated_at DESC LIMIT 1`,
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: r.id as number,
    userId: r.created_by as number,
    googleUserId: (r.google_user_id as string) || null,
    googleUserEmail: (r.google_user_email as string) || null,
    refreshToken: r.refresh_token as string,
    accessToken: (r.access_token as string) || null,
    tokenExpiresAt: (r.token_expires_at as string) || null,
    scopes: ((r.scopes as string) || '').split(',').filter(Boolean),
    isActive: true,
  };
}

// Returns any active Google connection in the workspace — Google Ads & GA4
// syncs don't need per-user attribution, just a valid token.
export async function getAnyGoogleConnection(): Promise<GoogleConnection | null> {
  const db = getTurso();
  const result = await db.execute({
    sql: `SELECT * FROM bs_google_connections
          WHERE is_active = 1
          ORDER BY updated_at DESC LIMIT 1`,
    args: [],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: r.id as number,
    userId: r.created_by as number,
    googleUserId: (r.google_user_id as string) || null,
    googleUserEmail: (r.google_user_email as string) || null,
    refreshToken: r.refresh_token as string,
    accessToken: (r.access_token as string) || null,
    tokenExpiresAt: (r.token_expires_at as string) || null,
    scopes: ((r.scopes as string) || '').split(',').filter(Boolean),
    isActive: true,
  };
}

export async function saveGoogleConnection(
  userId: number,
  data: {
    googleUserId: string | null;
    googleUserEmail: string | null;
    refreshToken: string;
    accessToken: string;
    expiresIn: number;
    scopes: string[];
  }
): Promise<void> {
  const db = getTurso();
  const expiresAt = new Date(Date.now() + data.expiresIn * 1000).toISOString();

  await db.execute({
    sql: 'UPDATE bs_google_connections SET is_active = 0 WHERE created_by = ?',
    args: [userId],
  });

  await db.execute({
    sql: `INSERT INTO bs_google_connections
          (created_by, google_user_id, google_user_email, refresh_token, access_token, token_expires_at, scopes, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
    args: [
      userId,
      data.googleUserId,
      data.googleUserEmail,
      data.refreshToken,
      data.accessToken,
      expiresAt,
      data.scopes.join(','),
    ],
  });
}

export async function deleteGoogleConnection(userId: number): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: 'UPDATE bs_google_connections SET is_active = 0 WHERE created_by = ?',
    args: [userId],
  });
}

// Refresh an access token using the stored refresh token.
// Prefers DB-stored connection over env var. Falls back to env for backward compat.
export async function getFreshGoogleAccessToken(scope: 'adwords' | 'analytics'): Promise<string | null> {
  const conn = await getAnyGoogleConnection();
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  // DB-stored connection path
  if (conn) {
    const requiredScope =
      scope === 'adwords'
        ? 'https://www.googleapis.com/auth/adwords'
        : 'https://www.googleapis.com/auth/analytics.readonly';

    if (!conn.scopes.some((s) => s === requiredScope || s.endsWith('/' + scope + '.readonly') || s.endsWith('/' + scope))) {
      // Scope not granted on the stored connection
      return null;
    }

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: conn.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google OAuth refresh failed: ${err.slice(0, 200)}`);
    }
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  // Env var fallback (legacy): only works for Ads scope
  if (scope === 'adwords' && process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token: string };
    return data.access_token;
  }

  return null;
}
