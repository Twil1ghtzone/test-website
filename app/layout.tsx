import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import { brand } from "@/lib/data";
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

export const metadata: Metadata = {
  title: `${brand.name} — Energie sparen. Unabhängig werden.`,
  description:
    "Elektrohandwerk und moderne IT aus einer Hand: cloud-freie Sicherheit & Smart Home, ein eigener sparsamer Server und maßgeschneiderter 3D-Druck. Energie sparen, unabhängig werden, ganz ohne monatliche Gebühren.",
};

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
  return (
    <html lang="de" data-scroll-behavior="smooth" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <SiteChrome>
          <ScrollBackdrop />
          <ScrollProgress />
          <Nav />
        </SiteChrome>
        {children}
        <SiteChrome>
          <Footer />
          <SupportButton />
        </SiteChrome>
      </body>
    </html>
  );
}
