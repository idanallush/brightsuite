"use client";

import { useState, useCallback, useEffect } from "react";
import { DEFAULT_VISIBLE_METRICS } from "@/lib/ads/types/metrics";

const STORAGE_KEY = "fb-ads-tool-visible-metrics";

export function useColumnConfig() {
  // Always start with the default so SSR and client initial render match.
  // localStorage is read in useEffect after hydration to avoid mismatch.
  const [visibleMetrics, setVisibleMetrics] = useState<string[]>(DEFAULT_VISIBLE_METRICS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        setVisibleMetrics(parsed);
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const updateVisibleMetrics = useCallback((metrics: string[]) => {
    setVisibleMetrics(metrics);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
    } catch {
      // Ignore
    }
  }, []);

  const toggleMetric = useCallback((metricKey: string) => {
    setVisibleMetrics((prev) => {
      const next = prev.includes(metricKey)
        ? prev.filter((k) => k !== metricKey)
        : [...prev, metricKey];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore
      }
      return next;
    });
  }, []);

  const toggleCategory = useCallback(
    (categoryMetrics: string[], allSelected: boolean) => {
      setVisibleMetrics((prev) => {
        const next = allSelected
          ? prev.filter((k) => !categoryMetrics.includes(k))
          : [...new Set([...prev, ...categoryMetrics])];
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // Ignore
        }
        return next;
      });
    },
    []
  );

  return {
    visibleMetrics,
    updateVisibleMetrics,
    toggleMetric,
    toggleCategory,
    loaded: true,
  };
}
