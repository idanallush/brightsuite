// Helpers for diffing ah_clients rows and emitting cd_client_changes audit
// rows. Used by every PATCH/PUT/DELETE handler under
// /api/clients-dashboard/clients/[id] so the audit trail is consistent
// regardless of which fields the caller chose to update.

import type { InValue } from '@libsql/client';

// Editable fields surfaced in the dashboard. These are the only fields that
// produce cd_client_changes rows — sync-driven columns (created_at, updated_at)
// are excluded.
export const AUDITABLE_CLIENT_FIELDS = [
  'name',
  'metric_type',
  'meta_account_id',
  'google_customer_id',
  'google_mcc_id',
  'ga4_property_id',
  'currency',
  'is_active',
] as const;

export type AuditableClientField = (typeof AUDITABLE_CLIENT_FIELDS)[number];

export interface ClientFieldDiff {
  field: AuditableClientField;
  oldValue: string | null;
  newValue: string | null;
}

export type ClientChangeUserId = number | null | undefined;

// Convert a SQLite cell to a stable string for the audit log. is_active is
// stored as INTEGER (0/1) but logged as '0' / '1' strings; nulls stay null.
function normalize(field: AuditableClientField, value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (field === 'is_active') {
    return Number(value) === 1 ? '1' : '0';
  }
  return String(value);
}

// Diff a current row (`before`) against the proposed update (`proposed`).
// Only fields present in `proposed` are diffed — callers pass only the
// fields they're attempting to write so a PATCH that only touches
// metric_type doesn't accidentally log the rest of the row.
export function diffClientFields(
  before: Record<string, unknown>,
  proposed: Record<string, unknown>,
): ClientFieldDiff[] {
  const diffs: ClientFieldDiff[] = [];
  for (const field of AUDITABLE_CLIENT_FIELDS) {
    if (!(field in proposed)) continue;
    const oldValue = normalize(field, before[field]);
    const newValue = normalize(field, proposed[field]);
    if (oldValue === newValue) continue;
    diffs.push({ field, oldValue, newValue });
  }
  return diffs;
}

interface BuildOptions {
  clientId: number;
  diffs: ClientFieldDiff[];
  userId: ClientChangeUserId;
  source: 'user' | 'system';
  note?: string | null;
}

// Build libsql batch statements that insert one cd_client_changes row per
// diff. Returned in batch-statement form so callers can compose them with
// the UPDATE statement in the same db.batch — if the audit insert fails the
// whole transaction (UPDATE included) rolls back.
export function buildClientChangeStatements({
  clientId,
  diffs,
  userId,
  source,
  note = null,
}: BuildOptions): Array<{ sql: string; args: InValue[] }> {
  return diffs.map((d) => ({
    sql: `INSERT INTO cd_client_changes
          (client_id, field, old_value, new_value, user_id, source, note)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [
      clientId,
      d.field,
      d.oldValue,
      d.newValue,
      userId ?? null,
      source,
      note,
    ],
  }));
}
