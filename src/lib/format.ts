import { format as formatDateFns } from 'date-fns';
import { he } from 'date-fns/locale';

export function formatCurrency(value: number, currency: 'ILS' | 'USD' = 'ILS'): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, decimals = 1): string {
  return new Intl.NumberFormat('he-IL', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

export function formatDate(date: Date | string | null | undefined, pattern = 'dd.MM.yy'): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';
  return formatDateFns(d, pattern, { locale: he });
}

export function formatDateTime(date: Date | string): string {
  return formatDate(date, 'dd.MM.yy HH:mm');
}
