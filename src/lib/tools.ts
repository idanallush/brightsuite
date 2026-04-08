import { ToolSlug } from '@/types/auth';

export interface ToolDefinition {
  slug: ToolSlug;
  name: string;
  description: string;
  icon: string; // lucide icon name
  href: string;
  color: string; // accent color for the tool card
}

export const TOOLS: ToolDefinition[] = [
  {
    slug: 'ad-checker',
    name: 'Ad Safe Zone',
    description: 'בדיקת אזורי בטיחות בקריאייטיב למטא ו-GDN',
    icon: 'Shield',
    href: '/ad-checker',
    color: '#8b5cf6',
  },
  {
    slug: 'budget',
    name: 'BudgetFlow',
    description: 'תחזית תקציב חודשית עם שינויי תקציב אמצע חודש',
    icon: 'Wallet',
    href: '/budget',
    color: '#16a34a',
  },
  {
    slug: 'cpa',
    name: 'CPA Tracker',
    description: 'מעקב CPA בזמן אמת מול יעדים עם התראות',
    icon: 'Target',
    href: '/cpa',
    color: '#ea580c',
  },
  {
    slug: 'ads',
    name: 'FB Ads Tool',
    description: 'צפייה בקריאייטיב פעיל וייצוא דוחות PDF',
    icon: 'Image',
    href: '/ads',
    color: '#2563eb',
  },
  {
    slug: 'writer',
    name: 'MultiWrite',
    description: 'ייצור קופי AI מרובה פלטפורמות',
    icon: 'PenLine',
    href: '/writer',
    color: '#d946ef',
  },
];
