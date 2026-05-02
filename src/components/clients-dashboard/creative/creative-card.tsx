'use client';

import { useState } from 'react';
import { Image as ImageIcon, Video, Layers, ShoppingBag } from 'lucide-react';
import type { CreativeListRow } from '@/app/api/clients-dashboard/creative/route';
import type { CreativeType } from '@/lib/clients-dashboard/types';

interface Props {
  creative: CreativeListRow;
  currency: string;
  metricType: 'leads' | 'ecommerce';
  onClick: () => void;
}

const TYPE_LABELS: Record<CreativeType, string> = {
  video: 'וידאו',
  image: 'תמונה',
  carousel: 'קרוסלה',
  collection: 'קולקציה',
};

type EffectiveStatusKey = 'active' | 'paused' | 'archived';

interface StatusMeta {
  key: EffectiveStatusKey;
  label: string;
  modifier: string;
}

// Maps any Meta effective_status string to one of three buckets we render
// as a colored dot in the card's top-right corner.
function statusMeta(raw: string | null): StatusMeta {
  const v = (raw || '').toUpperCase();
  if (v === 'ACTIVE') {
    return { key: 'active', label: 'פעיל', modifier: 'cd-creative-card__status--active' };
  }
  if (
    v === 'ARCHIVED' ||
    v === 'DELETED' ||
    v === 'CAMPAIGN_PAUSED' ||
    v === 'ADSET_PAUSED' ||
    v === 'DISAPPROVED'
  ) {
    return {
      key: 'archived',
      label: v === 'ARCHIVED' || v === 'DELETED' ? 'בארכיון' : 'מושבת',
      modifier: 'cd-creative-card__status--archived',
    };
  }
  // PAUSED, PENDING_REVIEW, IN_PROCESS, WITH_ISSUES, etc. — treat as paused.
  return { key: 'paused', label: 'מושהה', modifier: 'cd-creative-card__status--paused' };
}

function formatCurrency(value: number, currency: string): string {
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency + ' ';
  return symbol + Math.round(value).toLocaleString('he-IL');
}

function compactNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Math.round(n).toLocaleString('he-IL');
}

function TypeIcon({ type, size = 12 }: { type: CreativeType; size?: number }) {
  if (type === 'video') return <Video size={size} />;
  if (type === 'carousel') return <Layers size={size} />;
  if (type === 'collection') return <ShoppingBag size={size} />;
  return <ImageIcon size={size} />;
}

function ThumbPlaceholder({ type }: { type: CreativeType }) {
  return (
    <span className="cd-creative-card__thumb-empty" aria-hidden="true">
      <TypeIcon type={type} size={28} />
    </span>
  );
}

export default function CreativeCard({ creative, currency, metricType, onClick }: Props) {
  const status = statusMeta(creative.effectiveStatus);
  const thumb = creative.thumbnailUrl || creative.mediaUrl;
  const isVideo = creative.type === 'video';
  const name = creative.adName || 'ללא שם';

  // If the remote thumb URL fails to load (Meta CDN sometimes rotates), fall
  // back to the same placeholder we render when there's no URL at all.
  const [thumbBroken, setThumbBroken] = useState(false);
  const showThumb = thumb && !thumbBroken;

  return (
    <button type="button" className="cd-creative-card" onClick={onClick}>
      <div className="cd-creative-card__thumb">
        {showThumb ? (
          isVideo && creative.mediaUrl && /\.mp4($|\?)/i.test(creative.mediaUrl) ? (
            <video
              src={creative.mediaUrl}
              controls
              preload="metadata"
              poster={thumb || undefined}
              onError={() => setThumbBroken(true)}
            />
          ) : (
            <img
              src={thumb || ''}
              alt={name}
              loading="lazy"
              onError={() => setThumbBroken(true)}
            />
          )
        ) : (
          <ThumbPlaceholder type={creative.type} />
        )}

        <span className="cd-creative-card__type-badge">
          <TypeIcon type={creative.type} size={10} />
          <span style={{ marginInlineStart: 4 }}>{TYPE_LABELS[creative.type]}</span>
        </span>

        <span
          className={`cd-creative-card__status ${status.modifier}`}
          title={creative.effectiveStatus || status.label}
        >
          <span className="cd-creative-card__status-dot" aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <div className="cd-creative-card__body">
        <div className="cd-creative-card__name">{name}</div>
        <div className="cd-creative-card__primary cd-mono">
          {formatCurrency(creative.spend, currency)}
        </div>
        <div className="cd-creative-card__metrics cd-mono">
          <span title="חשיפות">{compactNumber(creative.impressions)} חשיפות</span>
          {metricType === 'ecommerce' ? (
            <span title="הכנסה">{formatCurrency(creative.revenue, currency)}</span>
          ) : (
            <span title="המרות">{compactNumber(creative.conversions)} המרות</span>
          )}
        </div>
      </div>
    </button>
  );
}
