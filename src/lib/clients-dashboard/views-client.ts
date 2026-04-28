'use client';

// Client-side helpers for the Clients Dashboard "saved views" feature.
// Other tabs/agents import from here to integrate the cross-cutting view picker.
//
// Convention for `scope`: a stable, kebab-case string identifying the surface,
// e.g. 'clients-list', 'campaigns', 'creative', 'history', 'alerts'. The Views
// tab discovers scopes dynamically from the API, so any string works — but stay
// consistent across the app so users see one row per surface.

import useSWR, { mutate } from 'swr';
import type { UserViewRecord } from './types';

const VIEWS_LIST_KEY = '/api/clients-dashboard/views';

type ListResponse<T = unknown> = { views: UserViewRecord<T>[] };
type SingleResponse<T = unknown> = { view: UserViewRecord<T> };

async function jsonFetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return res.json();
}

/**
 * SWR-backed list of the current user's saved views for a given scope.
 * Pass an empty string to list across all scopes (used by the Views tab).
 *
 * @example
 * const { views, isLoading, refresh } = useViews<CampaignsFilters>('campaigns');
 */
export function useViews<T = unknown>(scope: string): {
  views: UserViewRecord<T>[];
  isLoading: boolean;
  error: unknown;
  refresh: () => Promise<unknown>;
} {
  const url = scope
    ? `/api/clients-dashboard/views?scope=${encodeURIComponent(scope)}`
    : VIEWS_LIST_KEY;
  const { data, error, isLoading, mutate: localMutate } = useSWR<ListResponse<T>>(
    url,
    jsonFetcher,
  );
  return {
    views: data?.views ?? [],
    isLoading,
    error,
    refresh: () => localMutate(),
  };
}

/**
 * Convenience: returns the default view's payload for the scope, or null.
 * Other tabs can call this on mount to seed their initial filter state.
 *
 * @example
 * const defaults = useDefaultView<CampaignsFilters>('campaigns');
 * useEffect(() => { if (defaults) setFilters(defaults); }, [defaults]);
 */
export function useDefaultView<T = unknown>(scope: string): T | null {
  const { views } = useViews<T>(scope);
  const def = views.find((v) => v.isDefault);
  return def ? (def.payload as T) : null;
}

/**
 * Save a brand-new view for the current user. If `options.isDefault` is true,
 * any other default in the same scope is cleared atomically.
 * Returns the persisted record. Throws on validation/uniqueness errors.
 *
 * @example
 * await saveView('campaigns', 'My pinned filters', filters, { isDefault: true });
 */
export async function saveView<T = unknown>(
  scope: string,
  name: string,
  payload: T,
  options?: { isDefault?: boolean },
): Promise<UserViewRecord<T>> {
  const res = await fetch('/api/clients-dashboard/views', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope, name, payload, isDefault: !!options?.isDefault }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`);
  }
  const data = (await res.json()) as SingleResponse<T>;
  // Invalidate both the scoped and global lists so any open Views tab refreshes.
  await Promise.all([
    mutate(`/api/clients-dashboard/views?scope=${encodeURIComponent(scope)}`),
    mutate(VIEWS_LIST_KEY),
  ]);
  return data.view;
}

/**
 * Patch an existing view. Any of `name`, `payload`, `isDefault` may be omitted.
 * If `isDefault: true` is sent, other defaults in the same scope are cleared.
 *
 * @example
 * await updateView(view.id, { name: 'Renamed view' });
 */
export async function updateView<T = unknown>(
  id: number,
  patch: { name?: string; payload?: T; isDefault?: boolean },
): Promise<UserViewRecord<T>> {
  const res = await fetch(`/api/clients-dashboard/views/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`);
  }
  const data = (await res.json()) as SingleResponse<T>;
  await Promise.all([
    mutate(`/api/clients-dashboard/views?scope=${encodeURIComponent(data.view.scope)}`),
    mutate(VIEWS_LIST_KEY),
  ]);
  return data.view;
}

/**
 * Delete a saved view by id. The hook revalidates the matching scope list and
 * the global list so any open ViewBar refreshes.
 *
 * @example
 * await deleteView(view.id);
 */
export async function deleteView(id: number, scope?: string): Promise<void> {
  const res = await fetch(`/api/clients-dashboard/views/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`);
  }
  await Promise.all([
    scope
      ? mutate(`/api/clients-dashboard/views?scope=${encodeURIComponent(scope)}`)
      : Promise.resolve(),
    mutate(VIEWS_LIST_KEY),
  ]);
}

/**
 * Convenience: mark a view as the scope default. Pass `scope` so the SWR cache
 * entry for the scoped list is invalidated alongside the global list.
 *
 * @example
 * await setDefault(view.id, 'campaigns');
 */
export async function setDefault(id: number, scope: string): Promise<UserViewRecord> {
  const res = await fetch(`/api/clients-dashboard/views/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isDefault: true }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`);
  }
  const data = (await res.json()) as SingleResponse;
  await Promise.all([
    mutate(`/api/clients-dashboard/views?scope=${encodeURIComponent(scope)}`),
    mutate(VIEWS_LIST_KEY),
  ]);
  return data.view;
}
