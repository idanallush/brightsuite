import { useState, useEffect, useRef } from 'react'
import { X, Upload, Trash2 } from 'lucide-react'


export default function ClientModal({ client, onSave, onClose }) {
  const isEdit = !!client
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({
    name: '',
    initial: '',
    color: 'bg-gray-400',
    about: '',
    website: '',
    logo: '',
    winning_ads: '',
    avoid_notes: '',
  })

  useEffect(() => {
    if (client) {
      setForm({
        name: client.name || '',
        initial: client.initial || '',
        color: client.color || 'bg-gray-400',
        about: client.about || '',
        website: client.website || '',
        logo: client.logo || '',
        winning_ads: client.winning_ads || '',
        avoid_notes: client.avoid_notes || '',
      })
    }
  }, [client])

  // Escape key closes modal
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Auto-set initial from first char of name
  const handleNameChange = (name) => {
    const initial = name.trim().charAt(0) || ''
    setForm((prev) => ({ ...prev, name, initial }))
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setForm((prev) => ({ ...prev, logo: reader.result }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30 p-4">
      <div className="glass-elevated w-full max-w-lg max-h-[90vh] flex flex-col" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.08]">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'עריכת לקוח' : 'הוספת לקוח חדש'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer" aria-label="סגור">
            <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {/* Name */}
          <div>
            <label htmlFor="client-name" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>שם הלקוח</label>
            <input
              id="client-name"
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="לדוגמה: מילגה"
              className="glass-input"
              autoFocus
            />
          </div>

          {/* Website */}
          <div>
            <label htmlFor="client-website" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>אתר</label>
            <input
              id="client-website"
              type="url"
              value={form.website}
              onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="https://example.com"
              dir="ltr"
              className="glass-input text-left"
            />
          </div>

          {/* Logo upload */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>לוגו (אופציונלי)</label>
            <div className="flex items-center gap-3">
              {form.logo ? (
                <div className="relative">
                  <img src={form.logo} alt="logo" className="w-12 h-12 rounded-full object-cover border border-white/[0.08]" />
                  <button
                    type="button"
                    onClick={() => { setForm((prev) => ({ ...prev, logo: '' })); if (fileInputRef.current) fileInputRef.current.value = '' }}
                    className="absolute -top-1 -start-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-12 h-12 bg-white/[0.08] rounded-full flex items-center justify-center">
                  <Upload className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm hover:underline"
                style={{ color: 'var(--accent)' }}
              >
                {form.logo ? 'החלף לוגו' : 'העלה לוגו'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* About */}
          <div>
            <label htmlFor="client-about" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>כללי על הלקוח</label>
            <textarea
              id="client-about"
              value={form.about}
              onChange={(e) => setForm((prev) => ({ ...prev, about: e.target.value }))}
              placeholder="תיאור קצר: מה העסק, קהל יעד, טון דיבור..."
              rows={4}
              className="glass-input resize-none"
            />
          </div>

          {/* Winning Ads */}
          <div>
            <label htmlFor="client-winning-ads" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>מודעות שעבדו טוב</label>
            <textarea
              id="client-winning-ads"
              value={form.winning_ads}
              onChange={(e) => setForm((prev) => ({ ...prev, winning_ads: e.target.value }))}
              placeholder="הדבק כאן 2-3 טקסטים של מודעות מהעבר שעשו תוצאות טובות..."
              rows={4}
              className="glass-input resize-none"
            />
          </div>

          {/* Avoid Notes */}
          <div>
            <label htmlFor="client-avoid" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>מה לא לעשות</label>
            <textarea
              id="client-avoid"
              value={form.avoid_notes}
              onChange={(e) => setForm((prev) => ({ ...prev, avoid_notes: e.target.value }))}
              placeholder="מילים, סגנונות או גישות שלא עובדות ללקוח הזה..."
              rows={3}
              className="glass-input resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
              style={{ backgroundColor: 'var(--accent)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
            >
              {isEdit ? 'שמור שינויים' : 'הוסף לקוח'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm hover:bg-white/[0.08] rounded-xl transition-colors"
              style={{ color: 'var(--text-secondary)' }}
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
