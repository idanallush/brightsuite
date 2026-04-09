import { getTurso } from '@/lib/db/turso';

interface FbConnection {
  id: number;
  userId: number;
  fbUserId: string;
  fbUserName: string | null;
  accessToken: string;
  tokenExpiresAt: string | null;
  isActive: boolean;
}

// Get active FB connection for a user
export async function getFbConnection(userId: number): Promise<FbConnection | null> {
  const db = getTurso();
  const result = await db.execute({
    sql: 'SELECT * FROM bs_fb_connections WHERE created_by = ? AND is_active = 1 ORDER BY updated_at DESC LIMIT 1',
    args: [userId],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0];
  return {
    id: r.id as number,
    userId: r.created_by as number,
    fbUserId: r.fb_user_id as string,
    fbUserName: r.fb_user_name as string | null,
    accessToken: r.access_token as string,
    tokenExpiresAt: r.token_expires_at as string | null,
    isActive: true,
  };
}

// Save or update FB connection for a user
export async function saveFbConnection(userId: number, data: {
  fbUserId: string;
  fbUserName: string;
  accessToken: string;
  expiresIn: number;
}): Promise<void> {
  const db = getTurso();
  const expiresAt = new Date(Date.now() + data.expiresIn * 1000).toISOString();

  // Deactivate old connections
  await db.execute({
    sql: 'UPDATE bs_fb_connections SET is_active = 0 WHERE created_by = ?',
    args: [userId],
  });

  // Insert new
  await db.execute({
    sql: `INSERT INTO bs_fb_connections (created_by, fb_user_id, fb_user_name, access_token, token_expires_at, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
    args: [userId, data.fbUserId, data.fbUserName, data.accessToken, expiresAt],
  });
}

// Delete FB connection (soft — deactivate)
export async function deleteFbConnection(userId: number): Promise<void> {
  const db = getTurso();
  await db.execute({
    sql: 'UPDATE bs_fb_connections SET is_active = 0 WHERE created_by = ?',
    args: [userId],
  });
}

// Get FB access token for a user (convenience — used by API routes)
export async function getFbToken(userId: number): Promise<string | null> {
  const conn = await getFbConnection(userId);
  if (!conn) return null;
  // Check expiry
  if (conn.tokenExpiresAt && new Date(conn.tokenExpiresAt) < new Date()) return null;
  return conn.accessToken;
}
