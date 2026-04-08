'use client';

import { useState, useEffect } from 'react';
import { BookOpen, Plus, Trash2, Globe, X } from 'lucide-react';
import { getCopyArchive, addCopyArchive, deleteCopyArchive } from '@/lib/writer/api-client';
import { useWriterToast as useToast } from '@/hooks/use-writer-toast';
import { useWriterContext } from '../layout';

const platformOptions = [
  { value: '', label: 'כללי' },
  { value: 'facebook', label: 'Facebook Ads' },
  { value: 'google', label: 'Google Ads' },
  { value: 'landing', label: 'דף נחיתה' },
  { value: 'email', label: 'אימייל' },
  { value: 'sms', label: 'SMS' },
];

export default function WriterArchivePage() {
  const { currentClient } = useWriterContext();
  const clientId = currentClient?.id;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state
  const [text, setText] = useState('');
  const [platform, setPlatform] = useState('');
  const [notes, setNotes] = useState('');
  const [isGlobal, setIsGlobal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadArchive();
  }, [clientId]);

  async function loadArchive() {
    setLoading(true);
    try {
      const data: any = await getCopyArchive(clientId);
      setItems(data);
    } catch (err) {
      showToast('שגיאה בטעינת הארכיון', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      const newItem: any = await addCopyArchive({
        client_id: isGlobal ? null : clientId,
        text: text.trim(),
        platform,
        notes: notes.trim(),
        is_global: isGlobal,
      });
      setItems((prev) => [newItem, ...prev]);
      setText('');
      setPlatform('');
      setNotes('');
      setIsGlobal(false);
      setShowForm(false);
      showToast('הקופי נוסף לארכיון', 'success');
    } catch (err) {
      showToast('שגיאה בשמירת הקופי', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteCopyArchive(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setDeleteConfirm(null);
      showToast('הקופי נמחק מהארכיון', 'success');
    } catch (err) {
      showToast('שגיאה במחיקת הקופי', 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>ארכיון קופי</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>שמרו דוגמאות קופי מוצלחות — ה-AI ילמד מהן בעת יצירה</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--accent)' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'ביטול' : 'הוסיפו קופי'}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <form onSubmit={handleAdd} className="glass-card p-4 mb-6 space-y-3">
            <div>
              <label htmlFor="archive-text" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>טקסט הקופי</label>
              <textarea
                id="archive-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={4}
                className="glass-input resize-none"
                placeholder="הדביקו כאן קופי מוצלח שאתם רוצים שה-AI ילמד ממנו..."
                dir="rtl"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label htmlFor="archive-platform" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>פלטפורמה</label>
                <select
                  id="archive-platform"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="glass-select w-full"
                >
                  {platformOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label htmlFor="archive-notes" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>הערות (אופציונלי)</label>
                <input
                  id="archive-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="glass-input"
                  placeholder="למשל: CTR גבוה, המרות טובות..."
                  dir="rtl"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={isGlobal}
                  onChange={(e) => setIsGlobal(e.target.checked)}
                  className="rounded border-white/10 accent-[#1877F2]"
                />
                <Globe className="w-3.5 h-3.5" />
                גלובלי — זמין לכל הלקוחות
              </label>
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {submitting ? 'שומר...' : 'שמירה'}
              </button>
            </div>
          </form>
        )}

        {/* Empty State */}
        {items.length === 0 && (
          <div className="text-center py-16">
            <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-disabled)' }} />
            <h3 className="font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>עדיין אין דוגמאות בארכיון</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>הוסיפו קופי מוצלח כדי שה-AI ילמד מהסגנון שלכם</p>
          </div>
        )}

        {/* Archive Items */}
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="glass-card p-4 transition-colors group">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-primary)' }}>{item.text}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {item.platform && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}>
                        {platformOptions.find((p) => p.value === item.platform)?.label || item.platform}
                      </span>
                    )}
                    {item.is_global === 1 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 font-medium flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        גלובלי
                      </span>
                    )}
                    {item.notes && (
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{item.notes}</span>
                    )}
                  </div>
                </div>

                {/* Delete */}
                {deleteConfirm === item.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-[11px] px-2 py-1 rounded bg-red-500 text-white cursor-pointer hover:bg-red-600 transition-colors"
                    >
                      מחיקה
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-[11px] px-2 py-1 rounded bg-white/[0.08] cursor-pointer hover:bg-white/[0.12] transition-colors"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      ביטול
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(item.id)}
                    className="p-1.5 rounded-lg hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                    style={{ color: 'var(--text-disabled)' }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
