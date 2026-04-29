import { NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { initBudgetFlowTables } from './schema-init';
import type { SessionData } from '@/types/auth';

// Memoize per-process so we run init once on cold start, not per-request.
// On failure we reset so the next request retries instead of caching the error.
let _bfSchemaPromise: Promise<void> | null = null;
export function ensureBudgetSchema(): Promise<void> {
  if (!_bfSchemaPromise) {
    _bfSchemaPromise = initBudgetFlowTables().catch((err) => {
      _bfSchemaPromise = null;
      throw err;
    });
  }
  return _bfSchemaPromise;
}

/**
 * Require authentication for budget API routes.
 * Returns the session data or a 401 response.
 */
export async function requireBudgetAuth(): Promise<
  { session: SessionData; error?: never } | { session?: never; error: NextResponse }
> {
  await ensureBudgetSchema();
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
