import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getTurso } from '@/lib/db/turso';

const DEFAULT_LIMIT = 20;

export async function GET(request: NextRequest) {
  const session = await getServerSession();

  if (!session.userId) {
    return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const tool = searchParams.get('tool') || '';
  const days = parseInt(searchParams.get('days') || '30', 10);
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = DEFAULT_LIMIT;
  const offset = (page - 1) * limit;

  const db = getTurso();
  const isAdmin = session.role === 'admin';

  // Build WHERE clauses
  const conditions: string[] = [];
  const args: (string | number)[] = [];

  // Non-admins can only see their own entries
  if (!isAdmin) {
    conditions.push('user_id = ?');
    args.push(session.userId);
  }

  if (tool) {
    conditions.push('tool_slug = ?');
    args.push(tool);
  }

  if (days > 0) {
    conditions.push(`created_at >= datetime('now', '-${days} days')`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  try {
    // Get total count
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as cnt FROM bs_audit_log ${whereClause}`,
      args,
    });
    const total = Number(countResult.rows[0]?.cnt ?? 0);

    // Get entries
    const entriesResult = await db.execute({
      sql: `SELECT id, user_id, user_email, user_name, tool_slug, action, entity_type, entity_id, details, created_at
            FROM bs_audit_log ${whereClause}
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    });

    const entries = entriesResult.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      userName: row.user_name,
      toolSlug: row.tool_slug,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      details: row.details,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ entries, total });
  } catch (error) {
    console.error('[Audit API] Error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
