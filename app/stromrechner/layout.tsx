import type { Metadata } from "next";

// Eigene Metadaten für die Seite — die Seite selbst ist eine Client-Komponente
// und kann deshalb kein `metadata` exportieren.
export const metadata: Metadata = {
  title: "Energie-Spar-Rechner — was bleibt wirklich übrig?",
  description:
    "Schätzen Sie, wie viel eine lokale, abofreie Lösung im Jahr spart: Strom und Wärme getrennt gerechnet, Serverstrom abgezogen, Investition und Amortisation offen ausgewiesen.",
};

export default function StromrechnerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
