import type { Metadata } from "next";
import Link from "next/link";
import { HelpCircle, ArrowRight, ChevronDown, Zap, ShieldCheck } from "lucide-react";
import Reveal from "@/components/Reveal";
import { MotionLink, Magnetic, Tilt, pressable } from "@/components/ui/motion";
import { faqGruppen, alleFragen } from "@/lib/faq";
import { readContent } from "@/lib/server/store";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const c = readContent();
  const titel = `Häufige Fragen — ${c.companyName}`;
  const beschreibung =
    "Was kostet das? Was passiert bei Internetausfall? Wo landen meine Kamerabilder? Ehrliche Antworten auf die Fragen, die im Erstgespräch immer wieder kommen.";
  return {
    title: titel,
    description: beschreibung,
    openGraph: { title: titel, description: beschreibung, url: "/faq" },
  };
}

export default function FaqPage() {
  const c = readContent();

  /*
   * Strukturierte Daten (FAQPage). Damit kann Google einzelne Fragen direkt
   * im Suchergebnis ausklappen — für Longtail-Suchen ("smart home ohne cloud
   * internetausfall") der wirksamste Hebel, den eine kleine Seite hat.
   * Als JSON-LD im <script type="application/ld+json">; die strenge CSP
   * erlaubt das, weil es kein ausführbares Skript ist.
   */
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: alleFragen.map((f) => ({
      "@type": "Question",
      name: f.frage,
      acceptedAnswer: { "@type": "Answer", text: f.antwort },
    })),
  };

  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="mx-auto max-w-4xl">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <span className="text-ink-soft">Häufige Fragen</span>
        </nav>

        <Reveal className="mt-8 block max-w-2xl">
          <span className="inline-flex items-center gap-2 eyebrow text-accent">
            <Tilt>
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white">
                <HelpCircle className="h-5 w-5" />
              </span>
            </Tilt>
            Häufige Fragen
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.8rem]">
            Fragen, die <span className="emph">wirklich gestellt werden.</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Keine Werbetexte, sondern die Antworten aus unseren Erstgesprächen — auch dort,
            wo die ehrliche Antwort „das geht nicht" oder „das müssen Sie zusätzlich klären" lautet.
          </p>
        </Reveal>

        <div className="mt-12 space-y-10">
          {faqGruppen.map((g, gi) => (
            <Reveal key={g.key} delay={gi * 80} as="section" className="block">
              <h2 className="font-display text-xl font-semibold tracking-tight">{g.titel}</h2>
              <div className="mt-4 space-y-2.5">
                {g.fragen.map((f) => (
                  <details
                    key={f.frage}
                    className="group rounded-2xl border border-line bg-surface px-5 transition-all duration-300 hover:border-line-strong hover:shadow-[0_14px_36px_-26px_rgba(33,28,23,0.35)]"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left">
                      <span className="font-medium leading-snug text-ink transition-colors group-open:text-accent-ink">{f.frage}</span>
                      <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
                    </summary>
                    <p className="pb-4 pr-9 leading-relaxed text-ink-soft">{f.antwort}</p>
                  </details>
                ))}
              </div>
            </Reveal>
          ))}
        </div>

        {/* Weiterführend statt Sackgasse */}
        <div className="mt-12 grid gap-3 sm:grid-cols-2">
          {[
            { href: "/stromrechner", Icon: Zap, titel: "Was kann ich sparen?", text: "Energie-Spar-Rechner mit ehrlicher Gegenrechnung — in zwei Minuten." },
            { href: "/ueber-uns", Icon: ShieldCheck, titel: "Wer steckt dahinter?", text: "Wie wir arbeiten, warum lokal — und was wir bewusst nicht anbieten." },
          ].map((k, i) => (
            <Reveal key={k.href} delay={i * 100} className="h-full">
              <Link
                href={k.href}
                className="group flex h-full items-start gap-3.5 rounded-2xl border border-line bg-surface p-5 transition-all duration-300 hover:border-accent hover:shadow-[0_18px_44px_-24px_rgba(33,28,23,0.25)] cursor-pointer"
              >
                <Tilt>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                    <k.Icon className="h-5 w-5" />
                  </span>
                </Tilt>
                <span>
                  <span className="block font-medium text-ink">{k.titel}</span>
                  <span className="mt-0.5 block text-sm leading-snug text-muted">{k.text}</span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>

        <Reveal className="mt-10 block rounded-3xl border border-line bg-night p-7 text-canvas sm:p-9">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Ihre Frage war nicht dabei?</h2>
          <p className="mt-2 max-w-xl leading-relaxed text-white/65">
            Schreiben Sie uns einfach — wir antworten persönlich und ohne Verkaufsdruck.
            Erstgespräch und Angebot sind kostenlos.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Magnetic strength={9} className="inline-block">
              <MotionLink
                href="/kontakt"
                {...pressable}
                className="btn-sheen group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer"
              >
                Frage stellen
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </MotionLink>
            </Magnetic>
            <a
              href={`tel:${c.phone.replace(/\s/g, "")}`}
              className="rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-canvas transition-colors hover:border-white/60 hover:bg-white/5 cursor-pointer"
            >
              {c.phone}
            </a>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
