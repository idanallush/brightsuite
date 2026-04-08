"use client";

import { useState } from "react";
import { Button } from "@/components/cpa/ui/button";
import { Card, CardContent } from "@/components/cpa/ui/card";
import { LogIn, Loader2, Key, CheckCircle2, ChevronDown } from "lucide-react";

export function LoginButton() {
  const [showManual, setShowManual] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOAuthLogin = () => {
    window.location.href = "/api/ads/auth/facebook";
  };

  const handleSubmitToken = async () => {
    if (!token.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ads/auth/set-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token.trim() }),
      });

      if (res.ok) {
        window.location.href = "/ads/dashboard";
      } else {
        const data = await res.json();
        setError(data.error || "טוקן לא תקין. בדוק ונסה שוב.");
        setLoading(false);
      }
    } catch {
      setError("שגיאת רשת. נסה שוב.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        size="lg"
        className="gap-2 text-base px-8"
        onClick={handleOAuthLogin}
        aria-label="התחבר עם פייסבוק"
      >
        <LogIn className="h-5 w-5" aria-hidden="true" />
        התחבר עם פייסבוק
      </Button>

      {!showManual ? (
        <button
          onClick={() => setShowManual(true)}
          className="flex items-center gap-1 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
          או הדבק token ידנית
        </button>
      ) : (
        <Card className="max-w-sm mx-auto">
          <CardContent className="py-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              הדבק Access Token מ-Graph API Explorer או מכל מקור אחר.
            </p>
            <div className="relative">
              <Key className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
              <input
                type="password"
                placeholder="הדבק Access Token..."
                value={token}
                aria-label="טוקן גישה לפייסבוק"
                onChange={(e) => {
                  setToken(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmitToken()}
                className="w-full h-10 rounded-md border border-input bg-background px-3 pe-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                dir="ltr"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">{error}</p>
            )}

            <Button
              className="w-full gap-2"
              size="sm"
              onClick={handleSubmitToken}
              disabled={loading || !token.trim()}
              aria-label="התחבר עם token"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {loading ? "מתחבר..." : "התחבר"}
            </Button>

            <button
              onClick={() => {
                setShowManual(false);
                setToken("");
                setError(null);
              }}
              className="block mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ביטול
            </button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
