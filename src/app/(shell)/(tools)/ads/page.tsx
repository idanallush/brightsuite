'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { LayoutGrid, SlidersHorizontal, Download, Loader2 } from 'lucide-react';
import { LoginButton } from '@/components/ads/auth/login-button';

export default function AdsPage() {
  const { loading, hasToolAccess } = useAuth();
  const router = useRouter();
  const [fbChecked, setFbChecked] = useState(false);
  const [fbConnected, setFbConnected] = useState(false);

  const hasAccess = !loading && hasToolAccess('ads');

  // Check FB connection — if connected, redirect straight to dashboard
  useEffect(() => {
    if (!hasAccess || fbChecked) return;

    fetch('/api/ads/auth/status')
      .then((r) => r.json())
      .then((data) => {
        if (data.connected) {
          setFbConnected(true);
          router.replace('/ads/dashboard');
        } else {
          setFbChecked(true);
        }
      })
      .catch(() => setFbChecked(true));
  }, [hasAccess, fbChecked, router]);

  useEffect(() => {
    if (!loading && !hasAccess) {
      router.replace('/dashboard');
    }
  }, [loading, hasAccess, router]);

  if (loading || (!fbChecked && !fbConnected)) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--accent-fg)' }} />
      </div>
    );
  }

  if (!hasAccess || fbConnected) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="max-w-2xl text-center space-y-10">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            דיווח מודעות פייסבוק לסוכנויות
          </h1>
          <p className="text-lg text-muted-foreground">
            חבר את חשבונות הפרסום שלך, צפה בכל הקריאייטיבים הפעילים עם מדדי
            ביצועים, וייצא דוחות PDF מקצועיים — הכל במקום אחד.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex flex-col items-center gap-2 p-5 rounded-xl bg-card border">
            <LayoutGrid className="h-8 w-8 text-primary/70" aria-hidden="true" />
            <span className="font-semibold">ספריית מודעות</span>
            <span className="text-muted-foreground text-xs">
              כל הקריאייטיבים מכל החשבונות בתצוגה אחת
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 p-5 rounded-xl bg-card border">
            <SlidersHorizontal className="h-8 w-8 text-primary/70" aria-hidden="true" />
            <span className="font-semibold">מדדים גמישים</span>
            <span className="text-muted-foreground text-xs">
              לידים, איקומרס, אנגייג׳מנט — בחר מה חשוב לך
            </span>
          </div>
          <div className="flex flex-col items-center gap-2 p-5 rounded-xl bg-card border">
            <Download className="h-8 w-8 text-primary/70" aria-hidden="true" />
            <span className="font-semibold">ייצוא PDF</span>
            <span className="text-muted-foreground text-xs">
              דוחות מוכנים ללקוח בלחיצה אחת
            </span>
          </div>
        </div>

        <div className="pt-2">
          <LoginButton />
        </div>

        <p className="text-xs text-muted-foreground">
          נדרשות הרשאות גישה לחשבון פרסום בפייסבוק.
        </p>
      </div>
    </div>
  );
}
