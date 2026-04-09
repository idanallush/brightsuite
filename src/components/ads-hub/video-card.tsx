'use client';

import { Play, Link2, Eye } from 'lucide-react';

interface VideoCardProps {
  video: Record<string, unknown>;
  onClick: () => void;
}

const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString('he-IL');
};

export const VideoCard = ({ video, onClick }: VideoCardProps) => {
  const thumbnail = video.thumbnail_url as string | null;
  const adName = (video.ad_name as string) || 'ללא שם';
  const utmCampaign = video.utm_campaign as string | null;
  const totalSpend = Number(video.total_spend || 0);
  const totalImpressions = Number(video.total_impressions || 0);
  const clientName = video.client_name as string | null;

  return (
    <button
      onClick={onClick}
      className="glass-card rounded-xl overflow-hidden text-right w-full transition-all hover:shadow-md"
    >
      {/* Thumbnail */}
      <div
        className="w-full h-36 flex items-center justify-center relative"
        style={{ background: '#f0f0ec' }}
      >
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={adName}
            className="w-full h-full object-cover"
          />
        ) : (
          <Play size={32} style={{ color: 'var(--text-tertiary)' }} />
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        <h4
          className="text-sm font-medium truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {adName}
        </h4>

        {clientName && (
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {clientName}
          </p>
        )}

        {/* Metrics row */}
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {formatNumber(totalImpressions)}
          </span>
          <span>₪{formatNumber(totalSpend)}</span>
        </div>

        {/* UTM badge */}
        {utmCampaign && (
          <span
            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded"
            style={{ background: '#e8f0fa', color: '#2563a0' }}
          >
            <Link2 size={10} />
            UTM
          </span>
        )}
      </div>
    </button>
  );
};
