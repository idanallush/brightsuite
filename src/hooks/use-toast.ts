'use client';

import { useToastStore } from '@/stores/toast';

export const useToast = () => {
  const addToast = useToastStore((s) => s.addToast);

  return {
    success: (msg: string) => addToast('success', msg),
    error: (msg: string) => addToast('error', msg),
    info: (msg: string) => addToast('info', msg),
  };
};
