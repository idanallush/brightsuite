'use client';

import { useState } from 'react';
import { Search, Video } from 'lucide-react';
import { useVideoLibrary } from '@/hooks/ads-hub/use-overview';
import { VideoCard } from '@/components/ads-hub/video-card';
import { VideoDetailModal } from '@/components/ads-hub/video-detail-modal';

const filters = [
  { value: 'all', label: 'הכל' },
  { value: 'with-utms', label: 'עם UTM' },
  { value: 'missing-transcript', label: 'חסר תמליל' },
];

export default function VideoLibraryPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const { data, isLoading } = useVideoLibrary(undefined, search, filter === 'all' ? undefined : filter);
  const videos = data?.videos || [];

  return (
    <div className="px-6 pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          ספריית וידאו
        </h2>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-tertiary)' }}
            />
            <input
              type="text"
              placeholder="חיפוש לפי שם..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-sm py-2 pr-9 pl-4 rounded-lg border w-48"
              style={{
                background: 'var(--glass-bg)',
                borderColor: 'var(--glass-border)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {/* Filter toggles */}
          <div className="flex gap-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className="px-3 py-1.5 text-sm rounded-lg transition-colors"
                style={{
                  background: filter === f.value ? 'var(--accent)' : 'transparent',
                  color: filter === f.value ? '#1a1a1a' : 'var(--text-secondary)',
                  border: filter === f.value ? 'none' : '1px solid var(--glass-border)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="glass-card rounded-xl h-64 animate-pulse" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Video size={40} className="mx-auto mb-3" style={{ color: 'var(--text-tertiary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>
            אין מודעות וידאו עדיין. הפעילו סנכרון כדי לגלות מודעות מ-Meta.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {videos.map((video: Record<string, unknown>) => (
            <VideoCard
              key={video.id as number}
              video={video}
              onClick={() => setSelectedVideoId(String(video.id))}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedVideoId && (
        <VideoDetailModal
          videoId={selectedVideoId}
          onClose={() => setSelectedVideoId(null)}
        />
      )}
    </div>
  );
}
