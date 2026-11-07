import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";

const routes = ["", "/heating", "/cooling", "/repairs", "/maintenance", "/service-area", "/about", "/book", "/contact", "/privacy", "/terms"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((r) => ({ url: `${siteUrl}${r}`, changeFrequency: "monthly", priority: r === "" ? 1 : r === "/book" ? 0.9 : 0.7 }));
}
