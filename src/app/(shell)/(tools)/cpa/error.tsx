'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/cpa/ui/card';
import { Button } from '@/components/cpa/ui/button';

export default function CpaError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error('[cpa] route error boundary:', error);
  }, [error]);

  return (
    <div className="p-6">
      <Card className="rounded-xl border-red-200 bg-red-50">
        <div className="flex flex-col items-center justify-center p-10 gap-4 text-center">
          <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-red-700">משהו השתבש בטעינת העמוד</p>
            <p className="text-sm text-red-600 break-words max-w-md">
              {error.message || 'שגיאה לא צפויה'}
            </p>
            {error.digest && (
              <p className="text-[11px] text-red-500/80 font-mono pt-1">
                {error.digest}
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => unstable_retry()}
            className="h-9 gap-1.5 border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4" />
            נסה שוב
          </Button>
        </div>
      </Card>
    </div>
  );
}
