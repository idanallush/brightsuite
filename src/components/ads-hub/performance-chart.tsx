'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
}

interface PerformanceChartProps {
  data: DataPoint[];
  loading?: boolean;
}

const formatDate = (date: string): string => {
  const d = new Date(date);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

export const PerformanceChart = ({ data, loading }: PerformanceChartProps) => {
  if (loading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="h-64 rounded bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <p className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
          אין נתונים לתצוגה בטווח התאריכים הנבחר
        </p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    date: formatDate(d.date),
    spend: Number(d.spend),
    conversions: Number(d.conversions),
  }));

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-secondary)' }}>
        מגמת ביצועים
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#c0392b" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#c0392b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="convGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1a7a4c" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1a7a4c" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="spend"
            orientation="right"
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `₪${v}`}
          />
          <YAxis
            yAxisId="conversions"
            orientation="left"
            tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'white',
              border: '1px solid var(--glass-border)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value, name) => {
              const v = Number(value);
              if (name === 'spend') return [`₪${v.toFixed(0)}`, 'הוצאה'];
              if (name === 'conversions') return [v.toFixed(0), 'המרות'];
              return [v, String(name)];
            }}
          />
          <Area
            yAxisId="spend"
            type="monotone"
            dataKey="spend"
            stroke="#c0392b"
            fill="url(#spendGradient)"
            strokeWidth={2}
          />
          <Area
            yAxisId="conversions"
            type="monotone"
            dataKey="conversions"
            stroke="#1a7a4c"
            fill="url(#convGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
