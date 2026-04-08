'use client';

import { useAuth } from '@/hooks/use-auth';
import { Shield } from 'lucide-react';

export default function AdCheckerPage() {
  const { hasToolAccess } = useAuth();

  if (!hasToolAccess('ad-checker')) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="glass-card p-8 text-center">
          <Shield size={48} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            אין גישה
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            אין לך הרשאה לכלי הזה. פנה למנהל המערכת.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-80px)] -m-6">
      <iframe
        src="/tools/ad-checker/index.html"
        className="w-full h-full border-0"
        title="Ad Safe Zone Checker"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-popups"
      />
    </div>
  );
}
