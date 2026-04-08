'use client';

import { useToast as useToastOriginal } from '@/components/writer/ToastContext';

interface ToastContext {
  toasts: { id: number; message: string; type: string }[];
  showToast: (message: string, type?: string) => void;
  dismissToast: (id: number) => void;
}

export function useWriterToast(): ToastContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useToastOriginal() as any as ToastContext;
}
