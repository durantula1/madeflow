import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingIncludes: {
    "/api/orders/[orderId]/pdf": [
      "./node_modules/@fontsource/noto-sans/files/noto-sans-cyrillic-ext-400-normal.woff",
      "./node_modules/@fontsource/noto-sans/files/noto-sans-cyrillic-ext-600-normal.woff",
    ],
  },
};

export default nextConfig;
