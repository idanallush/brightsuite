// Human-readable labels and descriptions for the raw `kind` strings emitted
// by the alerts detector (see ./alerts-detector.ts). The detector emits
// machine-readable identifiers; the UI uses this map to display Hebrew copy
// and a tooltip that explains exactly what triggered the alert.
//
// If a kind is not in this map the UI falls back to the raw string — keep
// this in sync with the detector when adding new kinds.

export interface AlertKindMeta {
  label: string;
  description: string;
}

export const ALERT_KIND_LABELS: Record<string, AlertKindMeta> = {
  spend_spike: {
    label: 'זינוק בהוצאה',
    description:
      'ההוצאה אתמול גבוהה מפי 2 מהממוצע היומי של 14 הימים האחרונים. בדקו אם בוצע שינוי בתקציב או באוטומציה של הקמפיין.',
  },
  conversion_drop: {
    label: 'צניחה בהמרות',
    description:
      'אתמול לא נרשמו המרות למרות שהקמפיין הוציא תקציב, ובשבוע הקודם כן היו המרות. ייתכן בעיית מעקב, פיקסל, או שינוי משמעותי בקריאייטיב/קהל.',
  },
  roas_drop: {
    label: 'נפילת ROAS',
    description:
      'ה-ROAS אתמול נמוך מחצי מהממוצע של 14 הימים האחרונים (הוצאה מעל ₪100). מומלץ לבדוק את הקהל, ההצעה והמלאי.',
  },
  cpl_spike: {
    label: 'עליה ב-CPL',
    description:
      'עלות לליד אתמול גבוהה מפי 2 מהממוצע של 14 הימים האחרונים. ייתכן שינוי בקהל, ביצירתיים או בתחרות במכרז.',
  },
  campaign_paused: {
    label: 'קמפיין הושהה',
    description:
      'קמפיין שהיה פעיל בעבר עבר לסטטוס לא פעיל (PAUSED או דומה). ודאו שזו פעולה מכוונת ולא השעיה אוטומטית של הפלטפורמה.',
  },
  'no_data:meta': {
    label: 'אין נתונים מ-Meta',
    description:
      'ב-3 הימים האחרונים לא התקבלו רשומות ביצועים מחשבון Meta המחובר. ייתכן שפג טוקן הגישה, או שאין הרשאה לחשבון המודעות.',
  },
  'no_data:google': {
    label: 'אין נתונים מ-Google Ads',
    description:
      'ב-3 הימים האחרונים לא התקבלו רשומות ביצועים מחשבון Google Ads המחובר. בדקו את חיבור ה-MCC ואת הרשאת חשבון הלקוח.',
  },
  'no_data:ga4': {
    label: 'אין נתונים מ-GA4',
    description:
      'ב-3 הימים האחרונים לא התקבלו רשומות מ-GA4 (Property). בדקו את ההרשאות לנכס וההגדרות של ה-Measurement ID.',
  },
};

/**
 * Resolve a kind string to a label/description. Falls back to the raw kind
 * (with no description) if it isn't in the map — this keeps the UI safe in
 * the face of new detector kinds rolled out before this map is updated.
 */
export function resolveAlertKind(kind: string): AlertKindMeta {
  const meta = ALERT_KIND_LABELS[kind];
  if (meta) return meta;
  return { label: kind, description: '' };
}
