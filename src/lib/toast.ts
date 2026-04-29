// Drop-in replacement for `import { toast } from 'sonner'` that routes
// through the existing Zustand-backed <ToastContainer /> already mounted in
// the (shell) layout. Sonner kept silently failing to mount in this app's
// stack, so we route through the toast system that's known to work.
//
// Usage:
//   import { toast } from '@/lib/toast'
//   toast.success('...')
//   toast.error('...')
//   toast.info('...')

import { useToastStore } from '@/stores/toast';

function emit(type: 'success' | 'error' | 'info', message: string | number | undefined) {
  if (message == null) return;
  useToastStore.getState().addToast(type, String(message));
}

export const toast = {
  success: (message: string | number) => emit('success', message),
  error: (message: string | number) => emit('error', message),
  info: (message: string | number) => emit('info', message),
  message: (message: string | number) => emit('info', message),
};
