import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { ensureDatabase, getTurso } from '@/lib/db/turso';
import type { SessionData } from '@/types/auth';

export async function GET() {
  await ensureDatabase();
  const session = await getServerSession();

  if (!session.userId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  // Refresh role from DB if the cached session role is not admin — lets a
  // promotion (e.g. the bootstrap migration) take effect without a re-login.
  if (session.role !== 'admin') {
    const db = getTurso();
    const result = await db.execute({
      sql: 'SELECT role FROM bs_users WHERE id = ? AND is_active = 1',
      args: [session.userId],
    });
    const dbRole = result.rows[0]?.role as SessionData['role'] | undefined;
    if (dbRole && dbRole !== session.role) {
      session.role = dbRole;
      await session.save();
    }
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      role: session.role,
      avatarUrl: session.avatarUrl || null,
    },
    tools: session.tools || [],
  });
}
