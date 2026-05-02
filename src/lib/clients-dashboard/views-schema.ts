// Schema versioning for cd_user_views payloads.
//
// Each Clients Dashboard scope (campaigns / creative / history / alerts / ...)
// owns its own opaque JSON payload shape. When a scope's payload shape changes
// in a non-additive way (renamed key, removed key, value-type change), bump the
// version below AND add a step to `migrateCdViewPayload` so old rows still
// load.
//
// Additive changes that ignore unknown keys do NOT require a version bump.
//
// Bump this when the saved-view payload shape for a scope changes.
export const CD_VIEWS_CURRENT_VERSION: Record<string, number> = {
  campaigns: 1,
  creative: 1,
  history: 1,
  alerts: 1,
};

/**
 * Returns the current payload version for a scope. Unknown scopes default to 1
 * so newly-introduced surfaces don't have to ship a code change before they
 * can persist views.
 */
export function getCdCurrentVersion(scope: string): number {
  return CD_VIEWS_CURRENT_VERSION[scope] ?? 1;
}

/**
 * Migrate a saved-view payload from its persisted version to the current
 * version for the given scope. v1 is current — bumps add migration steps here.
 *
 * Example for a hypothetical v2 of `campaigns` (rename `hidden` → `hiddenIds`):
 *
 *   if (scope === 'campaigns' && version < 2) {
 *     const p = (payload ?? {}) as Record<string, unknown>;
 *     payload = { ...p, hiddenIds: p.hidden ?? [] };
 *     delete (payload as Record<string, unknown>).hidden;
 *     version = 2;
 *   }
 *
 * Each step should be idempotent and forward-only — never mutate the input.
 */
export function migrateCdViewPayload(
  scope: string,
  version: number,
  payload: unknown,
): unknown {
  // Bump versions add migration steps here. v1 = current.
  void scope;
  void version;
  return payload;
}
