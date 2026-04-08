import type { FBPaginatedResponse, FBBatchRequest, FBBatchResponse, FBErrorResponse } from "./types";

const FB_API_VERSION = process.env.FB_API_VERSION || "v25.0";
const FB_BASE_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

export class FacebookApiError extends Error {
  code: number;
  subcode?: number;
  constructor(message: string, code: number, subcode?: number) {
    super(message);
    this.name = "FacebookApiError";
    this.code = code;
    this.subcode = subcode;
  }
  get isTokenExpired(): boolean { return this.code === 190; }
  get isRateLimited(): boolean { return [4, 17, 32, 613].includes(this.code); }
}

async function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export async function fbFetch<T>(path: string, accessToken: string, options?: { retries?: number }): Promise<T> {
  const retries = options?.retries ?? 3;
  const separator = path.includes("?") ? "&" : "?";
  const url = path.startsWith("http")
    ? `${path}${separator}access_token=${accessToken}`
    : `${FB_BASE_URL}${path}${separator}access_token=${accessToken}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res.json();

    const errorBody = await res.json().catch(() => null) as FBErrorResponse | null;
    const fbError = errorBody?.error;
    if (fbError) {
      const apiError = new FacebookApiError(fbError.message, fbError.code, fbError.error_subcode);
      if (apiError.isTokenExpired) throw apiError;
      if (apiError.isRateLimited && attempt < retries) {
        await delay(Math.pow(2, attempt) * 1000 + Math.random() * 1000);
        continue;
      }
      throw apiError;
    }
    if (attempt < retries && res.status >= 500) {
      await delay(Math.pow(2, attempt) * 1000);
      continue;
    }
    throw new Error(`Facebook API error: ${res.status} ${res.statusText}`);
  }
  throw new Error("Max retries exceeded");
}

export async function fbFetchAll<T>(path: string, accessToken: string, maxPages = 10, delayMs = 0): Promise<T[]> {
  const allData: T[] = [];
  let currentPath = path;
  let pageCount = 0;
  while (currentPath && pageCount < maxPages) {
    if (pageCount > 0 && delayMs > 0) await delay(delayMs);
    const response = await fbFetch<FBPaginatedResponse<T>>(currentPath, accessToken);
    allData.push(...response.data);
    currentPath = response.paging?.next || "";
    if (!currentPath) break;
    pageCount++;
  }
  return allData;
}

export async function fbBatch(requests: FBBatchRequest[], accessToken: string): Promise<FBBatchResponse[]> {
  const results: FBBatchResponse[] = [];
  for (let i = 0; i < requests.length; i += 50) {
    const chunk = requests.slice(i, i + 50);
    const formData = new URLSearchParams();
    formData.append("access_token", accessToken);
    formData.append("batch", JSON.stringify(chunk));
    const res = await fetch(`${FB_BASE_URL}/`, { method: "POST", body: formData });
    if (!res.ok) {
      const error = await res.json().catch(() => null);
      throw new Error(`Batch failed: ${error?.error?.message || res.statusText}`);
    }
    results.push(...(await res.json()));
  }
  return results;
}
