import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { brand } from "@/lib/data";
import { readContent } from "@/lib/server/store";
import { siteUrl } from "@/lib/site";
import Nav from "@/components/Nav";
import ScrollProgress from "@/components/ScrollProgress";
import ScrollBackdrop from "@/components/ScrollBackdrop";
import Footer from "@/components/Footer";
import SupportButton from "@/components/SupportButton";
import SiteChrome from "@/components/SiteChrome";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
});

const BESCHREIBUNG =
  "Elektrohandwerk und moderne IT aus einer Hand: cloud-freie Sicherheit & Smart Home, ein eigener sparsamer Server und maßgeschneiderter 3D-Druck. Energie sparen, unabhängig werden, ganz ohne monatliche Gebühren.";

/*
 * Metadaten werden zur Laufzeit gebildet, damit der im Admin gepflegte
 * Firmenname überall ankommt (Titel, Vorschaukarte) statt des Platzhalters.
 *
 * Open Graph + Twitter Card: Ohne diese Angaben zeigt ein geteilter Link in
 * WhatsApp, LinkedIn oder Slack nur die nackte URL — kein Bild, kein Titel.
 * Für einen Betrieb, der über Empfehlungen wächst, ist das verschenkte
 * Reichweite. `metadataBase` macht aus dem relativen Bildpfad eine absolute
 * URL; ohne sie ignorieren die Netzwerke das Bild.
 */
export async function generateMetadata(): Promise<Metadata> {
  const c = readContent();
  const name = c.companyName || brand.name;
  const titel = `${name} — Energie sparen. Unabhängig werden.`;
  return {
    metadataBase: new URL(siteUrl()),
    title: titel,
    description: BESCHREIBUNG,
    applicationName: name,
    openGraph: {
      type: "website",
      locale: "de_DE",
      siteName: name,
      title: titel,
      description: BESCHREIBUNG,
      url: "/",
      images: [{ url: "/technikraum-rack.webp", width: 1200, height: 630, alt: `${name} — Technikraum mit lokalem Server und sauber gepatchtem Netzwerk-Rack` }],
    },
    twitter: {
      card: "summary_large_image",
      title: titel,
      description: BESCHREIBUNG,
      images: ["/technikraum-rack.webp"],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f2ea",
  // Inhalt darf bis in die Notch-/Home-Bar-Bereiche — Abstände regeln safe-area-Utilities.
  viewportFit: "cover",
};

/*
 * Pflicht für die Nonce-CSP aus proxy.ts.
 *
 * Ein Nonce ist pro Antwort einzigartig. Eine zur Build-Zeit erzeugte
 * HTML-Datei kann ihn nicht enthalten — gemessen: 0 von 42 <script>-Tags
 * trugen einen Nonce, solange die Startseite statisch vorgerendert wurde.
 * Der Browser hätte damit ALLE Skripte blockiert und die Seite wäre nie
 * interaktiv geworden.
 *
 * Mit dynamischem Rendering setzt Next.js den Nonce aus dem Request-Header
 * in jedes eigene Skript-Tag. Der Preis: kein statischer Seiten-Cache mehr,
 * jede Anfrage wird gerendert. Für diese Seitengröße ist das vertretbar —
 * die Daten liegen als JSON lokal, es gibt keine Datenbankrunden.
 *
 * Wer den statischen Cache zurückhaben will, muss zurück auf
 * `script-src 'unsafe-inline'`. Beides gleichzeitig geht technisch nicht.
 */
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Serverseitig gelesen, damit der Support-Widget-Menüpunkt "E-Mail"/"Anrufen"
  // dieselben Kontaktdaten zeigt wie Footer und Kontaktseite — vorher stand
  // dort der feste Platzhalter aus lib/data.ts, unabhängig vom Admin.
  const c = readContent();

  /*
   * Strukturierte Daten (LocalBusiness) für Suchmaschinen.
   *
   * Sagt Google explizit: Das ist ein Handwerksbetrieb mit diesen
   * Kontaktdaten in diesem Einsatzgebiet — Grundlage dafür, überhaupt bei
   * lokalen Suchen ("Smart Home Installateur in der Nähe") aufzutauchen.
   * Alle Werte kommen aus dem Admin, es wird nichts erfunden.
   */
  const geschaeft = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: c.companyName || brand.name,
    description: BESCHREIBUNG,
    url: siteUrl(),
    email: c.email,
    telephone: c.phone,
    areaServed: c.region,
    image: `${siteUrl()}/technikraum-rack.webp`,
    priceRange: "€€",
  };

  return (
    <html lang="de" data-scroll-behavior="smooth" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(geschaeft) }} />
        <SiteChrome>
          <ScrollBackdrop />
          <ScrollProgress />
          <Nav />
        </SiteChrome>
        {children}
        <SiteChrome>
          <Footer />
          <SupportButton email={c.email} phone={c.phone} />
        </SiteChrome>
      </body>
    </html>
  );
}
