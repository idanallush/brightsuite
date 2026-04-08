'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { BarChart3, LayoutGrid, SlidersHorizontal, Download } from 'lucide-react';
import { LoginButton } from '@/components/ads/auth/login-button';

export default function AdsPage() {
  const { user, tools, loading } = useAuth();
  const router = useRouter();

  const hasAccess = !loading && tools.includes('ads');

  useEffect(() => {
    if (!loading && !hasAccess) {
      router.replace('/');
    }
  }, [loading, hasAccess, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 rounded-full border-[3px] border-zinc-200 animate-spin" style={{ borderTopColor: '#1877F2', borderRightColor: '#1877F2' }} />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  // If user is authenticated, redirect to ads dashboard
  // For now show the landing page with login
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
