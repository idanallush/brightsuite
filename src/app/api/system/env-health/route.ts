import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth/require-auth-api';

// GET /api/system/env-health
// Admin-only. Returns boolean presence (NEVER values) for the critical
// environment variables that gate functionality across the app.
// Drives the env health card in /settings/system.
export async function GET() {
  const auth = await requireApiAuth();
  if (auth.error) return auth.error;
  if (auth.session.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const checks: Array<{
    key: string;
    label: string;
    set: boolean;
    severity: 'critical' | 'important' | 'optional';
    purpose: string;
  }> = [
    {
      key: 'CRON_SECRET',
      label: 'CRON_SECRET',
      set: hasValue(process.env.CRON_SECRET),
      severity: 'critical',
      purpose: 'מאמת את הריצות של Vercel Cron (ad-sync, cd-alerts). חסר → 401 על כל cron.',
    },
    {
      key: 'TURSO_DATABASE_URL',
      label: 'TURSO_DATABASE_URL',
      set: hasValue(process.env.TURSO_DATABASE_URL),
      severity: 'critical',
      purpose: 'בסיס הנתונים הראשי. חסר → אפליקציה לא עולה.',
    },
    {
      key: 'TURSO_AUTH_TOKEN',
      label: 'TURSO_AUTH_TOKEN',
      set: hasValue(process.env.TURSO_AUTH_TOKEN),
      severity: 'critical',
      purpose: 'אימות מול Turso. חסר → DB מסרב חיבור.',
    },
    {
      key: 'SECRET_COOKIE_PASSWORD',
      label: 'SECRET_COOKIE_PASSWORD',
      set: hasValue(process.env.SECRET_COOKIE_PASSWORD, 32),
      severity: 'critical',
      purpose: 'מצפין את session cookies (iron-session). חייב 32+ תווים.',
    },
    {
      key: 'GOOGLE_CLIENT_ID',
      label: 'GOOGLE_CLIENT_ID',
      set: hasValue(process.env.GOOGLE_CLIENT_ID),
      severity: 'critical',
      purpose: 'OAuth כניסה. חסר → לא ניתן להתחבר.',
    },
    {
      key: 'GOOGLE_CLIENT_SECRET',
      label: 'GOOGLE_CLIENT_SECRET',
      set: hasValue(process.env.GOOGLE_CLIENT_SECRET),
      severity: 'critical',
      purpose: 'משלים את OAuth flow.',
    },
    {
      key: 'ANTHROPIC_API_KEY',
      label: 'ANTHROPIC_API_KEY',
      set: hasValue(process.env.ANTHROPIC_API_KEY),
      severity: 'important',
      purpose: 'Writer (MultiWrite) ו-AI features. חסר → טול לא עובד.',
    },
    {
      key: 'FB_APP_ID',
      label: 'FB_APP_ID',
      set: hasValue(process.env.FB_APP_ID),
      severity: 'important',
      purpose: 'Meta Graph API — Ads Hub, Clients Dashboard creative sync.',
    },
    {
      key: 'FB_APP_SECRET',
      label: 'FB_APP_SECRET',
      set: hasValue(process.env.FB_APP_SECRET),
      severity: 'important',
      purpose: 'משלים את Meta Graph API.',
    },
    {
      key: 'GOOGLE_ADS_DEVELOPER_TOKEN',
      label: 'GOOGLE_ADS_DEVELOPER_TOKEN',
      set: hasValue(process.env.GOOGLE_ADS_DEVELOPER_TOKEN),
      severity: 'important',
      purpose: 'Google Ads API. חסר → סנכרון Google Ads נכשל.',
    },
    {
      key: 'BLOB_READ_WRITE_TOKEN',
      label: 'BLOB_READ_WRITE_TOKEN',
      set: hasValue(process.env.BLOB_READ_WRITE_TOKEN),
      severity: 'optional',
      purpose: 'Vercel Blob — אחסון קבצים (PDF exports, uploads).',
    },
  ];

  const summary = {
    total: checks.length,
    set: checks.filter((c) => c.set).length,
    missingCritical: checks.filter((c) => !c.set && c.severity === 'critical').length,
    missingImportant: checks.filter((c) => !c.set && c.severity === 'important').length,
    missingOptional: checks.filter((c) => !c.set && c.severity === 'optional').length,
  };

  return NextResponse.json({ checks, summary, checkedAt: new Date().toISOString() });
}

function hasValue(value: string | undefined, minLength = 1): boolean {
  return typeof value === 'string' && value.length >= minLength;
}
