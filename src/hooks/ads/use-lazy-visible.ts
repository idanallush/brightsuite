"use client";

import { useRef, useState, useEffect } from "react";

/**
 * Intersection Observer hook for lazy loading.
 * Returns a ref to attach to the container and a boolean indicating visibility.
 * Once visible, stays visible (observer disconnects).
 */
export function useLazyVisible(rootMargin = "200px") {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  return { ref, isVisible };
}
