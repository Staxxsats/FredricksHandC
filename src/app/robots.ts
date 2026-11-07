import type { MetadataRoute } from "next";
import { businessConfig as b } from "@/config/business";
import { siteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  if (b.siteMode !== "live") return { rules: [{ userAgent: "*", disallow: "/" }] }; // prelaunch preview stays out of search
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }], sitemap: `${siteUrl}/sitemap.xml` };
}
