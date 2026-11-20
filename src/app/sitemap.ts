import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
import { HELP_PAGES } from "@/content/help";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/welcome", "/specialists", "/help", "/guide", "/pro/join", "/mascot"];
  const articles = HELP_PAGES.map((p) => `/help/${p.slug}`);
  return [...pages, ...articles].map((path) => ({ url: new URL(path, siteUrl).href }));
}
