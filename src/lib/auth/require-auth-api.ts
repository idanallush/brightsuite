import { getServerSession } from '@/lib/auth/session';
import { ensureDatabase } from '@/lib/db/turso';
import { NextResponse } from 'next/server';
import type { SessionData } from '@/types/auth';

/**
 * Require authentication for API routes.
 * Returns the session data or a 401 response.
 * Also ensures database tables exist on first call.
 */
export async function requireApiAuth(): Promise<
  { session: SessionData; error?: never } | { session?: never; error: NextResponse }
> {
  await ensureDatabase();
  const session = await getServerSession();
  if (!session.userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session: session as SessionData };
}
