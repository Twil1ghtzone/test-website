import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

/*
 * robots.txt — sagt Suchmaschinen, was sie lesen dürfen und wo die Sitemap liegt.
 *
 * Der Admin-Bereich, die API und die Ticket-/Support-Ansichten haben in einem
 * Suchindex nichts verloren: Sie sind entweder geschützt oder enthalten
 * personenbezogene Daten. Das ersetzt keine Zugriffskontrolle (die steckt in
 * proxy.ts und den Routen selbst), verhindert aber, dass solche Adressen
 * überhaupt in Suchergebnissen auftauchen.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/admin/", "/api/", "/support/ticket"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
