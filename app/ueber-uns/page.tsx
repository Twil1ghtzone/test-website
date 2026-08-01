import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, X, MapPin, Mail, Phone } from "lucide-react";
import Placeholder from "@/components/Placeholder";
import Reveal from "@/components/Reveal";
import { GlowCard } from "@/components/ui/spotlight-card";
import { MotionLink, Magnetic, Tilt, pressable } from "@/components/ui/motion";
import { about, process } from "@/lib/data";
import { readContent } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const c = readContent();
  const titel = `Über uns — ${c.companyName}`;
  const beschreibung =
    "Elektrotechnik, IT, Smart-Home und Fertigung aus einer Hand — wie wir arbeiten, warum wir auf lokale Technik statt Cloud setzen und was wir bewusst nicht anbieten.";
  return {
    title: titel,
    description: beschreibung,
    openGraph: {
      title: titel,
      description: beschreibung,
      url: "/ueber-uns",
      images: [{ url: about.image, alt: about.imageAlt }],
    },
  };
}

/*
 * Was wir bewusst NICHT machen.
 *
 * Der wirksamste Vertrauensbaustein auf einer Handwerker-Seite: Wer Grenzen
 * offen benennt, wirkt glaubwürdiger als jemand, der alles verspricht. Es
 * qualifiziert zugleich Anfragen vor — wer etwas anderes sucht, merkt es hier
 * statt nach zwei Terminen.
 */
const grenzen = [
  {
    nein: "Keine Abo-Modelle",
    ja: "Sie zahlen einmal für Material und Arbeit. Danach gehört die Anlage Ihnen — ohne monatliche Gebühr an uns oder einen Hersteller.",
  },
  {
    nein: "Keine Cloud-Kameras",
    ja: "Systeme, die Bilder zwingend auf Herstellerserver laden, bauen wir nicht ein — auch nicht auf Wunsch. Wir erklären gern, warum.",
  },
  {
    nein: "Keine geschlossenen Systeme",
    ja: "Wir setzen auf offene Standards (Home Assistant, ONVIF/RTSP, Docker, Linux). Jeder andere Fachbetrieb kann Ihre Anlage übernehmen.",
  },
  {
    nein: "Keine Rechtsberatung",
    ja: "Bei Videoüberwachung weisen wir auf Ihre Pflichten hin und richten Erfassungsbereiche korrekt aus. Juristische Grenzfälle klären Sie mit einem Anwalt.",
  },
];

