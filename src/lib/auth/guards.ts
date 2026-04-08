import { redirect } from 'next/navigation';
import { getServerSession } from './session';
import type { SessionData } from '@/types/auth';
import type { UserRole, ToolSlug } from '@/types/auth';

export async function requireAuth(): Promise<SessionData> {
  const session = await getServerSession();
  if (!session.userId) {
    redirect('/login');
  }
  return session as SessionData;
}

export async function requireRole(role: UserRole): Promise<SessionData> {
  const session = await requireAuth();
  const roleHierarchy: Record<UserRole, number> = { viewer: 0, manager: 1, admin: 2 };
  if (roleHierarchy[session.role] < roleHierarchy[role]) {
    redirect('/dashboard?error=forbidden');
  }
  return session;
}

export async function requireToolAccess(toolSlug: ToolSlug): Promise<SessionData> {
  const session = await requireAuth();
  if (session.role === 'admin') return session;
  if (!session.tools?.includes(toolSlug)) {
    redirect('/dashboard?error=no-access');
  }
  return session;
}
