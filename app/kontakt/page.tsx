import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Phone, MapPin, Clock, Tag, ListChecks } from "lucide-react";
import ContactForm from "@/components/ContactForm";
import { Tilt } from "@/components/ui/motion";
import { contact } from "@/lib/data";
import { readContent } from "@/lib/server/store";

// Serverseitig, damit die im Admin unter "Rechtstexte & Kontakt" gepflegten
// Kontaktdaten hier ankommen. Vorher stand hier der feste Platzhalter aus
// lib/data.ts — eine Änderung im Admin wurde auf dieser Seite nie sichtbar,
// obwohl das Panel selbst "Kontaktseite" als Ziel nennt.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const c = readContent();
  return {
    title: `Kontakt — ${c.companyName}`,
    description:
      "Sprechen Sie mit uns über Ihr Zuhause. Unverbindliche Anfrage — Preis individuell, weil jedes Haus anders ist.",
  };
}

const goodToKnow = [
  { icon: Tag, title: "Preis auf Anfrage", body: "Jedes Haus und Netzwerk ist anders — feste Pakete gibt es deshalb nicht. Sie bekommen ein individuelles, unverbindliches Angebot." },
  { icon: ListChecks, title: "Das hilft uns weiter", body: "Beschreiben Sie kurz Ihr Vorhaben: Räume, Anzahl Kameras, gewünschte Dienste oder einfach Ihr Ziel — wir melden uns persönlich." },
];

export default function KontaktPage() {
  const c = readContent();
  const info = [
    { icon: Mail, label: "E-Mail", value: c.email, href: `mailto:${c.email}` },
    { icon: Phone, label: "Telefon", value: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` },
    { icon: MapPin, label: "Einsatzgebiet", value: c.region },
    { icon: Clock, label: "Antwort", value: "In der Regel innerhalb von 1–2 Tagen" },
  ];
  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <span className="text-ink-soft">Kontakt</span>
        </nav>

        {/* Kopf */}
        <div className="mt-8 max-w-2xl">
          <span className="eyebrow text-accent">{contact.eyebrow}</span>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Sprechen wir über <span className="emph">Ihr Zuhause.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">{contact.body}</p>
        </div>

        <div className="mt-14 grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Infos */}
          <div>
            <div className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2">
              {info.map((i) => {
                const Icon = i.icon;
                const inner = (
                  <>
                    <Tilt>
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                        <Icon className="h-5 w-5" />
                      </span>
                    </Tilt>
                    <span className="mt-3 block eyebrow text-muted">{i.label}</span>
                    <span className="mt-1 block font-medium text-ink">{i.value}</span>
                  </>
                );
                return i.href ? (
                  <a key={i.label} href={i.href} className="block bg-surface p-5 transition-colors hover:bg-canvas cursor-pointer">
                    {inner}
                  </a>
                ) : (
                  <div key={i.label} className="bg-surface p-5">{inner}</div>
                );
              })}
            </div>

            <div className="mt-6 space-y-4">
              {goodToKnow.map((g) => {
                const Icon = g.icon;
                return (
                  <div key={g.title} className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
                    <Tilt className="shrink-0">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-canvas">
                        <Icon className="h-5 w-5" />
                      </span>
                    </Tilt>
                    <div>
                      <h3 className="font-display text-lg font-semibold tracking-tight">{g.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{g.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Formular */}
          <ContactForm />
        </div>
      </div>
    </main>
  );
}
