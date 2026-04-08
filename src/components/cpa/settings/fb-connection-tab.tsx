"use client";

import useSWR from "swr";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/cpa/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/cpa/ui/card";
import { Skeleton } from "@/components/cpa/ui/skeleton";
import { RefreshCw, Wifi, WifiOff } from "lucide-react";
import { formatDate } from "@/lib/cpa/format";

interface FbConnectionResponse {
  connected: boolean;
  connection: {
    id: string;
    fb_user_id: string;
    fb_user_name: string;
    token_expires_at: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  } | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  return res.json();
};

export function FbConnectionTab() {
  const { data, error, isLoading, mutate } = useSWR<FbConnectionResponse>(
    "/api/cpa/facebook/connection",
    fetcher,
  );
  const [refreshing, setRefreshing] = useState(false);

  const connection = data?.connection;
  const isConnected = data?.connected === true && connection != null;

  async function handleRefreshToken() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/cpa/auth/refresh", { method: "POST" });
      if (!res.ok) throw new Error("שגיאה ברענון טוקן");
      toast.success("הטוקן רוענן בהצלחה");
      mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה ברענון טוקן");
    } finally {
      setRefreshing(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="pt-6">
          <p className="text-destructive text-center">שגיאה בטעינת סטטוס החיבור</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {isConnected ? (
            <Wifi className="h-5 w-5 text-green-500" />
          ) : (
            <WifiOff className="h-5 w-5 text-destructive" />
          )}
          סטטוס חיבור פייסבוק
        </CardTitle>
        <CardDescription>חיבור ל-Facebook Marketing API</CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected && connection ? (
          <div className="space-y-4">
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">שם משתמש:</span>
                <span className="font-medium">{connection.fb_user_name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">תוקף טוקן:</span>
                <span className="font-medium">
                  {connection.token_expires_at
                    ? formatDate(connection.token_expires_at)
                    : "לא ידוע"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-muted-foreground">סטטוס:</span>
                <span className="inline-flex items-center gap-1.5 text-green-600 font-medium">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  מחובר
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefreshToken}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                רענן טוקן
              </Button>
              <Button asChild variant="outline">
                <a href="/api/cpa/auth/login">התחבר מחדש</a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 py-4">
            <p className="text-muted-foreground">
              יש להתחבר לפייסבוק כדי לסנכרן חשבונות פרסום
            </p>
            <Button asChild className="bg-[#1877F2] hover:bg-[#1565C0] text-white">
              <a href="/api/cpa/auth/login">התחבר לפייסבוק</a>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
