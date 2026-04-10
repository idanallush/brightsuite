'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Wifi, WifiOff, RefreshCw, ExternalLink, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/cpa/ui/card';
import { Button } from '@/components/cpa/ui/button';
import { Skeleton } from '@/components/cpa/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/cpa/ui/dialog';

interface FbStatusResponse {
  connected: boolean;
  fbUserName?: string;
  fbUserId?: string;
  tokenExpiry?: number | null;
}

interface PlatformStatus {
  platform: 'google' | 'meta' | 'ga4';
  connected: boolean;
  lastSync: string | null;
  accountCount: number;
  lastError: string | null;
}

interface PlatformSettingsResponse {
  platforms: PlatformStatus[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const formatDate = (timestamp: number | null | undefined): string => {
  if (!timestamp) return 'לא ידוע';
  return new Date(timestamp).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatSyncDate = (d: string | null): string => {
  if (!d) return 'לא בוצע';
  return new Date(d).toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const PlatformConnections = () => {
  const { data: fbStatus, isLoading: fbLoading, mutate: mutateFb } = useSWR<FbStatusResponse>(
    '/api/account/facebook/status',
    fetcher
  );
  const { data: platformData, isLoading: platformLoading } = useSWR<PlatformSettingsResponse>(
    '/api/ads-hub/settings',
    fetcher
  );

  const [disconnecting, setDisconnecting] = useState(false);
  const [guideOpen, setGuideOpen] = useState<null | 'google' | 'ga4'>(null);

  const googleStatus = platformData?.platforms.find((p) => p.platform === 'google');
  const metaStatus = platformData?.platforms.find((p) => p.platform === 'meta');
  const ga4Status = platformData?.platforms.find((p) => p.platform === 'ga4');

  const handleFbDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch('/api/account/facebook/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('שגיאה בניתוק');
      toast.success('פייסבוק נותק בהצלחה');
      mutateFb();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בניתוק');
    } finally {
      setDisconnecting(false);
    }
  };

  if (fbLoading || platformLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-5 w-32 mb-3" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Facebook / Meta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              {fbStatus?.connected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              Meta Ads
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {fbStatus?.connected ? (
              <>
                <div className="space-y-1 text-xs">
                  <p className="text-muted-foreground">
                    משתמש: <span className="font-medium text-foreground">{fbStatus.fbUserName}</span>
                  </p>
                  <p className="text-muted-foreground">
                    תוקף עד: <span className="font-medium text-foreground">{formatDate(fbStatus.tokenExpiry)}</span>
                  </p>
                  {metaStatus && (
                    <p className="text-muted-foreground">
                      סנכרון אחרון: <span className="font-medium text-foreground">{formatSyncDate(metaStatus.lastSync)}</span>
                    </p>
                  )}
                </div>
                {metaStatus?.lastError && (
                  <p
                    className="text-xs px-2 py-1 rounded bg-[#fceaea] text-[#c0392b]"
                    title={metaStatus.lastError}
                  >
                    {metaStatus.lastError.length > 60
                      ? metaStatus.lastError.slice(0, 60) + '…'
                      : metaStatus.lastError}
                  </p>
                )}
                <div className="flex gap-2">
                  <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                    <a href="/api/ads/auth/facebook">
                      <RefreshCw className="h-3 w-3 ml-1" />
                      התחבר מחדש
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={handleFbDisconnect}
                    disabled={disconnecting}
                  >
                    נתק
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  התחברות נדרשת לסנכרון נתוני Meta Ads
                </p>
                <Button asChild size="sm" className="h-8 text-xs bg-[#1877F2] hover:bg-[#1565C0] text-white">
                  <a href="/api/ads/auth/facebook">התחבר לפייסבוק</a>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Google Ads */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              {googleStatus?.connected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              Google Ads
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                סטטוס:{' '}
                <span className="font-medium text-foreground">
                  {googleStatus?.connected ? 'מחובר דרך Environment Variables' : 'לא מוגדר'}
                </span>
              </p>
              {googleStatus && (
                <p>
                  סנכרון אחרון: <span className="font-medium text-foreground">{formatSyncDate(googleStatus.lastSync)}</span>
                </p>
              )}
            </div>
            {googleStatus?.lastError && (
              <p
                className="text-xs px-2 py-1 rounded bg-[#fceaea] text-[#c0392b]"
                title={googleStatus.lastError}
              >
                {googleStatus.lastError.length > 60
                  ? googleStatus.lastError.slice(0, 60) + '…'
                  : googleStatus.lastError}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setGuideOpen('google')}
            >
              <Settings2 className="h-3 w-3 ml-1" />
              הגדר
            </Button>
          </CardContent>
        </Card>

        {/* GA4 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              {ga4Status?.connected ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              Google Analytics 4
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                סטטוס:{' '}
                <span className="font-medium text-foreground">
                  {ga4Status?.connected ? 'מחובר דרך Environment Variables' : 'לא מוגדר'}
                </span>
              </p>
              {ga4Status && (
                <p>
                  סנכרון אחרון: <span className="font-medium text-foreground">{formatSyncDate(ga4Status.lastSync)}</span>
                </p>
              )}
            </div>
            {ga4Status?.lastError && (
              <p
                className="text-xs px-2 py-1 rounded bg-[#fceaea] text-[#c0392b]"
                title={ga4Status.lastError}
              >
                {ga4Status.lastError.length > 60
                  ? ga4Status.lastError.slice(0, 60) + '…'
                  : ga4Status.lastError}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => setGuideOpen('ga4')}
            >
              <Settings2 className="h-3 w-3 ml-1" />
              הגדר
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Setup instructions dialog */}
      <Dialog open={guideOpen !== null} onOpenChange={(open) => !open && setGuideOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {guideOpen === 'google' ? 'הגדרת Google Ads' : 'הגדרת Google Analytics 4'}
            </DialogTitle>
            <DialogDescription>
              החיבור כרגע מבוסס על משתני סביבה ב-Vercel. OAuth מלא יתווסף בעדכון הבא.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">משתני סביבה נדרשים:</p>
            <pre className="bg-gray-50 rounded-lg p-3 text-xs font-mono overflow-x-auto" dir="ltr">
              {guideOpen === 'google' ? (
                <>
                  GOOGLE_ADS_CLIENT_ID=xxx{'\n'}
                  GOOGLE_ADS_CLIENT_SECRET=xxx{'\n'}
                  GOOGLE_ADS_REFRESH_TOKEN=xxx{'\n'}
                  GOOGLE_ADS_DEVELOPER_TOKEN=xxx{'\n'}
                  GOOGLE_ADS_LOGIN_CUSTOMER_ID=xxx
                </>
              ) : (
                <>
                  GA4_CLIENT_ID=xxx{'\n'}
                  GA4_CLIENT_SECRET=xxx{'\n'}
                  GA4_REFRESH_TOKEN=xxx
                </>
              )}
            </pre>
            <p className="text-xs text-muted-foreground">
              הגדר את המשתנים ב-Vercel Project Settings → Environment Variables, ואז deploy מחדש.
            </p>
          </div>
          <DialogFooter>
            <Button asChild variant="outline">
              <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 ml-1" />
                פתח Vercel Dashboard
              </a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
