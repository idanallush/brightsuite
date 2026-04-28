'use client';

// Tiny dependency-free SVG line chart for daily perf.
// Two series: left axis = spend, right axis = conversions/revenue.

import type { CreativeDailyRow } from '@/app/api/clients-dashboard/creative/[id]/route';

interface Props {
  daily: CreativeDailyRow[];
  metricType: 'leads' | 'ecommerce';
}

export default function CreativeChart({ daily, metricType }: Props) {
  if (!daily.length) {
    return (
      <div className="cd-creative-chart" style={{ display: 'grid', placeItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          אין נתונים לטווח התאריכים
        </span>
      </div>
    );
  }

  const W = 600;
  const H = 160;
  const PAD_X = 24;
  const PAD_Y = 18;

  const xs = daily.map((_, i) => PAD_X + (i * (W - PAD_X * 2)) / Math.max(daily.length - 1, 1));

  const spends = daily.map((d) => d.spend);
  const others = daily.map((d) => (metricType === 'ecommerce' ? d.revenue : d.conversions));

  const maxSpend = Math.max(1, ...spends);
  const maxOther = Math.max(1, ...others);

  const yLeft = (v: number) => H - PAD_Y - (v / maxSpend) * (H - PAD_Y * 2);
  const yRight = (v: number) => H - PAD_Y - (v / maxOther) * (H - PAD_Y * 2);

  const linePath = (vals: number[], scale: (v: number) => number) =>
    vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs[i].toFixed(1)},${scale(v).toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="cd-creative-chart" preserveAspectRatio="none">
      {/* Baseline */}
      <line
        x1={PAD_X}
        x2={W - PAD_X}
        y1={H - PAD_Y}
        y2={H - PAD_Y}
        stroke="currentColor"
        strokeOpacity="0.15"
      />
      {/* Spend line (left axis) */}
      <path d={linePath(spends, yLeft)} fill="none" stroke="#0ea5e9" strokeWidth="2" />
      {/* Other line (right axis) */}
      <path
        d={linePath(others, yRight)}
        fill="none"
        stroke={metricType === 'ecommerce' ? '#a855f7' : '#16a34a'}
        strokeWidth="2"
      />
      {/* Legend */}
      <g fontSize="10" fill="currentColor" fillOpacity="0.7">
        <circle cx={PAD_X + 4} cy={8} r="3" fill="#0ea5e9" />
        <text x={PAD_X + 12} y={11}>הוצאה</text>
        <circle
          cx={PAD_X + 70}
          cy={8}
          r="3"
          fill={metricType === 'ecommerce' ? '#a855f7' : '#16a34a'}
        />
        <text x={PAD_X + 78} y={11}>
          {metricType === 'ecommerce' ? 'הכנסה' : 'המרות'}
        </text>
      </g>
    </svg>
  );
}
