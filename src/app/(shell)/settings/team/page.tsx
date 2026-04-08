'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, UserX, X } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { TOOLS } from '@/lib/tools';
import type { ToolSlug, UserRole } from '@/types/auth';

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: number;
  tools: ToolSlug[];
}

const roleLabelMap: Record<string, string> = {
  admin: 'מנהל',
  manager: 'מנהל חשבון',
  viewer: 'צופה',
};

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'מנהל' },
  { value: 'manager', label: 'מנהל חשבון' },
  { value: 'viewer', label: 'צופה' },
];

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('viewer');
  const [formTools, setFormTools] = useState<ToolSlug[]>([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setMembers(data.users || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('viewer');
    setFormTools([]);
    setFormError('');
    setEditingMember(null);
    setShowForm(false);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (member: TeamMember) => {
    setEditingMember(member);
    setFormName(member.name);
    setFormEmail(member.email);
    setFormPassword('');
    setFormRole(member.role);
    setFormTools(member.tools);
    setFormError('');
    setShowForm(true);
  };

  const toggleTool = (slug: ToolSlug) => {
    setFormTools((prev) =>
      prev.includes(slug) ? prev.filter((t) => t !== slug) : [...prev, slug],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      if (editingMember) {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            userId: editingMember.id,
            role: formRole,
            tools: formTools,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || 'שגיאה בעדכון');
          return;
        }
      } else {
        if (!formPassword || formPassword.length < 6) {
          setFormError('סיסמה חייבת להכיל לפחות 6 תווים');
          return;
        }
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            name: formName,
            email: formEmail,
            password: formPassword,
            role: formRole,
            tools: formTools,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || 'שגיאה ביצירת משתמש');
          return;
        }
      }
      resetForm();
      await fetchMembers();
    } catch {
      setFormError('שגיאת שרת');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeactivate = async (memberId: number) => {
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate', userId: memberId }),
      });
      await fetchMembers();
    } catch {
      // ignore
    }
  };

  if (user?.role !== 'admin') {
    return (
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        אין לך הרשאה לצפות בעמוד זה.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Add button */}
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          חברי צוות
        </h2>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity"
          style={{ background: '#2563eb' }}
        >
          <Plus size={16} />
          הוסף חבר צוות
        </button>
      </div>

      {/* Dialog/Form */}
      {showForm && (
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3
              className="text-base font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {editingMember ? 'עריכת חבר צוות' : 'הוספת חבר צוות'}
            </h3>
            <button
              onClick={resetForm}
              style={{ color: 'var(--text-secondary)' }}
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingMember && (
              <>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    שם
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    אימייל
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    סיסמה
                  </label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.6)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
              </>
            )}

            <div>
              <label
                className="block text-sm font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                תפקיד
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{
                  background: 'rgba(255,255,255,0.6)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                }}
              >
                {roleOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                הרשאות כלים
              </label>
              <div className="flex flex-wrap gap-2">
                {TOOLS.map((tool) => {
                  const checked = formTools.includes(tool.slug);
                  return (
                    <label
                      key={tool.slug}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-colors"
                      style={{
                        background: checked
                          ? 'rgba(37,99,235,0.1)'
                          : 'rgba(255,255,255,0.6)',
                        border: checked
                          ? '1px solid #2563eb'
                          : '1px solid var(--border)',
                        color: checked ? '#2563eb' : 'var(--text-secondary)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTool(tool.slug)}
                        className="sr-only"
                      />
                      {tool.name}
                    </label>
                  );
                })}
              </div>
            </div>

            {formError && (
              <p
                className="text-sm px-3 py-2 rounded-lg"
                style={{ background: '#fceaea', color: '#c0392b' }}
              >
                {formError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-50"
                style={{ background: '#2563eb' }}
              >
                {submitting
                  ? 'שומר...'
                  : editingMember
                    ? 'עדכן'
                    : 'צור משתמש'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2 rounded-xl text-sm font-medium transition-colors"
                style={{
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              טוען...
            </p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-6 text-center">
            <p
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              אין חברי צוות
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th
                    className="text-start px-4 py-3 font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    שם
                  </th>
                  <th
                    className="text-start px-4 py-3 font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    אימייל
                  </th>
                  <th
                    className="text-start px-4 py-3 font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    תפקיד
                  </th>
                  <th
                    className="text-start px-4 py-3 font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    סטטוס
                  </th>
                  <th
                    className="text-start px-4 py-3 font-medium"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.id}
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <td
                      className="px-4 py-3"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {member.name}
                    </td>
                    <td
                      className="px-4 py-3"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {member.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium"
                        style={{
                          background: 'rgba(37,99,235,0.1)',
                          color: '#2563eb',
                        }}
                      >
                        {roleLabelMap[member.role] || member.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block text-xs px-2.5 py-0.5 rounded-full font-medium"
                        style={{
                          background: member.is_active
                            ? '#e8f5ee'
                            : '#fceaea',
                          color: member.is_active ? '#1a7a4c' : '#c0392b',
                        }}
                      >
                        {member.is_active ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEdit(member)}
                          className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                          style={{ color: '#2563eb' }}
                          title="ערוך"
                        >
                          <Pencil size={15} />
                        </button>
                        {member.is_active && member.id !== user?.id && (
                          <button
                            onClick={() => handleDeactivate(member.id)}
                            className="p-1.5 rounded-lg transition-colors hover:opacity-70"
                            style={{ color: '#c0392b' }}
                            title="השבת"
                          >
                            <UserX size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
