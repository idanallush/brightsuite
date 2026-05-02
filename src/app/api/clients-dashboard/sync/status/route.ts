import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';
import { getTurso } from '@/lib/db/turso';

// GET /api/clients-dashboard/sync/status — sync log entries
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;

  const searchParams = request.nextUrl.searchParams;
  const limit = Number(searchParams.get('limit') || 50);
  const clientId = searchParams.get('clientId');

  const db = getTurso();

  const conditions: string[] = [];
  const args: (string | number)[] = [];

  if (clientId) {
    conditions.push('s.client_id = ?');
    args.push(clientId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  args.push(limit);

  const result = await db.execute({
    sql: `
      SELECT s.*, c.name as client_name
      FROM ah_sync_log s
      LEFT JOIN ah_clients c ON c.id = s.client_id
      ${whereClause}
      ORDER BY s.started_at DESC
      LIMIT ?
    `,
    args,
  });

  return NextResponse.json({ logs: result.rows });
}
