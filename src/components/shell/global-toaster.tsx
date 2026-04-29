'use client';

import { Toaster } from 'sonner';

// Mounted at the root layout (above auth and tool layouts) so toast.success /
// toast.error from anywhere in the app always have a Toaster to render into.
// Sonner's <section data-sonner-toaster> child only appears once a toast is
// active, but the root <section aria-label="Notifications alt+T"> is always
// in the DOM when the Toaster is mounted — that's the diagnostic anchor.
export function GlobalToaster() {
  return (
    <Toaster
      position="bottom-center"
      dir="rtl"
      richColors
      closeButton
      duration={4500}
    />
  );
}
