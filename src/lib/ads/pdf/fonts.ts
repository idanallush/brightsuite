import { Font } from "@react-pdf/renderer";
import path from "path";

const heeboPath = path.join(process.cwd(), "public/fonts/Heebo.ttf");

// Register Heebo — a Hebrew-supporting variable font from Google Fonts.
// The variable TTF contains all weights (100-900).
Font.register({
  family: "Heebo",
  fonts: [
    { src: heeboPath, fontWeight: 400 },
    { src: heeboPath, fontWeight: 700 },
  ],
});

// Disable automatic hyphenation — it breaks Hebrew/RTL text.
Font.registerHyphenationCallback((word: string) => [word]);
