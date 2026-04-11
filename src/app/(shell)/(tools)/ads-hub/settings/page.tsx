'use client';

import { PlatformConnections } from '@/components/ads-hub/platform-connections';
import { ClientManager } from '@/components/ads-hub/client-manager';

export default function AdsHubSettingsPage() {
  return (
    <div className="px-6 pb-8 space-y-8">
      <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
        הגדרות Ads Hub
      </h2>

      {/* Unified Platform Connections */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          חיבורי פלטפורמות
        </h3>
        <PlatformConnections />
      </section>

      {/* Client Management */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          ניהול לקוחות
        </h3>
        <ClientManager />
      </section>
    </div>
  );
}
