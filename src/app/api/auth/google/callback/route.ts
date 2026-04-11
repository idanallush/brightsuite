import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { exchangeCodeForTokens, verifyGoogleToken } from '@/lib/google/auth';
import { getTurso } from '@/lib/db/turso';
import { logAudit } from '@/lib/audit';
import type { SessionData } from '@/types/auth';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle user denied permission
  if (error) {
    return NextResponse.redirect(`${BASE_URL}/login?error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return NextResponse.redirect(`${BASE_URL}/login?error=no_code`);
  }

  const session = await getServerSession();

  // Validate CSRF state
  if (!state || state !== session.csrfState) {
    return NextResponse.redirect(`${BASE_URL}/login?error=invalid_state`);
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Verify id_token and extract user info
    const googleUser = await verifyGoogleToken(tokens.id_token);

    const db = getTurso();

    // Look up user by email
    const userResult = await db.execute({
      sql: 'SELECT * FROM bs_users WHERE email = ? AND is_active = 1',
      args: [googleUser.email],
    });

    let userId: number;
    let userName: string;
    let userEmail: string;
    let userRole: SessionData['role'];
    let avatarUrl: string | null;

    if (userResult.rows.length === 0) {
      // First user in the workspace becomes admin; subsequent users default to viewer.
      const countResult = await db.execute({
        sql: 'SELECT COUNT(*) as count FROM bs_users WHERE is_active = 1',
        args: [],
      });
      const isFirstUser = Number(countResult.rows[0]?.count ?? 0) === 0;
      const newRole: SessionData['role'] = isFirstUser ? 'admin' : 'viewer';

      const insertResult = await db.execute({
        sql: `INSERT INTO bs_users (email, name, password_hash, role, google_id, avatar_url, is_active, created_at, updated_at)
              VALUES (?, ?, NULL, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
        args: [googleUser.email, googleUser.name, newRole, googleUser.sub, googleUser.picture || null],
      });

      userId = Number(insertResult.lastInsertRowid);
      userName = googleUser.name;
      userEmail = googleUser.email;
      userRole = newRole;
      avatarUrl = googleUser.picture || null;
    } else {
      const user = userResult.rows[0];
      userId = user.id as number;
      userName = user.name as string;
      userEmail = user.email as string;
      userRole = user.role as SessionData['role'];
      avatarUrl = (user.avatar_url as string) || googleUser.picture || null;

      // If google_id is NULL, update it
      if (!user.google_id) {
        await db.execute({
          sql: 'UPDATE bs_users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?), updated_at = datetime(\'now\') WHERE id = ?',
          args: [googleUser.sub, googleUser.picture || null, userId],
        });
      }
    }

    // Fetch tool permissions
    const permsResult = await db.execute({
      sql: 'SELECT tool_slug FROM bs_tool_permissions WHERE user_id = ?',
      args: [userId],
    });
    const tools = permsResult.rows.map((r) => r.tool_slug as string);

    // Set iron-session
    session.userId = userId;
    session.email = userEmail;
    session.name = userName;
    session.role = userRole;
    session.tools = tools as SessionData['tools'];
    session.avatarUrl = avatarUrl || undefined;
    session.csrfState = undefined;
    await session.save();

    await logAudit({
      userId,
      userEmail,
      userName,
      action: 'google_login',
    });

    return NextResponse.redirect(`${BASE_URL}/dashboard`);
  } catch (err) {
    console.error('[Google OAuth] Callback error:', err);
    return NextResponse.redirect(
      `${BASE_URL}/login?error=auth_failed&message=${encodeURIComponent(
        err instanceof Error ? err.message : 'Unknown error',
      )}`,
    );
  }
}
