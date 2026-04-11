'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useSearchParams } from 'next/navigation';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/cpa/ui/card';
import { Button } from '@/components/cpa/ui/button';
import { Skeleton } from '@/components/cpa/ui/skeleton';

interface FbStatusResponse {
  connected: boolean;
  fbUserName?: string;
  fbUserId?: string;
  tokenExpiry?: number | null;
}

interface GoogleStatusResponse {
  connected: boolean;
  email?: string;
  scopes?: string[];
  hasAdsScope?: boolean;
  hasGa4Scope?: boolean;
  tokenExpiresAt?: string;
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
  const searchParams = useSearchParams();

  const { data: fbStatus, isLoading: fbLoading, mutate: mutateFb } = useSWR<FbStatusResponse>(
    '/api/account/facebook/status',
    fetcher
  );
  const { data: googleStatus, isLoading: googleLoading, mutate: mutateGoogle } = useSWR<GoogleStatusResponse>(
    '/api/ads-hub/auth/google/status',
    fetcher
  );
  const { data: platformData, isLoading: platformLoading } = useSWR<PlatformSettingsResponse>(
    '/api/ads-hub/settings',
    fetcher
  );

  const [disconnectingFb, setDisconnectingFb] = useState(false);
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false);

  // Handle OAuth redirect feedback
  useEffect(() => {
    const googleConnected = searchParams.get('google_connected');
    const googleError = searchParams.get('google_error');
    if (googleConnected) {
      toast.success('Google מחובר בהצלחה');
      mutateGoogle();
      window.history.replaceState({}, '', '/ads-hub/settings');
    } else if (googleError) {
      toast.error(`שגיאה בחיבור Google: ${googleError}`);
      window.history.replaceState({}, '', '/ads-hub/settings');
    }
  }, [searchParams, mutateGoogle]);

  const metaStatus = platformData?.platforms.find((p) => p.platform === 'meta');
  const googlePlatform = platformData?.platforms.find((p) => p.platform === 'google');
  const ga4Platform = platformData?.platforms.find((p) => p.platform === 'ga4');

  const handleFbDisconnect = async () => {
    setDisconnectingFb(true);
    try {
      const res = await fetch('/api/account/facebook/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('שגיאה בניתוק');
      toast.success('פייסבוק נותק');
      mutateFb();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בניתוק');
    } finally {
      setDisconnectingFb(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    setDisconnectingGoogle(true);
    try {
      const res = await fetch('/api/ads-hub/auth/google/disconnect', { method: 'POST' });
      if (!res.ok) throw new Error('שגיאה בניתוק');
      toast.success('Google נותק');
      mutateGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה בניתוק');
    } finally {
      setDisconnectingGoogle(false);
    }
  };

  if (fbLoading || platformLoading || googleLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map((i) => (
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

  const googleConnected = googleStatus?.connected === true;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Meta / Facebook */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            {fbStatus?.connected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            Meta Ads (Facebook + Instagram)
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
                <p className="text-xs px-2 py-1 rounded bg-[#fceaea] text-[#c0392b]" title={metaStatus.lastError}>
                  {metaStatus.lastError.length > 80 ? metaStatus.lastError.slice(0, 80) + '…' : metaStatus.lastError}
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
                  disabled={disconnectingFb}
                >
                  נתק
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">חיבור נדרש לסנכרון נתוני Meta Ads</p>
              <Button asChild size="sm" className="h-8 text-xs bg-[#1877F2] hover:bg-[#1565C0] text-white">
                <a href="/api/ads/auth/facebook">התחבר לפייסבוק</a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Google (Ads + Analytics combined) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            {googleConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            Google (Ads + Analytics)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {googleConnected ? (
            <>
              <div className="space-y-1 text-xs">
                <p className="text-muted-foreground">
                  חשבון: <span className="font-medium text-foreground">{googleStatus?.email}</span>
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: googleStatus?.hasAdsScope ? '#e8f5ee' : '#fceaea',
                      color: googleStatus?.hasAdsScope ? '#1a7a4c' : '#c0392b',
                    }}
                  >
                    {googleStatus?.hasAdsScope ? '✓ Google Ads' : '✗ Google Ads'}
                  </span>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: googleStatus?.hasGa4Scope ? '#e8f5ee' : '#fceaea',
                      color: googleStatus?.hasGa4Scope ? '#1a7a4c' : '#c0392b',
                    }}
                  >
                    {googleStatus?.hasGa4Scope ? '✓ Analytics' : '✗ Analytics'}
                  </span>
                </div>
                {googlePlatform && (
                  <p className="text-muted-foreground pt-1">
                    סנכרון Ads: <span className="font-medium text-foreground">{formatSyncDate(googlePlatform.lastSync)}</span>
                  </p>
                )}
                {ga4Platform && (
                  <p className="text-muted-foreground">
                    סנכרון GA4: <span className="font-medium text-foreground">{formatSyncDate(ga4Platform.lastSync)}</span>
                  </p>
                )}
              </div>
              {(googlePlatform?.lastError || ga4Platform?.lastError) && (
                <p
                  className="text-xs px-2 py-1 rounded bg-[#fceaea] text-[#c0392b]"
                  title={googlePlatform?.lastError || ga4Platform?.lastError || ''}
                >
                  {(googlePlatform?.lastError || ga4Platform?.lastError || '').slice(0, 80)}
                </p>
              )}
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                  <a href="/api/ads-hub/auth/google/start">
                    <RefreshCw className="h-3 w-3 ml-1" />
                    התחבר מחדש
                  </a>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={handleGoogleDisconnect}
                  disabled={disconnectingGoogle}
                >
                  נתק
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                חיבור יחיד ל-Google Ads ול-Google Analytics 4. התחברות אחת → שתי הפלטפורמות עובדות.
              </p>
              <Button
                asChild
                size="sm"
                className="h-8 text-xs bg-[#4285F4] hover:bg-[#3367D6] text-white"
              >
                <a href="/api/ads-hub/auth/google/start">התחבר ל-Google</a>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
