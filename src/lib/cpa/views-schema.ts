// Schema versioning for cpa_user_views payloads.
//
// The CPA dashboard has a single saved-view surface (no per-scope split), so
// the version is a flat constant rather than a Record. When the payload shape
// changes in a non-additive way (renamed key, removed key, value-type change),
// bump the constant AND add a step to `migrateCpaViewPayload` so old rows
// still load.
//
// Additive changes that ignore unknown keys do NOT require a version bump.

export const CPA_VIEWS_CURRENT_VERSION = 1;

/**
 * Migrate a saved-view payload from its persisted version to the current
 * version. v1 is current — bumps add migration steps here.
 *
 * Example for a hypothetical v2 (rename `clientIds` → `visibleClientIds`):
 *
 *   if (version < 2) {
 *     const p = (payload ?? {}) as Record<string, unknown>;
 *     payload = { ...p, visibleClientIds: p.clientIds ?? [] };
 *     delete (payload as Record<string, unknown>).clientIds;
 *     version = 2;
 *   }
 *
 * Each step should be idempotent and forward-only — never mutate the input.
 */
export function migrateCpaViewPayload(version: number, payload: unknown): unknown {
  void version;
  return payload;
}
