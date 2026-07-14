import type { MetadataRoute } from "next";

// Web-App-Manifest: macht die Seite auf dem Handy „installierbar"
// (Zum Home-Bildschirm hinzufügen) und sorgt für App-Gefühl ohne Browser-Chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STUDIO//LOKAL — Elektrohandwerk + IT",
    short_name: "STUDIO//LOKAL",
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
