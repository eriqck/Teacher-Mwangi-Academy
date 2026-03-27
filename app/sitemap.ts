import type { MetadataRoute } from "next";
import { levels } from "@/lib/catalog";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3004";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1
    },
    {
      url: `${siteUrl}/subscribe`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    }
  ];

  const levelRoutes: MetadataRoute.Sitemap = levels.map((level) => ({
    url: `${siteUrl}/levels/${level.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9
  }));

  return [...staticRoutes, ...levelRoutes];
}
