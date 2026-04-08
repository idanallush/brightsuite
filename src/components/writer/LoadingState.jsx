import { PenSquare } from 'lucide-react'

export default function LoadingState() {
  return (
    <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[60vh]">
      {/* Animated icon */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: 'var(--accent-subtle)' }}>
          <PenSquare className="w-8 h-8" style={{ color: 'var(--accent-fg)' }} />
        </div>
        <div className="absolute inset-0 w-16 h-16 rounded-2xl animate-ping" style={{ background: 'var(--accent-subtle)', opacity: 0.5 }} />
      </div>

      {/* Text */}
      <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>...מנתח בריף ומייצר קופי</h2>

      {/* Progress bar */}
      <div className="w-64 h-1.5 bg-white/[0.05] rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]"
          style={{ width: '40%', backgroundColor: 'var(--accent)' }}
        />
      </div>

      <p className="text-sm mb-10" style={{ color: 'var(--text-secondary)' }}>זה לוקח בדרך כלל 30-60 שניות</p>

      {/* Skeleton cards */}
      <div className="w-full space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-white/[0.08] p-5" style={{ background: 'var(--card-bg)', animationDelay: `${i * 150}ms` }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-16 h-5 bg-white/[0.05] rounded-full animate-[skeleton-pulse_1.5s_ease-in-out_infinite]" />
              <div className="flex-1" />
              <div className="w-8 h-5 bg-white/[0.05] rounded animate-[skeleton-pulse_1.5s_ease-in-out_infinite]" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-white/[0.05] rounded w-full animate-[skeleton-pulse_1.5s_ease-in-out_infinite]" />
              <div className="h-3 bg-white/[0.05] rounded w-4/5 animate-[skeleton-pulse_1.5s_ease-in-out_infinite]" />
              <div className="h-3 bg-white/[0.05] rounded w-3/5 animate-[skeleton-pulse_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  )
}
