'use client';

// Tiny inline SVG dual-line chart: spend (left axis) + primary conversion
// metric (right axis). Avoids pulling in a chart library — the dataset is
// at most ~92 points (one per day), so SVG paths are plenty.

import { useMemo } from 'react';
import type { CampaignDailyPoint } from '@/lib/clients-dashboard/campaigns';

interface DailyChartProps {
  data: CampaignDailyPoint[];
  // For ecommerce, we plot revenue alongside spend; for leads, conversions.
  primaryMetric: 'revenue' | 'conversions';
  currency: string;
  width?: number;
  height?: number;
}

export default function DailyChart({
  data,
  primaryMetric,
  currency,
  width = 720,
  height = 200,
}: DailyChartProps) {
  const padX = 36;
  const padY = 18;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const series = useMemo(() => {
    const spend = data.map((d) => d.spend || 0);
    const primary = data.map((d) => (primaryMetric === 'revenue' ? d.revenue : d.conversions) || 0);
    const maxSpend = Math.max(1, ...spend);
    const maxPrimary = Math.max(1, ...primary);
    return { spend, primary, maxSpend, maxPrimary };
  }, [data, primaryMetric]);

  if (!data.length) {
    return <div className="cd-camp-chart-empty">אין נתונים יומיים בטווח שנבחר</div>;
  }

  const n = data.length;
  const xFor = (i: number) => padX + (n === 1 ? innerW / 2 : (i / (n - 1)) * innerW);

  const buildPath = (values: number[], max: number) => {
    if (!values.length) return '';
    return values
      .map((v, i) => {
        const x = xFor(i);
        const y = padY + innerH - (v / max) * innerH;
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const spendPath = buildPath(series.spend, series.maxSpend);
  const primaryPath = buildPath(series.primary, series.maxPrimary);

  // X-axis: show first, middle, last labels only (avoids overlap)
  const xLabelIndexes = uniq([0, Math.floor((n - 1) / 2), n - 1]);
  const symbol = currency === 'ILS' ? '₪' : currency === 'USD' ? '$' : currency;

  const primaryLabel = primaryMetric === 'revenue' ? 'הכנסה' : 'המרות';

  return (
    <div className="cd-camp-chart">
      <div className="cd-camp-chart__legend">
        <span className="cd-camp-chart__legend-item">
          <span className="cd-camp-chart__swatch" style={{ background: '#0ea5e9' }} />
          הוצאה
        </span>
        <span className="cd-camp-chart__legend-item">
          <span className="cd-camp-chart__swatch" style={{ background: '#a855f7' }} />
          {primaryLabel}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={`גרף ביצועים יומי - הוצאה ו${primaryLabel}`}
      >
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = padY + innerH * t;
          return (
            <line
              key={t}
              x1={padX}
              x2={padX + innerW}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity={0.08}
              strokeWidth={1}
            />
          );
        })}

        {/* spend (left scale) */}
        <path d={spendPath} fill="none" stroke="#0ea5e9" strokeWidth={2} />
        {/* primary metric (right scale) */}
        <path d={primaryPath} fill="none" stroke="#a855f7" strokeWidth={2} />

        {/* x-axis labels */}
        {xLabelIndexes.map((i) => (
          <text
            key={i}
            x={xFor(i)}
            y={height - 2}
            fontSize={10}
            textAnchor="middle"
            fill="currentColor"
            opacity={0.6}
          >
            {shortDate(data[i].date)}
          </text>
        ))}

        {/* y-axis ranges (left=spend, right=primary) */}
        <text x={4} y={padY + 4} fontSize={10} fill="#0ea5e9" opacity={0.85}>
          {symbol}
          {Math.round(series.maxSpend).toLocaleString('he-IL')}
        </text>
        <text x={4} y={padY + innerH} fontSize={10} fill="#0ea5e9" opacity={0.85}>
          0
        </text>
        <text
          x={width - 4}
          y={padY + 4}
          fontSize={10}
          fill="#a855f7"
          opacity={0.85}
          textAnchor="end"
        >
          {primaryMetric === 'revenue'
            ? symbol + Math.round(series.maxPrimary).toLocaleString('he-IL')
            : Math.round(series.maxPrimary).toLocaleString('he-IL')}
        </text>
        <text
          x={width - 4}
          y={padY + innerH}
          fontSize={10}
          fill="#a855f7"
          opacity={0.85}
          textAnchor="end"
        >
          0
        </text>
      </svg>
    </div>
  );
}

function shortDate(iso: string): string {
  // YYYY-MM-DD → DD/MM
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}`;
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
