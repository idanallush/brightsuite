import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import type { SessionData } from '@/types/auth';

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'brightsuite-session',
  ttl: 604800,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  },
};

export async function getServerSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export { sessionOptions };
export type { SessionData };
