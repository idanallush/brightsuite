import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Brand constants — Bright agency
// ---------------------------------------------------------------------------
export const BRAND = {
  name: "Bright",
  tagline: "Leading the Way to Success",
  fullName: "Bright | Leading the Way to Success",
  address: "החרש 8, רמת השרון",
  phone: "054-4445580",
  email: "info@b-bright.co.il",
  website: "www.b-bright.co.il",
  websiteUrl: "https://b-bright.co.il",
} as const;

export const BRAND_COLORS = {
  /** Primary brand yellow — used for accents, borders, metric labels */
  yellow: "#FFC107",
  /** Light yellow — badge backgrounds */
  yellowLight: "#FFF8E1",
  /** Dark — cover page, text */
  dark: "#1a1a1a",
  /** Cover page background */
  coverBg: "#1a1a2e",
} as const;

// ---------------------------------------------------------------------------
// Logo — returns null if file is missing so templates fall back to Text
// ---------------------------------------------------------------------------

function tryLoadPng(filePath: string): string | null {
  try {
    const absPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(absPath)) {
      console.warn(`[brand] Logo not found: ${absPath}`);
      return null;
    }
    const buffer = fs.readFileSync(absPath);
    return `data:image/png;base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.warn(`[brand] Failed to load logo ${filePath}:`, err);
    return null;
  }
}

/** White/icon logo for dark backgrounds (cover page). Returns null if missing. */
export function getBrandLogoWhite(): string | null {
  return tryLoadPng("public/bright-logo-white.png");
}

/** Text logo for light backgrounds (page headers). Returns null if missing. */
export function getBrandLogoBlack(): string | null {
  return tryLoadPng("public/bright-logo-black.png");
}
