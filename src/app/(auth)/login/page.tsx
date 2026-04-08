'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'שגיאה בכניסה, נסו שוב');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('שגיאת חיבור, נסו שוב מאוחר יותר');
    } finally {
      setLoading(false);
    }
  };

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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-sm font-medium"
            style={{ color: 'var(--text-tertiary)' }}
          >
            אימייל
          </label>
          <input
            id="email"
            type="email"
            className="glass-input"
            placeholder="email@example.com"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-sm font-medium"
            style={{ color: 'var(--text-tertiary)' }}
          >
            סיסמה
          </label>
          <input
            id="password"
            type="password"
            className="glass-input"
            placeholder="********"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <p
            className="text-sm py-2 px-3 rounded-lg"
            style={{
              color: 'var(--danger-text)',
              background: 'var(--danger-subtle)',
            }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn-primary w-full mt-2"
          disabled={loading}
        >
          {loading ? 'מתחבר...' : 'כניסה'}
        </button>
      </form>
    </div>
  );
}
