import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth/session';
import { getTurso } from '@/lib/db/turso';
import { hashPassword } from '@/lib/auth/password';
import { logAudit } from '@/lib/audit';
import type { ToolSlug } from '@/types/auth';

export async function GET() {
  const session = await getServerSession();

  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const db = getTurso();

  const usersResult = await db.execute(
    'SELECT id, name, email, role, is_active, created_at FROM bs_users ORDER BY created_at DESC',
  );

  const users = await Promise.all(
    usersResult.rows.map(async (row) => {
      const permsResult = await db.execute({
        sql: 'SELECT tool_slug FROM bs_tool_permissions WHERE user_id = ?',
        args: [row.id as number],
      });

      return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        is_active: row.is_active,
        created_at: row.created_at,
        tools: permsResult.rows.map((p) => p.tool_slug as ToolSlug),
      };
    }),
  );

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session.userId || session.role !== 'admin') {
    return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });
  }

  const db = getTurso();

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'create') {
      const { name, email, password, role, tools } = body as {
        name: string;
        email: string;
        password: string;
        role: string;
        tools: ToolSlug[];
      };

      if (!name || !email || !password) {
        return NextResponse.json(
          { error: 'שדות חובה חסרים' },
          { status: 400 },
        );
      }

      // Check duplicate email
      const existing = await db.execute({
        sql: 'SELECT id FROM bs_users WHERE email = ?',
        args: [email],
      });

      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: 'אימייל כבר קיים במערכת' },
          { status: 400 },
        );
      }

      const passwordHash = await hashPassword(password);

      const insertResult = await db.execute({
        sql: `INSERT INTO bs_users (name, email, password_hash, role, is_active, created_at)
              VALUES (?, ?, ?, ?, 1, datetime('now'))`,
        args: [name, email, passwordHash, role || 'viewer'],
      });

      const newUserId = Number(insertResult.lastInsertRowid);

      // Insert tool permissions
      if (tools && tools.length > 0) {
        for (const toolSlug of tools) {
          await db.execute({
            sql: `INSERT INTO bs_tool_permissions (user_id, tool_slug, granted_by, created_at)
                  VALUES (?, ?, ?, datetime('now'))`,
            args: [newUserId, toolSlug, session.userId],
          });
        }
      }

      await logAudit({
        userId: session.userId,
        userEmail: session.email,
        userName: session.name,
        action: 'create_user',
        entityType: 'user',
        entityId: String(newUserId),
        details: { name, email, role, tools },
      });

      return NextResponse.json({ success: true, userId: newUserId });
    }

    if (action === 'update') {
      const { userId, role, tools } = body as {
        userId: number;
        role: string;
        tools: ToolSlug[];
      };

      if (!userId) {
        return NextResponse.json(
          { error: 'מזהה משתמש חסר' },
          { status: 400 },
        );
      }

      await db.execute({
        sql: 'UPDATE bs_users SET role = ? WHERE id = ?',
        args: [role, userId],
      });

      // Replace tool permissions
      await db.execute({
        sql: 'DELETE FROM bs_tool_permissions WHERE user_id = ?',
        args: [userId],
      });

      if (tools && tools.length > 0) {
        for (const toolSlug of tools) {
          await db.execute({
            sql: `INSERT INTO bs_tool_permissions (user_id, tool_slug, granted_by, created_at)
                  VALUES (?, ?, ?, datetime('now'))`,
            args: [userId, toolSlug, session.userId],
          });
        }
      }

      await logAudit({
        userId: session.userId,
        userEmail: session.email,
        userName: session.name,
        action: 'update_user',
        entityType: 'user',
        entityId: String(userId),
        details: { role, tools },
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'deactivate') {
      const { userId } = body as { userId: number };

      if (!userId) {
        return NextResponse.json(
          { error: 'מזהה משתמש חסר' },
          { status: 400 },
        );
      }

      // Prevent self-deactivation
      if (userId === session.userId) {
        return NextResponse.json(
          { error: 'לא ניתן להשבית את עצמך' },
          { status: 400 },
        );
      }

      await db.execute({
        sql: 'UPDATE bs_users SET is_active = 0 WHERE id = ?',
        args: [userId],
      });

      await logAudit({
        userId: session.userId,
        userEmail: session.email,
        userName: session.name,
        action: 'deactivate_user',
        entityType: 'user',
        entityId: String(userId),
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'פעולה לא מוכרת' }, { status: 400 });
  } catch (error) {
    console.error('[Users API] Error:', error);
    return NextResponse.json({ error: 'שגיאת שרת' }, { status: 500 });
  }
}
