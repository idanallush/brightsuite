import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
  // Allow external images (Facebook CDN, Unsplash)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: '**.facebook.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  // Puppeteer needs these for PDF generation
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium-min', 'sharp'],
};

export default nextConfig;
