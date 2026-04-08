import { createClient, type Client } from '@libsql/client';
import { join } from 'path';

let _client: Client | null = null;

export function getTurso(): Client {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (url) {
      // Production: Turso remote DB
      _client = createClient({
        url,
        authToken: process.env.TURSO_AUTH_TOKEN,
      });
    } else {
      // Development: local SQLite file
      const dbPath = join(process.cwd(), 'data', 'brightsuite.db');
      _client = createClient({ url: `file:${dbPath}` });
    }
  }
  return _client;
}
