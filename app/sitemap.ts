import type { MetadataRoute } from "next";
import { services } from "@/lib/services";
import { readPosts, readContent } from "@/lib/server/store";
import { siteUrl } from "@/lib/site";

/*
 * Sitemap für Suchmaschinen.
 *
 * Ohne diese Datei muss Google die Struktur selbst erraten — bei einer Seite,
 * deren Leistungsseiten und Blogbeiträge dynamisch aus dem Admin kommen,
 * bleiben dabei zuverlässig welche unentdeckt. Hier stehen sie explizit drin,
 * inklusive Änderungsdatum aus dem Store.
 *
 * `force-dynamic`: Die Liste hängt vom Inhalt des Admin-Stores ab (neue
 * Blogbeiträge sollen ohne Rebuild auftauchen).
 */
export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const jetzt = new Date();

  const statisch: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: jetzt, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/ueber-uns`, lastModified: jetzt, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/kontakt`, lastModified: jetzt, changeFrequency: "yearly", priority: 0.9 },
    { url: `${base}/stromrechner`, lastModified: jetzt, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/konfigurator`, lastModified: jetzt, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/faq`, lastModified: jetzt, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/blog`, lastModified: jetzt, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/support`, lastModified: jetzt, changeFrequency: "yearly", priority: 0.4 },
    { url: `${base}/impressum`, lastModified: jetzt, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/datenschutz`, lastModified: jetzt, changeFrequency: "yearly", priority: 0.2 },
  ];

  // AGB nur aufnehmen, wenn wirklich Text hinterlegt ist — eine leere Seite
  // in der Sitemap ist ein Qualitätssignal-Minus.
  if (readContent().agb.trim()) {
    statisch.push({ url: `${base}/agb`, lastModified: jetzt, changeFrequency: "yearly", priority: 0.2 });
  }

  const leistungen: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${base}/leistungen/${s.slug}`,
    lastModified: jetzt,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const beitraege: MetadataRoute.Sitemap = readPosts()
    .filter((p) => p.status === "published")
    .map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: new Date(p.updatedAt || p.createdAt),
      changeFrequency: "yearly",
      priority: 0.5,
    }));

  return [...statisch, ...leistungen, ...beitraege];
}
