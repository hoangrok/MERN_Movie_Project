import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: "https://clipdam18.com/sitemap.xml",
    host: "https://clipdam18.com",
  };
}