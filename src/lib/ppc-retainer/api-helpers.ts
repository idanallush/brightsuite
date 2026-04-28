import { NextResponse } from 'next/server';
import { ensureDatabase } from '@/lib/db/turso';
import { getServerSession } from '@/lib/auth/session';
import type { SessionData } from '@/types/auth';

export async function requirePpcAuth(): Promise<
  { session: SessionData; error?: never } | { session?: never; error: NextResponse }
> {
  await ensureDatabase();
  const session = await getServerSession();
  if (!session.userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  return { session: session as SessionData };
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// ----- Row mappers -----
export type ClientRow = {
  id: number;
  name: string;
  retainer: number;
  manager: string;
  platforms: string[];
  meta: number;
  google: number;
  status: 'active' | 'archived';
};

export type TeamRow = {
  id: number;
  name: string;
  revenue: number;
  employerCost: number;
};

export type ExpenseRow = {
  id: number;
  name: string;
  amount: number;
  note: string;
  category: string;
};

export type ForecastRow = {
  newMonthly: number;
  churnMonthly: number;
  raisePct: number;
};

type Row = Record<string, unknown>;

const num = (v: unknown, fallback = 0) => {
  if (v == null) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};

const str = (v: unknown, fallback = '') => (v == null ? fallback : String(v));

export function mapClient(row: Row): ClientRow {
  let platforms: string[] = [];
  try {
    const raw = row.platforms;
    platforms = Array.isArray(raw) ? (raw as string[]) : raw ? JSON.parse(String(raw)) : [];
    if (!Array.isArray(platforms)) platforms = [];
  } catch {
    platforms = [];
  }
  const status = row.status === 'archived' ? 'archived' : 'active';
  return {
    id: Number(row.id),
    name: str(row.name),
    retainer: num(row.retainer),
    manager: str(row.manager),
    platforms,
    meta: Math.trunc(num(row.meta)),
    google: Math.trunc(num(row.google)),
    status,
  };
}

export function mapTeam(row: Row): TeamRow {
  return {
    id: Number(row.id),
    name: str(row.name),
    revenue: num(row.revenue),
    employerCost: num(row.employer_cost),
  };
}

export function mapExpense(row: Row): ExpenseRow {
  return {
    id: Number(row.id),
    name: str(row.name),
    amount: num(row.amount),
    note: str(row.note),
    category: str(row.category) || 'Tools',
  };
}

export function mapForecast(row: Row | undefined | null): ForecastRow {
  if (!row) return { newMonthly: 0, churnMonthly: 0, raisePct: 0 };
  return {
    newMonthly: num(row.new_monthly),
    churnMonthly: num(row.churn_monthly),
    raisePct: num(row.raise_pct),
  };
}