export default function UeberUnsPage() {
  const c = readContent();

  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <div className="mx-auto max-w-5xl">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <span className="text-ink-soft">Über uns</span>
        </nav>

        {/* ── Kopf ── */}
        <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <span className="eyebrow text-accent">{about.eyebrow}</span>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.8rem]">
              {about.titleLead} <span className="emph">{about.titleEmph}</span> {about.titleTail}
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">{about.body}</p>
          </Reveal>
          <Reveal delay={140}>
            <Placeholder
              src={about.image}
              alt={about.imageAlt}
              caption={about.imageCaption}
              ratio="aspect-[4/3]"
              rounded="rounded-3xl"
              sizes="(max-width: 1024px) 100vw, 40vw"
              priority
            />
          </Reveal>
        </div>

        {/* ── Fachbereiche ── */}
        <section className="mt-16">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Diese Gewerke kommen aus einer Hand</h2>
            <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
              Sonst müssten Sie dafür mehrere Betriebe beauftragen und zwischen ihnen koordinieren —
              genau an diesen Schnittstellen entstehen erfahrungsgemäß die meisten Probleme.
            </p>
          </Reveal>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {about.roles.map((r, i) => (
              <Reveal key={r.role} delay={i * 100} className="h-full">
                <GlowCard className="flex h-full flex-col overflow-hidden rounded-3xl">
                  <Placeholder
                    src={r.image}
                    alt={r.imageAlt}
                    caption={r.imageCaption}
                    ratio="aspect-[16/10]"
                    rounded="rounded-none"
                    sizes="(max-width: 640px) 100vw, 45vw"
                  />
                  <div className="p-5">
                    <h3 className="font-display text-lg font-semibold tracking-tight">{r.role}</h3>
                    <p className="mt-0.5 eyebrow text-muted">{r.sub}</p>
                    <p className="mt-2.5 leading-relaxed text-ink-soft">{r.body}</p>
                  </div>
                </GlowCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Klare Grenzen ── */}
        <section className="mt-16">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight">Was wir bewusst nicht machen</h2>
            <p className="mt-2 max-w-2xl leading-relaxed text-ink-soft">
              Ein Betrieb, der alles verspricht, hat sich noch nicht entschieden. Diese vier Punkte
              sind der Grund, warum Kunden zu uns kommen — und warum wir gelegentlich Aufträge ablehnen.
            </p>
          </Reveal>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {grenzen.map((g, i) => (
              <Reveal key={g.nein} delay={i * 90} className="h-full">
                <div className="h-full rounded-2xl border border-line bg-surface p-5 transition-shadow duration-300 hover:shadow-[0_18px_44px_-24px_rgba(33,28,23,0.22)]">
                  <p className="flex items-center gap-2 font-medium text-ink">
                    <Tilt>
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                        <X className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>
                    </Tilt>
                    {g.nein}
                  </p>
                  <p className="mt-2.5 flex items-start gap-2 leading-relaxed text-ink-soft">
                    <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-white">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span>{g.ja}</span>
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ── Ablauf ── */}
        <section className="mt-16">
          <Reveal>
            <h2 className="font-display text-2xl font-semibold tracking-tight">So läuft eine Zusammenarbeit ab</h2>
          </Reveal>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {process.map((p, i) => (
              <Reveal key={p.step} delay={i * 90} className="h-full" as="li">
                <div className="h-full rounded-2xl border border-line bg-surface p-5 transition-shadow duration-300 hover:shadow-[0_18px_44px_-24px_rgba(33,28,23,0.22)]">
                  <span className="font-display text-sm font-semibold text-accent-ink">{p.step}</span>
                  <h3 className="mt-1.5 font-display text-lg font-semibold leading-tight tracking-tight">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </ol>
          <p className="mt-4 text-sm text-muted">
            Gespräch, Besichtigung und Angebot sind kostenlos und unverbindlich.
          </p>
        </section>

        {/* ── Kontakt ── */}
        <Reveal as="section" className="mt-16 block rounded-3xl border border-line bg-night p-7 text-canvas sm:p-9">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight">Lernen wir uns kennen.</h2>
              <p className="mt-2 max-w-xl leading-relaxed text-white/65">
                Erzählen Sie uns kurz, was Ihnen vorschwebt — oder fragen Sie einfach, ob das
                bei Ihnen überhaupt sinnvoll ist. Wir antworten persönlich und ohne Verkaufsdruck.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Magnetic strength={9} className="inline-block">
                  <MotionLink
                    href="/kontakt"
                    {...pressable}
                    className="btn-sheen group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer"
                  >
                    Unverbindlich anfragen
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </MotionLink>
                </Magnetic>
                <Link
                  href="/faq"
                  className="rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-canvas transition-colors hover:border-white/60 hover:bg-white/5 cursor-pointer"
                >
                  Häufige Fragen
                </Link>
              </div>
            </div>
            <dl className="space-y-3 text-sm lg:border-l lg:border-white/10 lg:pl-8">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0 text-accent" />
                <a href={`mailto:${c.email}`} className="link-underline text-white/75 cursor-pointer">{c.email}</a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0 text-accent" />
                <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="link-underline text-white/75 cursor-pointer">{c.phone}</a>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 shrink-0 text-accent" />
                <span className="text-white/75">{c.region}</span>
              </div>
            </dl>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
