export default function SectionHeader({ title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-1 h-5 rounded-full shrink-0" style={{ backgroundColor: 'var(--accent)' }} />
      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
    </div>
  )
}
