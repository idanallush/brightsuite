import { getTurso } from './db/turso';
import type { ToolSlug } from '@/types/auth';

interface AuditParams {
  userId?: number | null;
  userEmail?: string | null;
  userName?: string | null;
  toolSlug?: ToolSlug | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await getTurso().execute({
      sql: `INSERT INTO bs_audit_log (user_id, user_email, user_name, tool_slug, action, entity_type, entity_id, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      args: [
        params.userId ?? null,
        params.userEmail ?? null,
        params.userName ?? null,
        params.toolSlug ?? null,
        params.action,
        params.entityType ?? null,
        params.entityId ?? null,
        params.details ? JSON.stringify(params.details) : null,
      ],
    });
  } catch (error) {
    console.error('[Audit] Failed to log:', error);
  }
}
