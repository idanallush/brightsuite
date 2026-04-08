'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, ChevronLeft, Trash2 } from 'lucide-react';
import { getHistory, getGeneration, deleteGeneration, deleteAllHistory } from '@/lib/writer/api-client';
import { useWriterToast as useToast } from '@/hooks/use-writer-toast';
import { useWriterContext } from '../layout';

const platformLabels: Record<string, string> = {
  facebook: 'Facebook',
  google: 'Google',
  'copy-design': 'עיצוב',
  landing: 'דף נחיתה',
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function rebuildOutput(outputs: any[]) {
  const result: Record<string, Record<string, any[]>> = {};
  for (const row of outputs) {
    if (!result[row.platform]) result[row.platform] = {};
    if (!result[row.platform][row.section]) result[row.platform][row.section] = [];
    try {
      result[row.platform][row.section].push(JSON.parse(row.content));
    } catch {
      result[row.platform][row.section].push({ text: row.content });
    }
  }
  return result;
}

export default function WriterHistoryPage() {
  const router = useRouter();
  const { setOutputData } = useWriterContext();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<number | string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    getHistory()
      .then((data: any) => setItems(data))
      .catch(() => showToast('שגיאה בטעינת היסטוריה', 'error'))
      .finally(() => setLoading(false));
  }, []);

  // Escape key closes confirmation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deleteConfirm) setDeleteConfirm(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [deleteConfirm]);

  const handleClick = async (id: number) => {
    try {
      const gen: any = await getGeneration(id);
      const output = rebuildOutput(gen.outputs || []);
      setOutputData(output);
      router.push('/writer/output');
    } catch (err) {
      showToast('שגיאה בטעינת הייצור', 'error');
    }
  };

  const handleDeleteOne = async (id: number) => {
    try {
      await deleteGeneration(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setDeleteConfirm(null);
      showToast('הייצור נמחק', 'success');
    } catch {
      showToast('שגיאה במחיקת הייצור', 'error');
    }
  };

  const handleDeleteAll = async () => {
    try {
      await deleteAllHistory();
      setItems([]);
      setDeleteConfirm(null);
      showToast('כל ההיסטוריה נמחקה', 'success');
    } catch {
      showToast('שגיאה במחיקת ההיסטוריה', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div style={{ color: 'var(--text-secondary)', animation: 'skeleton-pulse 1.5s ease-in-out infinite' }}>טוען היסטוריה...</div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Clock className="w-12 h-12" style={{ color: 'var(--text-disabled)' }} />
        <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>עדיין אין היסטוריה</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>ייצרו קופי כדי לראות אותו כאן</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-3 animate-[fadeIn_0.25s_ease-out]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium" style={{ color: 'var(--text-primary)' }}>היסטוריית ייצורים</h2>
        <button
          onClick={() => setDeleteConfirm('all')}
          className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>מחק הכל</span>
        </button>
      </div>
      {items.map((item) => {
        const platforms = (() => {
          try { return JSON.parse(item.platforms); } catch { return []; }
        })();

        return (
          <div
            key={item.id}
            className="w-full glass-card p-4 flex items-center gap-4 hover:border-[#1877F2]/20 transition-all duration-200 cursor-pointer"
          >
            {/* Clickable area: avatar + info */}
            <button
              onClick={() => handleClick(item.id)}
              className="flex items-center gap-4 flex-1 min-w-0 text-right"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                style={{ backgroundColor: item.client_color || '#9ca3af' }}
              >
                {item.client_initial || item.client_name?.[0] || '?'}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{item.client_name || 'ללא לקוח'}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDate(item.created_at)}</span>
                </div>
                {item.campaign && (
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{item.campaign}</p>
                )}
                <div className="flex gap-1.5 mt-2">
                  {platforms.map((p: string) => (
                    <span
                      key={p}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.08] font-medium"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {platformLabels[p] || p}
                    </span>
                  ))}
                </div>
              </div>
            </button>

            {/* Delete button */}
            <button
              onClick={() => setDeleteConfirm(item.id)}
              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="מחק"
              aria-label="מחק ייצור"
            >
              <Trash2 className="w-4 h-4 hover:text-red-400" style={{ color: 'var(--text-disabled)' }} />
            </button>

            <ChevronLeft
              className="w-4 h-4 shrink-0 cursor-pointer"
              style={{ color: 'var(--text-disabled)' }}
              onClick={() => handleClick(item.id)}
            />
          </div>
        );
      })}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-elevated p-6 max-w-sm w-full text-center" dir="rtl">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              {deleteConfirm === 'all' ? 'מחיקת כל ההיסטוריה' : 'מחיקת ייצור'}
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              {deleteConfirm === 'all'
                ? 'האם אתם בטוחים? כל הייצורים יימחקו לצמיתות.'
                : 'האם אתם בטוחים? הייצור יימחק לצמיתות.'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteConfirm === 'all' ? handleDeleteAll() : handleDeleteOne(deleteConfirm as number)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
              >
                מחק
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 text-sm hover:bg-white/[0.08] rounded-xl transition-colors"
                style={{ color: 'var(--text-secondary)' }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
