'use client';

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

export default function CreativeCard({ creative, currency, metricType, onClick }: Props) {
  const isActive = (creative.effectiveStatus || '').toUpperCase() === 'ACTIVE';
  const thumb = creative.thumbnailUrl || creative.mediaUrl;
  const isVideo = creative.type === 'video';
  const name = creative.adName || 'ללא שם';

  return (
    <button type="button" className="cd-creative-card" onClick={onClick}>
      <div className="cd-creative-card__thumb">
        {thumb ? (
          isVideo && creative.mediaUrl && /\.mp4($|\?)/i.test(creative.mediaUrl) ? (
            <video src={creative.mediaUrl} controls preload="metadata" poster={thumb} />
          ) : (
            <img src={thumb} alt={name} loading="lazy" />
          )
        ) : (
          <span className="cd-creative-card__thumb-empty">
            <TypeIcon type={creative.type} size={28} />
          </span>
        )}

        <span className="cd-creative-card__type-badge">
          <TypeIcon type={creative.type} size={10} />
          <span style={{ marginInlineStart: 4 }}>{TYPE_LABELS[creative.type]}</span>
        </span>

        <span
          className={
            'cd-creative-card__status-dot' +
            (isActive ? '' : ' cd-creative-card__status-dot--off')
          }
        >
          {isActive ? 'פעיל' : 'לא פעיל'}
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
