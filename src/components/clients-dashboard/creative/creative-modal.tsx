'use client';

import { X, ExternalLink } from 'lucide-react';
import useSWR from 'swr';
import CreativeChart from './creative-chart';
import type { CreativeAssetRow, CreativeDailyRow } from '@/app/api/clients-dashboard/creative/[id]/route';
import type { CreativeType } from '@/lib/clients-dashboard/types';

interface DetailResponse {
  creative: {
    id: number;
    clientId: number;
    platform: string;
    platformAdId: string;
    adName: string | null;
    type: CreativeType;
    thumbnailUrl: string | null;
    mediaUrl: string | null;
    headline: string | null;
    body: string | null;
    cta: string | null;
    landingUrl: string | null;
    effectiveStatus: string | null;
    firstSeenAt: string | null;
    lastSeenAt: string | null;
  };
  assets: CreativeAssetRow[];
  daily: CreativeDailyRow[];
  totals: {
    impressions: number;
    clicks: number;
    spend: number;
    conversions: number;
    revenue: number;
    videoViews: number;
  };
  range: { startDate: string; endDate: string };
}

interface Props {
  creativeId: number;
  startDate: string;
  endDate: string;
  currency: string;
  metricType: 'leads' | 'ecommerce';
  onClose: () => void;
}

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

function formatCurrency(value: number, currency: string): string {
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency + ' ';
  return symbol + Math.round(value).toLocaleString('he-IL');
}

function formatNumber(value: number): string {
  return Math.round(value).toLocaleString('he-IL');
}

export default function CreativeModal({
  creativeId,
  startDate,
  endDate,
  currency,
  metricType,
  onClose,
}: Props) {
  const { data, error, isLoading } = useSWR<DetailResponse>(
    `/api/clients-dashboard/creative/${creativeId}?startDate=${startDate}&endDate=${endDate}`,
    fetcher,
  );

  return (
    <div
      className="cd-creative-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cd-creative-modal">
        <div className="cd-creative-modal__head">
          <div>
            <h3 className="cd-creative-modal__title">
              {data?.creative.adName || 'קראייטיב'}
            </h3>
            {data && (
              <div className="cd-creative-modal__sub">
                {data.creative.platform.toUpperCase()} · {data.creative.platformAdId}
                {data.creative.effectiveStatus
                  ? ` · ${data.creative.effectiveStatus}`
                  : ''}
              </div>
            )}
          </div>
          <button type="button" className="cd-creative-modal__close" onClick={onClose} aria-label="סגור">
            <X size={16} />
          </button>
        </div>

        {isLoading && <div className="cd-empty">טוען…</div>}
        {error && (
          <div className="cd-empty" style={{ color: '#b91c1c' }}>
            שגיאה בטעינת פרטי הקראייטיב
          </div>
        )}

        {data && (
          <div className="cd-creative-modal__body">
            <div>
              <div className="cd-creative-modal__media">
                {renderMedia(data.creative)}
              </div>

              {data.assets.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    כרטיסיות ({data.assets.length})
                  </strong>
                  <div style={{ marginTop: 6 }}>
                    {data.assets.map((asset) => (
                      <div key={asset.id} className="cd-creative-asset-row">
                        {asset.thumbnailUrl ? (
                          <img src={asset.thumbnailUrl} alt={asset.headline || ''} />
                        ) : (
                          <div
                            style={{
                              width: 64,
                              height: 64,
                              borderRadius: 6,
                              background: 'rgba(0,0,0,0.06)',
                            }}
                          />
                        )}
                        <div className="cd-creative-asset-row__meta">
                          {asset.headline && <strong>{asset.headline}</strong>}
                          {asset.body && <span>{asset.body}</span>}
                          {asset.landingUrl && (
                            <a
                              href={asset.landingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: 11, color: 'var(--accent-fg)' }}
                            >
                              {asset.landingUrl}
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="cd-creative-modal__copy">
              {data.creative.headline && (
                <div className="cd-creative-modal__copy-block">
                  <strong>כותרת</strong>
                  <span>{data.creative.headline}</span>
                </div>
              )}
              {data.creative.body && (
                <div className="cd-creative-modal__copy-block">
                  <strong>טקסט</strong>
                  <span>{data.creative.body}</span>
                </div>
              )}
              {data.creative.cta && (
                <div className="cd-creative-modal__copy-block">
                  <strong>CTA</strong>
                  <span>{data.creative.cta}</span>
                </div>
              )}
              {data.creative.landingUrl && (
                <div className="cd-creative-modal__copy-block">
                  <strong>דף נחיתה</strong>
                  <a
                    href={data.creative.landingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <ExternalLink size={11} />
                    {data.creative.landingUrl}
                  </a>
                </div>
              )}

              <div className="cd-creative-modal__totals">
                <div className="cd-creative-modal__totals-cell">
                  <strong>הוצאה</strong>
                  <span className="cd-mono">{formatCurrency(data.totals.spend, currency)}</span>
                </div>
                <div className="cd-creative-modal__totals-cell">
                  <strong>חשיפות</strong>
                  <span className="cd-mono">{formatNumber(data.totals.impressions)}</span>
                </div>
                <div className="cd-creative-modal__totals-cell">
                  <strong>קליקים</strong>
                  <span className="cd-mono">{formatNumber(data.totals.clicks)}</span>
                </div>
                {metricType === 'ecommerce' ? (
                  <div className="cd-creative-modal__totals-cell">
                    <strong>הכנסה</strong>
                    <span className="cd-mono">
                      {formatCurrency(data.totals.revenue, currency)}
                    </span>
                  </div>
                ) : (
                  <div className="cd-creative-modal__totals-cell">
                    <strong>המרות</strong>
                    <span className="cd-mono">{formatNumber(data.totals.conversions)}</span>
                  </div>
                )}
                {data.creative.type === 'video' && (
                  <div className="cd-creative-modal__totals-cell">
                    <strong>צפיות</strong>
                    <span className="cd-mono">
                      {formatNumber(data.totals.videoViews)}
                    </span>
                  </div>
                )}
              </div>

              <div className="cd-creative-modal__chart">
                <CreativeChart daily={data.daily} metricType={metricType} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function renderMedia(c: DetailResponse['creative']) {
  const src = c.mediaUrl || c.thumbnailUrl;
  if (!src) {
    return (
      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>אין תצוגת מדיה</span>
    );
  }
  // Direct mp4 — render as <video>. Otherwise show the still thumbnail; Meta video_id
  // requires a separate fetch with source URL we don't store at sync time.
  if (c.type === 'video' && c.mediaUrl && /\.mp4($|\?)/i.test(c.mediaUrl)) {
    return <video src={c.mediaUrl} controls preload="metadata" poster={c.thumbnailUrl || undefined} />;
  }
  return <img src={src} alt={c.adName || ''} />;
}
