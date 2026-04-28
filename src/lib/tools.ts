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
    color: '#FFDF4F',
  },
  {
    slug: 'writer',
    name: 'MultiWrite',
    description: 'ייצור קופי AI מרובה פלטפורמות',
    icon: 'PenLine',
    href: '/writer',
    color: '#d946ef',
  },
  {
    slug: 'clients-dashboard',
    name: 'Clients Dashboard',
    description: 'דשבורד לקוחות עם נתוני קמפיינים, קראייטיב, התראות ותצוגות מותאמות',
    icon: 'LayoutDashboard',
    href: '/clients-dashboard',
    color: '#0ea5e9',
  },
  {
    slug: 'ads-hub',
    name: 'Ads Hub',
    description: 'דשבורד מאוחד לנתוני פרסום מכל הפלטפורמות (legacy)',
    icon: 'BarChart3',
    href: '/ads-hub',
    color: '#3b82f6',
  },
  {
    slug: 'ppc-retainer',
    name: 'ניהול ריטיינרים',
    description: 'תיק לקוחות PPC, רווחיות צוות, הוצאות ותחזית 12 חודשים',
    icon: 'Briefcase',
    href: '/ppc-retainer',
    color: '#FFD400',
  },
];
