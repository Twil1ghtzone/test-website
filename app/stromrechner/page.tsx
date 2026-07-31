import type { Metadata } from "next";
import { readContent } from "@/lib/server/store";
import Sparrechner from "@/components/Sparrechner";

export const metadata: Metadata = {
  title: "Energie-Spar-Rechner — was bleibt wirklich übrig?",
  description:
    "Schätzen Sie, wie viel eine lokale, abofreie Lösung im Jahr spart: Strom, Wärme und Balkonkraftwerk getrennt gerechnet, Serverstrom abgezogen, das vollständige Paket als Investition gegengestellt — inklusive PDF-Auswertung.",
};

// Serverseitig, damit die Kontaktdaten aus dem Admin im PDF-Fuß landen.
export const dynamic = "force-dynamic";

export default function StromrechnerPage() {
  const c = readContent();
  return (
    <Sparrechner
      kontakt={{ companyName: c.companyName, email: c.email, phone: c.phone, region: c.region }}
    />
  );
}
