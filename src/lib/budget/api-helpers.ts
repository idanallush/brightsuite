import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import type { SessionData } from '@/types/auth';

/**
 * Require authentication for budget API routes.
 * Returns the session data or a 401 response.
 */
export async function requireBudgetAuth(): Promise<
  { session: SessionData; error?: never } | { session?: never; error: NextResponse }
> {
  const session = await getServerSession();
  if (!session.userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session: session as SessionData };
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
