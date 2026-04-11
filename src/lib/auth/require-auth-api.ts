import { getServerSession } from '@/lib/auth/session';
import { ensureDatabase, getTurso } from '@/lib/db/turso';
import { NextResponse } from 'next/server';
import type { SessionData } from '@/types/auth';

export async function requireApiAuth(): Promise<
  { session: SessionData; error?: never } | { session?: never; error: NextResponse }
> {
  await ensureDatabase();
  const session = await getServerSession();
  if (!session.userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  // Refresh role from DB if the cached session role is not admin — allows
  // role promotions to take effect without forcing a re-login.
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

  return { session: session as SessionData };
}
