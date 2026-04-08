'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Globe, UserPlus } from 'lucide-react';
import { getClients, createClient, updateClient, deleteClient } from '@/lib/writer/api-client';
import { useWriterToast as useToast } from '@/hooks/use-writer-toast';
import ClientModal from '@/components/writer/ClientModal';

function SkeletonCard() {
  return (
    <div className="glass-card p-5 flex items-start gap-4" style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite' }}>
      <div className="w-11 h-11 bg-white/[0.05] rounded-full shrink-0" />
      <div className="flex-1 space-y-2.5">
        <div className="h-4 bg-white/[0.05] rounded w-28" />
        <div className="h-3 bg-white/[0.05] rounded w-48" />
      </div>
    </div>
  );
}

export default function WriterClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const { showToast } = useToast();

  const loadClients = async () => {
    try {
      const data = await getClients();
      setClients(data);
    } catch (err) {
      showToast('שגיאה בטעינת לקוחות', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  // Escape key closes delete confirmation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && deleteConfirm) {
        setDeleteConfirm(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [deleteConfirm]);

  const handleSave = async (formData: any) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
        showToast('הלקוח עודכן בהצלחה', 'success');
      } else {
        await createClient(formData);
        showToast('הלקוח נוסף בהצלחה', 'success');
      }
      await loadClients();
      setModalOpen(false);
      setEditingClient(null);
    } catch (err) {
      showToast('שגיאה בשמירת הלקוח', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteClient(id);
      await loadClients();
      setDeleteConfirm(null);
      showToast('הלקוח נמחק', 'success');
    } catch (err) {
      showToast('שגיאה במחיקת הלקוח', 'error');
    }
  };

  const openEdit = (client: any) => {
    setEditingClient(client);
    setModalOpen(true);
  };

  const openAdd = () => {
    setEditingClient(null);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="space-y-2" style={{ animation: 'skeleton-pulse 1.5s ease-in-out infinite' }}>
            <div className="h-5 bg-white/[0.05] rounded w-20" />
            <div className="h-3 bg-white/[0.05] rounded w-16" />
          </div>
        </div>
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 animate-[fadeIn_0.25s_ease-out]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>לקוחות</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{clients.length} לקוחות</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          style={{ backgroundColor: 'var(--accent)' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
        >
          <Plus className="w-4 h-4" />
          <span>הוסף לקוח</span>
        </button>
      </div>

      {/* Client Cards */}
      <div className="space-y-3">
        {clients.map((client) => (
          <div
            key={client.id}
            className="glass-card p-5 flex items-start gap-4 hover:border-[#1877F2]/20 transition-all duration-200"
          >
            {/* Avatar */}
            {client.logo ? (
              <img src={client.logo} alt={client.name} className="w-11 h-11 rounded-full object-cover shrink-0" />
            ) : (
              <div className={`w-11 h-11 ${client.color} rounded-full flex items-center justify-center text-white text-lg font-semibold shrink-0`}>
                {client.initial}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{client.name}</h3>
                {client.website && (
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              {client.about && (
                <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{client.about}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => openEdit(client)}
                className="p-2 hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
                title="ערוך"
                aria-label="ערוך לקוח"
              >
                <Pencil className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </button>
              <button
                onClick={() => setDeleteConfirm(client.id)}
                className="p-2 hover:bg-red-500/10 rounded-lg transition-colors cursor-pointer"
                title="מחק"
                aria-label="מחק לקוח"
              >
                <Trash2 className="w-4 h-4 text-red-400/60 hover:text-red-400" />
              </button>
            </div>
          </div>
        ))}

        {clients.length === 0 && (
          <div className="text-center py-20">
            <UserPlus className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--text-disabled)' }} />
            <p className="font-semibold text-lg mb-1" style={{ color: 'var(--text-secondary)' }}>עדיין אין לקוחות</p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>הוסיפו את הלקוח הראשון כדי להתחיל לייצר קופי</p>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--accent)' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--accent)')}
            >
              <Plus className="w-4 h-4" />
              <span>הוסף לקוח ראשון</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <ClientModal
          client={editingClient}
          onSave={handleSave}
          onClose={() => {
            setModalOpen(false);
            setEditingClient(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-elevated p-6 max-w-sm w-full text-center" dir="rtl">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>מחיקת לקוח</h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
              האם אתם בטוחים? כל ההיסטוריה של הלקוח תימחק גם כן.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(deleteConfirm)}
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
