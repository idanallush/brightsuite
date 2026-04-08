const API_BASE = '/api/writer';

interface RequestOptions extends RequestInit {
  signal?: AbortSignal;
}

async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('TIMEOUT');
      }
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        throw new Error('NETWORK_ERROR');
      }
    }
    throw err;
  }
}

// ─── Types ───

export interface ClientData {
  id?: number;
  name: string;
  initial: string;
  color: string;
  about: string;
  website: string;
  logo: string;
  winning_ads: string;
  avoid_notes: string;
}

export interface GenerateRequest {
  clientId?: number;
  url?: string;
  fetchedContent?: string;
  additionalNotes?: string;
  language: string;
  platforms: string[];
  toneOfVoice?: string;
}

export interface RegenerateRequest {
  clientId?: number;
  url?: string;
  fetchedContent?: string;
  additionalNotes?: string;
  language?: string;
  toneOfVoice?: string;
  platform: string;
  section: string;
  index: number;
  currentText: string;
  keywords?: string[];
}

export interface BatchRegenerateRequest {
  clientId?: number;
  url?: string;
  fetchedContent?: string;
  additionalNotes?: string;
  language?: string;
  toneOfVoice?: string;
  keywords: string[];
  sections: Record<string, unknown[]>;
}

export interface CopyArchiveItem {
  client_id?: number | null;
  text: string;
  platform: string;
  notes: string;
  is_global: boolean;
}

// ─── Clients ───

export const getClients = () => request<ClientData[]>('/clients');
export const getClient = (id: number) => request<ClientData>(`/clients/${id}`);
export const createClient = (data: Partial<ClientData>) =>
  request<ClientData>('/clients', { method: 'POST', body: JSON.stringify(data) });
export const updateClient = (id: number, data: Partial<ClientData>) =>
  request<ClientData>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteClient = (id: number) =>
  request(`/clients/${id}`, { method: 'DELETE' });

// ─── History ───

export const getHistory = (clientId?: number) =>
  request(`/history${clientId ? `?client_id=${clientId}` : ''}`);
export const getGeneration = (id: number) => request(`/history/${id}`);
export const deleteGeneration = (id: number) =>
  request(`/history/${id}`, { method: 'DELETE' });
export const deleteAllHistory = () =>
  request('/history', { method: 'DELETE' });

// ─── Generate — with 90s timeout ───

export const generateCopy = (data: GenerateRequest) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);
  return request('/generate', {
    method: 'POST',
    body: JSON.stringify(data),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
};

// ─── Regenerate a single block — with 60s timeout ───

export const regenerateBlock = (data: RegenerateRequest) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  return request('/generate/regenerate', {
    method: 'POST',
    body: JSON.stringify(data),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
};

// ─── Batch regenerate all Google sections with keywords — with 90s timeout ───

export const regenerateBatch = (data: BatchRegenerateRequest) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);
  return request('/generate/regenerate-batch', {
    method: 'POST',
    body: JSON.stringify(data),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
};

// ─── Copy Archive ───

export const getCopyArchive = (clientId?: number) =>
  request(`/copy-archive${clientId ? `?client_id=${clientId}` : ''}`);
export const addCopyArchive = (data: CopyArchiveItem) =>
  request('/copy-archive', { method: 'POST', body: JSON.stringify(data) });
export const deleteCopyArchive = (id: number) =>
  request(`/copy-archive/${id}`, { method: 'DELETE' });

// ─── URL fetching ───

export const fetchUrl = (url: string) =>
  request('/fetch-url', { method: 'POST', body: JSON.stringify({ url }) });
