import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Workspace, client portal and token routes are private; they are also behind auth or a secret.
      disallow: ["/app", "/portal", "/access", "/api", "/onboarding", "/auth", "/join"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
