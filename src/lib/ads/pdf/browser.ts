import type { Browser } from "puppeteer-core";

let _browser: Browser | null = null;

// chromium-min downloads the binary from this URL at runtime
const CHROMIUM_PACK_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar";

export async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.connected) return _browser;

  const puppeteer = await import("puppeteer-core");

  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    // Vercel / AWS Lambda — use @sparticuz/chromium-min (downloads binary at runtime)
    const chromium = (await import("@sparticuz/chromium-min")).default;

    _browser = await puppeteer.default.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(CHROMIUM_PACK_URL),
      headless: true,
    });
  } else {
    // Local development — find system Chrome
    const possiblePaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    ];

    let executablePath: string | undefined;
    const fs = await import("fs");
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }

    _browser = await puppeteer.default.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  return _browser;
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}
