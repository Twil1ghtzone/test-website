import type { MetadataRoute } from "next";
import { readContent } from "@/lib/server/store";
import { brand } from "@/lib/data";

// Web-App-Manifest: macht die Seite auf dem Handy „installierbar"
// (Zum Home-Bildschirm hinzufügen) und sorgt für App-Gefühl ohne Browser-Chrome.
//
// Der Name kommt aus dem Admin ("Rechtstexte & Kontakt") — vorher stand hier
// der feste Platzhalter, sodass die installierte App anders hieß als die Seite.
export const dynamic = "force-dynamic";

export default function manifest(): MetadataRoute.Manifest {
  const name = readContent().companyName || brand.name;
  return {
    name: `${name} — Elektrohandwerk + IT`,
    short_name: name,
    description:
      "Cloud-freie Sicherheit & Smart Home, eigener Server und 3D-Druck — Energie sparen, unabhängig werden.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f2ea",
    theme_color: "#f6f2ea",
    icons: [
      {
        src: "/haus-illustration.png",
        sizes: "any",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
