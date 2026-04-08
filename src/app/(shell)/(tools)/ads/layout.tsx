'use client';

import { TokenExpiryBanner } from "@/components/ads/auth/token-expiry-banner";

export default function AdsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-full">
      <TokenExpiryBanner />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
}
