import { NextRequest, NextResponse } from 'next/server';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { getTurso } from '@/lib/db/turso';
import { verifyPassword } from '@/lib/auth/password';
import { sessionOptions } from '@/lib/auth/session';
import { logAudit } from '@/lib/audit';
import type { SessionData } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'נדרש אימייל וסיסמה' }, { status: 400 });
    }

    const result = await getTurso().execute({
      sql: 'SELECT * FROM bs_users WHERE email = ? AND is_active = 1',
      args: [email],
    });

    const user = result.rows[0];
    if (!user) {
      return NextResponse.json({ error: 'אימייל או סיסמה שגויים' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash as string);
    if (!valid) {
      return NextResponse.json({ error: 'אימייל או סיסמה שגויים' }, { status: 401 });
    }

    // Fetch tool permissions
    const permsResult = await getTurso().execute({
      sql: 'SELECT tool_slug FROM bs_tool_permissions WHERE user_id = ?',
      args: [user.id as number],
    });
    const tools = permsResult.rows.map(r => r.tool_slug as string);

    // Set session
    const cookieStore = await cookies();
    const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
    session.userId = user.id as number;
    session.email = user.email as string;
    session.name = user.name as string;
    session.role = user.role as SessionData['role'];
    session.tools = tools as SessionData['tools'];
    await session.save();

    await logAudit({
      userId: user.id as number,
      userEmail: user.email as string,
      userName: user.name as string,
      action: 'login',
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      tools,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
