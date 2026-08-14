import type { Metadata } from "next";
import Link from "next/link";
import {
  Mail, Phone, MapPin, Clock, Tag, ListChecks, ShieldCheck,
  MessageCircle, CalendarCheck, FileText, HelpCircle, Zap,
} from "lucide-react";
import ContactForm from "@/components/ContactForm";
import Reveal from "@/components/Reveal";
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

/*
 * Die drei Zusagen ganz oben.
 *
 * Das ist die Stelle, an der Besucher abspringen: Ein Formular wirkt wie eine
 * Verpflichtung, und niemand weiß, was danach passiert. Diese Zeile nimmt
 * genau diese drei Sorgen vorweg, bevor das erste Feld überhaupt sichtbar ist.
 */
const zusagen = [
  { icon: ShieldCheck, titel: "Unverbindlich", text: "Anfrage, Gespräch und Angebot kosten nichts." },
  { icon: Clock, titel: "Antwort in 1–2 Tagen", text: "Persönlich, von einem von uns beiden." },
  { icon: MessageCircle, titel: "Kein Verkaufsdruck", text: "Wir sagen auch, wenn sich etwas nicht lohnt." },
];

/* Was nach dem Absenden passiert — nimmt die Unsicherheit vor dem Klick. */
const ablauf = [
  { icon: Mail, titel: "Wir melden uns", text: "Meist innerhalb von ein bis zwei Werktagen, per E-Mail oder Telefon — wie es Ihnen lieber ist." },
  { icon: CalendarCheck, titel: "Wir schauen es uns an", text: "Ein kurzer Termin bei Ihnen vor Ort. Jedes Gebäude ist anders, aus der Ferne raten wir nicht." },
  { icon: FileText, titel: "Sie bekommen ein Angebot", text: "Schriftlich, mit klaren Posten. Erst wenn Sie zusagen, entstehen Kosten." },
];

const goodToKnow = [
  { icon: Tag, title: "Preis auf Anfrage", body: "Jedes Haus und Netzwerk ist anders — feste Pakete gibt es deshalb nicht. Eine erste Größenordnung finden Sie in den häufigen Fragen." },
  { icon: ListChecks, title: "Das hilft uns weiter", body: "Beschreiben Sie kurz Ihr Vorhaben: Räume, Anzahl Kameras, gewünschte Dienste oder einfach Ihr Ziel — wir melden uns persönlich." },
];

export default function KontaktPage() {
  const c = readContent();

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
        <Reveal className="mt-8 block max-w-2xl">
          <span className="eyebrow text-accent">{contact.eyebrow}</span>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Sprechen wir über <span className="emph">Ihr Zuhause.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">{contact.body}</p>
        </Reveal>

        {/* Zusagen — direkt unter der Überschrift, vor dem Formular */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {zusagen.map((z, i) => (
            <Reveal key={z.titel} delay={i * 90} className="h-full">
              <div className="flex h-full items-start gap-3 rounded-2xl border border-line bg-surface p-4">
                <Tilt>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    <z.icon className="h-4 w-4" />
                  </span>
                </Tilt>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{z.titel}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted">{z.text}</span>
                </span>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Formular groß, Kontaktwege daneben */}
        <div className="mt-12 grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Formular zuerst im Quelltext = auf dem Handy oben */}
          <Reveal className="block">
            <ContactForm />
          </Reveal>

          <div className="space-y-6 lg:sticky lg:top-28">
            {/* Direkter Draht — für alle, die kein Formular mögen */}
            <Reveal className="block">
              <div className="overflow-hidden rounded-3xl border border-line bg-night text-canvas">
                <div className="p-6">
                  <h2 className="font-display text-lg font-semibold tracking-tight">Lieber direkt?</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/60">
                    Ein Anruf ist oft schneller als jedes Formular.
                  </p>
                  <div className="mt-5 space-y-2">
                    <a
                      href={`tel:${c.phone.replace(/\s/g, "")}`}
                      className="group flex items-center gap-3 rounded-2xl bg-white/5 p-3.5 transition-colors hover:bg-white/10 cursor-pointer"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-white">
                        <Phone className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-white/50">Anrufen</span>
                        <span className="block truncate font-medium">{c.phone}</span>
                      </span>
                    </a>
                    <a
                      href={`mailto:${c.email}`}
                      className="group flex items-center gap-3 rounded-2xl bg-white/5 p-3.5 transition-colors hover:bg-white/10 cursor-pointer"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-white">
                        <Mail className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs text-white/50">E-Mail schreiben</span>
                        <span className="block truncate font-medium">{c.email}</span>
                      </span>
                    </a>
                  </div>
                  <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 shrink-0 text-accent" />
                      <dd className="text-white/70">{c.region}</dd>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Clock className="h-4 w-4 shrink-0 text-accent" />
                      <dd className="text-white/70">Antwort in der Regel in 1–2 Werktagen</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </Reveal>

            {/* Was danach passiert */}
            <Reveal delay={100} className="block">
              <div className="rounded-3xl border border-line bg-surface p-6">
                <h2 className="font-display text-lg font-semibold tracking-tight">So geht es weiter</h2>
                <ol className="mt-4 space-y-4">
                  {ablauf.map((s, i) => (
                    <li key={s.titel} className="flex gap-3.5">
                      <span className="relative flex flex-col items-center">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft font-display text-xs font-semibold text-accent-ink">
                          {i + 1}
                        </span>
                        {i < ablauf.length - 1 && <span className="mt-1 w-px flex-1 bg-line" />}
                      </span>
                      <span className="pb-1">
                        <span className="block font-medium text-ink">{s.titel}</span>
                        <span className="mt-0.5 block text-sm leading-relaxed text-ink-soft">{s.text}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>

            {/* Gut zu wissen */}
            <Reveal delay={160} className="block">
              <div className="space-y-3">
                {goodToKnow.map((g) => (
                  <div key={g.title} className="flex gap-3.5 rounded-2xl border border-line bg-surface p-5">
                    <Tilt className="shrink-0">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-canvas">
                        <g.icon className="h-5 w-5" />
                      </span>
                    </Tilt>
                    <div>
                      <h3 className="font-display text-base font-semibold tracking-tight">{g.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-soft">{g.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>

        {/* Noch unsicher? — Ausweg statt Sackgasse */}
        <Reveal className="mt-14 block">
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/faq"
              className="group flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-5 transition-all duration-300 hover:border-accent hover:shadow-[0_18px_44px_-24px_rgba(33,28,23,0.25)] cursor-pointer"
            >
              <Tilt>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <HelpCircle className="h-5 w-5" />
                </span>
              </Tilt>
              <span>
                <span className="block font-medium text-ink">Erst noch Fragen klären?</span>
                <span className="mt-0.5 block text-sm leading-snug text-muted">
                  Kosten, Internetausfall, Miete — ehrliche Antworten auf die häufigsten Fragen.
                </span>
              </span>
            </Link>
            <Link
              href="/stromrechner"
              className="group flex items-start gap-3.5 rounded-2xl border border-line bg-surface p-5 transition-all duration-300 hover:border-accent hover:shadow-[0_18px_44px_-24px_rgba(33,28,23,0.25)] cursor-pointer"
            >
              <Tilt>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Zap className="h-5 w-5" />
                </span>
              </Tilt>
              <span>
                <span className="block font-medium text-ink">Erst rechnen, dann fragen?</span>
                <span className="mt-0.5 block text-sm leading-snug text-muted">
                  Der Energie-Spar-Rechner zeigt in zwei Minuten Ihre Größenordnung.
                </span>
              </span>
            </Link>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
