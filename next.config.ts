import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // Hover upgrades a partial prefetch to the full dynamic payload, so the click paints from cache.
    dynamicOnHover: true,
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
  outputFileTracingIncludes: {
    "/api/changes/[changeOrderId]/pdf": [
      "./node_modules/@fontsource/noto-sans/files/noto-sans-cyrillic-ext-400-normal.woff",
      "./node_modules/@fontsource/noto-sans/files/noto-sans-cyrillic-ext-600-normal.woff",
    ],
  },
  async headers() {
    const portalHeaders = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ];
    return [
      { source: "/portal/:path*", headers: portalHeaders },
      { source: "/access/:path*", headers: portalHeaders },
    ];
  },
};

export default nextConfig;
