const allTabs = [
  { id: 'facebook', label: 'Facebook Ads' },
  { id: 'google', label: 'Google Ads' },
  { id: 'design', label: 'עיצוב קופי' },
  { id: 'landing', label: 'דף נחיתה' },
]

// Map platform keys from API to tab IDs
const platformToTab = {
  facebook: 'facebook',
  google: 'google',
  'copy-design': 'design',
  landing: 'landing',
  // Also accept direct tab IDs
  design: 'design',
  landing_page: 'landing',
}

export default function TabBar({ activeTab, onTabChange, availableTabs }) {
  const tabs = availableTabs
    ? allTabs.filter((tab) => availableTabs.includes(tab.id))
    : allTabs

  return (
    <div className="flex gap-2">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-2 rounded-full text-sm transition-colors cursor-pointer ${
              isActive
                ? 'text-white font-medium'
                : 'hover:bg-white/[0.08]'
            }`}
            style={
              isActive
                ? { backgroundColor: 'var(--accent)' }
                : { background: 'var(--card-bg)', color: 'var(--text-secondary)' }
            }
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export { platformToTab }
