'use client';

import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

const roleLabelMap: Record<string, string> = {
  admin: 'מנהל',
  manager: 'מנהל חשבון',
  viewer: 'צופה',
};

export default function ProfilePage() {
  const { user } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const firstLetter = user?.name?.charAt(0)?.toUpperCase() || '?';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'הסיסמאות אינן תואמות' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'סיסמה חדשה חייבת להכיל לפחות 6 תווים' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'שגיאה בשינוי סיסמה' });
        return;
      }

      setMessage({ type: 'success', text: 'הסיסמה שונתה בהצלחה' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setMessage({ type: 'error', text: 'שגיאת שרת' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* User Info */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold text-white shrink-0"
            style={{ background: '#2563eb' }}
          >
            {firstLetter}
          </div>
          <div className="flex-1 min-w-0">
            <h2
              className="text-lg font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {user?.name}
            </h2>
            <p
              className="text-sm mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              {user?.email}
            </p>
            <span
              className="inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium"
              style={{
                background: 'rgba(37,99,235,0.1)',
                color: '#2563eb',
              }}
            >
              {roleLabelMap[user?.role || ''] || user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound size={18} style={{ color: 'var(--text-secondary)' }} />
          <h3
            className="text-base font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            שינוי סיסמה
          </h3>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {/* Current password */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              סיסמה נוכחית
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute start-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              סיסמה חדשה
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute start-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <div>
            <label
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              אימות סיסמה חדשה
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.6)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {message && (
            <p
              className="text-sm px-3 py-2 rounded-lg"
              style={{
                background: message.type === 'success' ? '#e8f5ee' : '#fceaea',
                color: message.type === 'success' ? '#1a7a4c' : '#c0392b',
              }}
            >
              {message.text}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-50"
            style={{ background: '#2563eb' }}
          >
            {saving ? 'שומר...' : 'שנה סיסמה'}
          </button>
        </form>
      </div>
    </div>
  );
}
