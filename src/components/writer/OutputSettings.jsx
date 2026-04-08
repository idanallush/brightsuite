const platforms = [
  { id: 'facebook', label: 'Facebook Ads' },
  { id: 'google', label: 'Google Ads' },
  { id: 'copy-design', label: 'עיצוב קופי' },
  { id: 'landing', label: 'דף נחיתה' },
]

export default function OutputSettings({ language, onLanguageChange, activePlatforms, onPlatformsChange }) {
  const togglePlatform = (id) => {
    if (activePlatforms.includes(id)) {
      onPlatformsChange(activePlatforms.filter(p => p !== id))
    } else {
      onPlatformsChange([...activePlatforms, id])
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.08] px-4 py-4" style={{ background: 'var(--card-bg)' }}>
      <div className="space-y-4">
        {/* Language toggle */}
        <div>
          <label className="block text-[13px] mb-2" style={{ color: 'var(--text-secondary)' }}>שפה</label>
          <div className="inline-flex rounded-lg border border-white/[0.08] overflow-hidden">
            <button
              onClick={() => onLanguageChange('he')}
              className={`px-4 py-1.5 text-sm transition-colors cursor-pointer ${
                language === 'he' ? 'text-white font-medium' : 'hover:bg-white/[0.08]'
              }`}
              style={
                language === 'he'
                  ? { backgroundColor: 'var(--accent)' }
                  : { background: 'var(--card-bg)', color: 'var(--text-secondary)' }
              }
            >
              עברית
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-4 py-1.5 text-sm transition-colors cursor-pointer ${
                language === 'en' ? 'text-white font-medium' : 'hover:bg-white/[0.08]'
              }`}
              style={
                language === 'en'
                  ? { backgroundColor: 'var(--accent)' }
                  : { background: 'var(--card-bg)', color: 'var(--text-secondary)' }
              }
            >
              English
            </button>
          </div>
        </div>

        {/* Platform pills */}
        <div>
          <label className="block text-[13px] mb-2" style={{ color: 'var(--text-secondary)' }}>פלטפורמות</label>
          <div className="flex flex-wrap gap-2">
            {platforms.map((platform) => {
              const isActive = activePlatforms.includes(platform.id)
              return (
                <button
                  key={platform.id}
                  onClick={() => togglePlatform(platform.id)}
                  className={`px-3.5 py-1.5 rounded-full text-sm transition-colors cursor-pointer border ${
                    isActive
                      ? 'font-medium'
                      : 'border-white/[0.08] hover:border-white/[0.15]'
                  }`}
                  style={
                    isActive
                      ? { background: 'var(--accent-subtle)', color: 'var(--accent-fg)', borderColor: 'rgba(var(--accent-rgb, 101,105,167), 0.3)' }
                      : { background: 'var(--card-bg)', color: 'var(--text-secondary)' }
                  }
                >
                  {platform.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
