"use client";

import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/cpa/ui/button";

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-800"
    >
      <AlertCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
      <p className="flex-1 text-sm">
        <span className="font-medium">שגיאה בטעינת מודעות.</span>{" "}
        {message}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="shrink-0 gap-1.5 border-red-300 text-red-700 hover:bg-red-100"
        aria-label="נסה שוב לטעון מודעות"
      >
        <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
        נסה שוב
      </Button>
    </div>
  );
}
