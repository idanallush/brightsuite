import { NextRequest, NextResponse } from "next/server";

// Allowlist of trusted Facebook CDN hostnames.
// Only URLs from these domains are proxied to prevent SSRF.
const ALLOWED_HOSTNAME_SUFFIXES = [
  ".fbcdn.net",
  ".facebook.com",
  ".cdninstagram.com",
  ".fbsbx.com", // platform-lookaside.fbsbx.com used by some ad creatives
  "images.unsplash.com", // dev mock images
];

function isAllowedUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    // Must be HTTPS
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_HOSTNAME_SUFFIXES.some(
      (suffix) => host === suffix.replace(/^\./, "") || host.endsWith(suffix)
    );
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  // Auth is not required for the media proxy because:
  // 1. URL allowlist (ALLOWED_HOSTNAME_SUFFIXES) prevents SSRF
  // 2. Only whitelisted CDN domains are proxied
  // 3. No sensitive data is exposed

  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  if (!isAllowedUrl(imageUrl)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  try {
    const res = await fetch(imageUrl);

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch media" }, { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";

    // Only allow image content types
    if (!contentType.startsWith("image/")) {
      return NextResponse.json({ error: "Unexpected content type" }, { status: 400 });
    }

    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to proxy media" }, { status: 500 });
  }
}
