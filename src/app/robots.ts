import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/", "/rest/v1/", "/rtc"] },
    sitemap: new URL("/sitemap.xml", siteUrl).href,
  };
}
