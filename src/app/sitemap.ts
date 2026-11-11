import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/welcome", "/specialists", "/guide", "/pro/join", "/mascot"].map((path) => ({ url: new URL(path, siteUrl).href }));
}
