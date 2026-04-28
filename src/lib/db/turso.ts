import { createClient, type Client } from '@libsql/client';
import { join } from 'path';

let _client: Client | null = null;
let _initPromise: Promise<void> | null = null;
// Bump this whenever init.ts has a new migration that must run on next warm
// invocation. Module reload on new deploy will not reset _initPromise, so
// checking this version lets us re-run init when code has changed.
const INIT_VERSION = 5;
let _initVersion = 0;

export function getTurso(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (url) {
      _client = createClient({
        url,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
    } else {
      const dbPath = join(process.cwd(), 'data', 'brightsuite.db');
      _client = createClient({ url: `file:${dbPath}` });
    }
  }
  return _client;
}

export async function ensureDatabase(): Promise<void> {
  if (_initVersion === INIT_VERSION && _initPromise) return _initPromise;
  _initPromise = (async () => {
    const { initDatabase } = await import('./init');
    await initDatabase();
    _initVersion = INIT_VERSION;
  })();
  return _initPromise;
}
