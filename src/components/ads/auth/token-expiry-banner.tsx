"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function TokenExpiryBanner() {
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/ads/auth/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.tokenExpiresIn != null && data.tokenExpiresIn < SEVEN_DAYS_MS) {
          setDaysLeft(Math.max(0, Math.floor(data.tokenExpiresIn / (24 * 60 * 60 * 1000))));
        }
      })
      .catch(() => {});
  }, []);

  if (daysLeft === null) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 flex items-center gap-2 text-sm">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        {daysLeft === 0
          ? "ההתחברות לפייסבוק פגה היום — יש להתחבר מחדש."
          : `ההתחברות לפייסבוק תפוג בעוד ${daysLeft} ימים — מומלץ להתחבר מחדש.`}
      </span>
      <a href="/ads" className="underline font-medium mr-auto">
        התחבר מחדש
      </a>
    </div>
  );
}
