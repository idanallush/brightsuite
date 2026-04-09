export type UserRole = 'admin' | 'manager' | 'viewer';

export type ToolSlug = 'ad-checker' | 'budget' | 'cpa' | 'ads' | 'writer' | 'ads-hub';

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  googleId?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface SessionData {
  userId: number;
  email: string;
  name: string;
  role: UserRole;
  tools: ToolSlug[];
  avatarUrl?: string;
  fbAccessToken?: string;
  fbTokenExpiry?: number;
  fbUserId?: string;
  fbUserName?: string;
  csrfState?: string;
}

export interface ToolPermission {
  id: number;
  userId: number;
  toolSlug: ToolSlug;
  grantedBy: number | null;
  createdAt: string;
}

export interface AuditEntry {
  id: number;
  userId: number | null;
  userEmail: string | null;
  userName: string | null;
  toolSlug: ToolSlug | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: string | null;
  createdAt: string;
}
