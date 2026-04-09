import { getServerSession } from '@/lib/auth/session';
import { NextResponse } from 'next/server';
import type { SessionData } from '@/types/auth';

/**
 * Require authentication for API routes.
 * Returns the session data or a 401 response.
 */
export async function requireApiAuth(): Promise<
  { session: SessionData; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await getServerSession();
  if (!session.userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session: session as SessionData };
}
