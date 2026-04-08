'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const errorMessages: Record<string, string> = {
  access_denied: 'הגישה נדחתה. נסו שוב.',
  no_code: 'לא התקבל קוד אימות מ-Google.',
  invalid_state: 'שגיאת אבטחה. נסו שוב.',
  auth_failed: 'שגיאה בהתחברות עם Google.',
};

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const errorMessage = error
    ? errorMessages[error] || 'שגיאה בכניסה, נסו שוב'
    : null;

  return (
    <div className="glass-panel w-full max-w-md p-8">
      <div className="text-center mb-8">
        <h1
          className="text-2xl font-semibold"
          style={{ color: 'var(--accent)' }}
        >
          BrightSuite
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: 'var(--text-tertiary)' }}
        >
          כניסה לחשבון
        </p>
      </div>

      {errorMessage && (
        <p
          className="text-sm py-2 px-3 rounded-lg mb-4"
          style={{
            color: 'var(--danger-text)',
            background: 'var(--danger-subtle)',
          }}
        >
          {errorMessage}
        </p>
      )}

      <a
        href="/api/auth/google"
        className="btn-primary w-full flex items-center justify-center gap-3 py-3 text-base"
      >
        <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
          <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          <path fill="none" d="M0 0h48v48H0z"/>
        </svg>
        התחבר עם Google
      </a>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
