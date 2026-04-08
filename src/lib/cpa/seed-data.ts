import type { MetricType } from "./metric-presets";

export interface SeedTopic {
  name: string;
  tcpa: number | null;
  tcpa_currency: string;
  keywords: string[];
  metric_type: MetricType;
}

export interface SeedClient {
  name: string;
  fb_account_name_patterns: string[];
  topics: SeedTopic[];
}

export const SEED_DATA: SeedClient[] = [
  {
    name: "שנקר הנדסאים",
    fb_account_name_patterns: ["שנקר", "shenkar", "shankar"],
    topics: [
      { name: "תקשורת חזותית", tcpa: 126, tcpa_currency: "ILS", keywords: ["תקשורת חזותית", "visual communication", "תקשורת"], metric_type: "leads" },
      { name: "אדריכלות נוף", tcpa: 204, tcpa_currency: "ILS", keywords: ["אדריכלות נוף", "landscape", "אדריכלות"], metric_type: "leads" },
      { name: "ערבית", tcpa: 177, tcpa_currency: "ILS", keywords: ["ערבית", "arabic", "ערבי"], metric_type: "leads" },
      { name: "הנדסאי בניין", tcpa: 57.46, tcpa_currency: "ILS", keywords: ["הנדסאי בניין", "הנדסת בניין", "בניין"], metric_type: "leads" },
      { name: "UXUI", tcpa: 72.87, tcpa_currency: "ILS", keywords: ["uxui", "ux", "ui", "עיצוב חוויה"], metric_type: "leads" },
      { name: "מעצב גרפי", tcpa: 76, tcpa_currency: "ILS", keywords: ["מעצב גרפי", "גרפי", "graphic"], metric_type: "leads" },
      { name: "home styling", tcpa: 138, tcpa_currency: "ILS", keywords: ["home styling", "styling", "עיצוב הבית"], metric_type: "leads" },
      { name: "מעצב פנים", tcpa: 306, tcpa_currency: "ILS", keywords: ["מעצב פנים", "עיצוב פנים", "interior"], metric_type: "leads" },
      { name: "יום פתוח", tcpa: 94, tcpa_currency: "ILS", keywords: ["יום פתוח", "open day", "פתוח"], metric_type: "leads" },
      { name: "הנדסאי תוכנה", tcpa: 142, tcpa_currency: "ILS", keywords: ["הנדסאי תוכנה", "תוכנה", "software"], metric_type: "leads" },
      { name: "מכינה", tcpa: null, tcpa_currency: "ILS", keywords: ["מכינה", "מכינת", "pre-academic"], metric_type: "leads" },
    ],
  },
  {
    name: "שמרת הזורע",
    fb_account_name_patterns: ["שמרת", "shameret", "הזורע"],
    topics: [
      { name: "מיטות מעבר", tcpa: 27, tcpa_currency: "ILS", keywords: ["מיטות מעבר", "מיטת מעבר"], metric_type: "ecommerce" },
      { name: "ספות", tcpa: 391, tcpa_currency: "ILS", keywords: ["ספות", "ספה", "sofa"], metric_type: "ecommerce" },
      { name: "פינות אוכל", tcpa: 357, tcpa_currency: "ILS", keywords: ["פינות אוכל", "פינת אוכל", "dining"], metric_type: "ecommerce" },
      { name: "מיטות", tcpa: 454, tcpa_currency: "ILS", keywords: ["מיטות", "מיטה", "bed"], metric_type: "ecommerce" },
      { name: "ספות נוער", tcpa: 599, tcpa_currency: "ILS", keywords: ["ספות נוער", "נוער", "youth"], metric_type: "ecommerce" },
      { name: "PMAX", tcpa: 320, tcpa_currency: "ILS", keywords: ["pmax", "performance max"], metric_type: "ecommerce" },
      { name: "Shopping", tcpa: 497, tcpa_currency: "ILS", keywords: ["shopping", "שופינג"], metric_type: "ecommerce" },
      { name: "Search", tcpa: 752, tcpa_currency: "ILS", keywords: ["search", "חיפוש"], metric_type: "ecommerce" },
      { name: "Brand", tcpa: 389, tcpa_currency: "ILS", keywords: ["brand", "מותג", "branding"], metric_type: "ecommerce" },
    ],
  },
  {
    name: "מילגה",
    fb_account_name_patterns: ["מילגה", "milega", "milga"],
    topics: [
      { name: "הריון ולידה", tcpa: 100, tcpa_currency: "ILS", keywords: ["הריון", "לידה", "pregnancy", "birth"], metric_type: "ecommerce" },
      { name: "מוצר החודש", tcpa: 80, tcpa_currency: "ILS", keywords: ["מוצר החודש", "product of the month"], metric_type: "ecommerce" },
      { name: "רימרקטינג", tcpa: 25, tcpa_currency: "ILS", keywords: ["רימרקטינג", "remarketing", "retargeting", "rmkt"], metric_type: "ecommerce" },
      { name: "מבצעים", tcpa: 130, tcpa_currency: "ILS", keywords: ["מבצעים", "מבצע", "sale", "promo"], metric_type: "ecommerce" },
      { name: "מצעים", tcpa: 50, tcpa_currency: "ILS", keywords: ["מצעים", "סדינים", "bedding"], metric_type: "ecommerce" },
      { name: "פופים", tcpa: 85, tcpa_currency: "ILS", keywords: ["פופים", "פופ", "beanbag"], metric_type: "ecommerce" },
      { name: "Brand", tcpa: 40, tcpa_currency: "ILS", keywords: ["brand", "מותג"], metric_type: "ecommerce" },
      { name: "Pmax", tcpa: 120, tcpa_currency: "ILS", keywords: ["pmax", "performance max"], metric_type: "ecommerce" },
      { name: "Shopping", tcpa: 70, tcpa_currency: "ILS", keywords: ["shopping", "שופינג"], metric_type: "ecommerce" },
    ],
  },
  {
    name: "Albert Levy",
    fb_account_name_patterns: ["albert", "levy", "אלברט"],
    topics: [
      { name: "לידים - קהל יהודי", tcpa: 50, tcpa_currency: "ILS", keywords: ["יהודי", "jewish", "leads jewish"], metric_type: "leads" },
      { name: "לידים - קהל אמריקאי", tcpa: 120, tcpa_currency: "USD", keywords: ["אמריקאי", "american", "us", "leads american"], metric_type: "leads" },
      { name: "איקומרס - רימרקטינג", tcpa: 100, tcpa_currency: "USD", keywords: ["remarketing", "retargeting", "rmkt", "רימרקטינג"], metric_type: "ecommerce" },
      { name: "איקומרס - קהל קר", tcpa: 70, tcpa_currency: "USD", keywords: ["cold", "prospecting", "קר", "קהל קר"], metric_type: "ecommerce" },
      { name: "גוגל מותג", tcpa: 30, tcpa_currency: "USD", keywords: ["google", "brand", "גוגל", "מותג"], metric_type: "ecommerce" },
    ],
  },
  {
    name: "חדווה ארז",
    fb_account_name_patterns: ["חדווה", "chedva", "hadva"],
    topics: [
      { name: "קורס לגדול יחד", tcpa: 100, tcpa_currency: "ILS", keywords: ["לגדול יחד", "קורס", "course"], metric_type: "leads" },
    ],
  },
  {
    name: "בית ספר למקצועות הספורט",
    fb_account_name_patterns: ["ספורט", "sport", "מקצועות הספורט"],
    topics: [
      { name: "קורס פילאטיס", tcpa: 100, tcpa_currency: "ILS", keywords: ["פילאטיס", "pilates"], metric_type: "leads" },
      { name: "קורס שחייה", tcpa: 150, tcpa_currency: "ILS", keywords: ["שחייה", "swimming"], metric_type: "leads" },
    ],
  },
  {
    name: "פוטוטבע",
    fb_account_name_patterns: ["פוטוטבע", "phototeva"],
    topics: [
      { name: "פייסבוק - שפיצברגן", tcpa: 220, tcpa_currency: "ILS", keywords: ["שפיצברגן", "svalbard", "spitsbergen"], metric_type: "leads" },
      { name: "פייסבוק - אנטרקטיקה", tcpa: 130, tcpa_currency: "ILS", keywords: ["אנטרקטיקה", "antarctica", "antarctic"], metric_type: "leads" },
      { name: "גוגל - אנטרקטיקה", tcpa: 220, tcpa_currency: "ILS", keywords: ["google antarc", "גוגל אנטרקט"], metric_type: "leads" },
      { name: "גוגל - שפיצברגן", tcpa: 65, tcpa_currency: "USD", keywords: ["google svalbard", "גוגל שפיצ"], metric_type: "leads" },
      { name: "גוגל - לפלנד", tcpa: 25, tcpa_currency: "USD", keywords: ["lapland", "לפלנד"], metric_type: "leads" },
    ],
  },
  {
    name: "עודד קרבצ'יק",
    fb_account_name_patterns: ["עודד", "קרבצ'יק", "oded"],
    topics: [
      { name: "הכשרת מאמנים", tcpa: 40, tcpa_currency: "ILS", keywords: ["הכשרת מאמנים", "מאמנים", "coaching"], metric_type: "leads" },
      { name: "שבירת תקרות זכוכית", tcpa: 60, tcpa_currency: "ILS", keywords: ["תקרות זכוכית", "glass ceiling", "שבירת"], metric_type: "leads" },
    ],
  },
  {
    name: "רייכמן",
    fb_account_name_patterns: ["רייכמן", "reichman", "idc"],
    topics: [
      { name: "דירקטורים ונושאי משרה", tcpa: 55, tcpa_currency: "ILS", keywords: ["דירקטורים", "נושאי משרה", "directors"], metric_type: "leads" },
      { name: "ניתוח דוחות כספיים", tcpa: 64, tcpa_currency: "ILS", keywords: ["דוחות כספיים", "ניתוח דוחות", "financial"], metric_type: "leads" },
      { name: "ניהול סיכוני סייבר", tcpa: 68, tcpa_currency: "ILS", keywords: ["סייבר", "cyber", "סיכוני"], metric_type: "leads" },
      { name: "אומנות הרטוריקה", tcpa: 50, tcpa_currency: "ILS", keywords: ["רטוריקה", "rhetoric", "אומנות"], metric_type: "leads" },
      { name: "AI למנהלים", tcpa: 60, tcpa_currency: "ILS", keywords: ["ai", "בינה מלאכותית", "למנהלים"], metric_type: "leads" },
      { name: "חדשנות בארגונים", tcpa: 170, tcpa_currency: "ILS", keywords: ["חדשנות", "innovation", "ארגונים"], metric_type: "leads" },
      { name: "השקעות נדלן", tcpa: 85, tcpa_currency: "ILS", keywords: ["נדלן", "real estate", "השקעות"], metric_type: "leads" },
      { name: "creativity in action", tcpa: 55, tcpa_currency: "ILS", keywords: ["creativity", "action", "יצירתיות"], metric_type: "leads" },
    ],
  },
  {
    name: "רותם שני",
    fb_account_name_patterns: ["רותם", "שני", "rotem"],
    topics: [
      { name: "רעננה", tcpa: 140, tcpa_currency: "ILS", keywords: ["רעננה", "raanana"], metric_type: "leads" },
      { name: "גבעתיים", tcpa: 105, tcpa_currency: "ILS", keywords: ["גבעתיים", "givatayim"], metric_type: "leads" },
      { name: "פתח תקווה", tcpa: 140, tcpa_currency: "ILS", keywords: ["פתח תקווה", "petah tikva"], metric_type: "leads" },
      { name: "בית שמש", tcpa: 34, tcpa_currency: "ILS", keywords: ["בית שמש", "bet shemesh"], metric_type: "leads" },
      { name: "גוגל - מותג", tcpa: 330, tcpa_currency: "ILS", keywords: ["google brand", "גוגל מותג"], metric_type: "leads" },
      { name: "גוגל - רעננה", tcpa: 84, tcpa_currency: "ILS", keywords: ["google raanana", "גוגל רעננה"], metric_type: "leads" },
      { name: "גוגל - גבעתיים", tcpa: 75, tcpa_currency: "ILS", keywords: ["google givatayim", "גוגל גבעתיים"], metric_type: "leads" },
      { name: "גוגל - פתח תקווה", tcpa: 50, tcpa_currency: "ILS", keywords: ["google petah", "גוגל פתח"], metric_type: "leads" },
    ],
  },
  {
    name: "Safe Consulting",
    fb_account_name_patterns: ["safe", "consulting", "סייף"],
    topics: [
      { name: "Refinance", tcpa: 90, tcpa_currency: "ILS", keywords: ["refinance", "ריפיננס", "משכנתא"], metric_type: "leads" },
    ],
  },
  {
    name: "קידמה גז",
    fb_account_name_patterns: ["קידמה", "גז", "kidma"],
    topics: [
      { name: "Gas for B2B", tcpa: 55, tcpa_currency: "ILS", keywords: ["gas", "b2b", "גז"], metric_type: "leads" },
    ],
  },
  {
    name: "Greems",
    fb_account_name_patterns: ["greems", "גרימס"],
    topics: [
      { name: "Smart EV Charging", tcpa: 140, tcpa_currency: "ILS", keywords: ["ev", "charging", "smart", "חשמלי"], metric_type: "leads" },
    ],
  },
  {
    name: "קבוצת חג'ג'",
    fb_account_name_patterns: ["חג'ג'", "hagag", "hajaj"],
    topics: [
      { name: "Port", tcpa: 100, tcpa_currency: "ILS", keywords: ["port", "פורט", "נמל"], metric_type: "leads" },
      { name: "Offices", tcpa: 300, tcpa_currency: "ILS", keywords: ["office", "משרד", "משרדים"], metric_type: "leads" },
    ],
  },
  {
    name: "Paseos Polares",
    fb_account_name_patterns: ["paseos", "polares"],
    topics: [
      { name: "Remarketing", tcpa: 15, tcpa_currency: "USD", keywords: ["remarketing", "retargeting", "rmkt"], metric_type: "leads" },
      { name: "Antarctica", tcpa: 30, tcpa_currency: "USD", keywords: ["antarctica", "antarctic", "אנטרקטיקה"], metric_type: "leads" },
      { name: "Artico", tcpa: 20, tcpa_currency: "USD", keywords: ["artico", "arctic", "ארקטי"], metric_type: "leads" },
    ],
  },
];
