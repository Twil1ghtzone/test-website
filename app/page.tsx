import Link from "next/link";
import Image from "next/image";
import Reveal from "@/components/Reveal";
import Placeholder from "@/components/Placeholder";
import Hero from "@/components/Hero";
import { GlowCard } from "@/components/ui/spotlight-card";
import Bucket from "@/components/ui/bucket";
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient";
import PathCards from "@/components/PathCards";
import ProcessReveal from "@/components/ProcessReveal";
import { LinkPreview } from "@/components/ui/link-preview";
import { MotionLink, pressable } from "@/components/ui/motion";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import Testimonials from "@/components/TestimonialsLazy";
import { ArrowIcon, CheckIcon } from "@/components/icons";
import { pillarIcons } from "@/components/icons";
import { Leaf, PiggyBank, Lock, Home as HomeIcon } from "lucide-react";
import { about, pillars, featured } from "@/lib/data";

const promiseCards = [
  { icon: Leaf, title: "Energie sparen", body: "Heizung und Licht regeln sich clever — das senkt den Verbrauch spürbar." },
  { icon: PiggyBank, title: "100 % abofrei", body: "Einmal sauber eingerichtet, dauerhaft Ihres. Keine monatlichen Gebühren." },
  { icon: Lock, title: "Maximale Privatsphäre", body: "Alle Daten bleiben im Haus — technisch erzwungen, nicht nur versprochen." },
  { icon: HomeIcon, title: "Unabhängig", body: "Frei von Cloud und Konzernen. Die volle Kontrolle bleibt bei Ihnen." },
];

export default function Home() {
  return (
    <main id="top">
        {/* ───────────────────────── HERO (Scroll-Reveal) ───────────────────────── */}
        <Hero />

        {/* ───────────────── MARQUEE / WERTE-BAND ───────────────── */}
        <div className="overflow-hidden bg-accent py-3.5 text-white">
          <div className="marquee-track">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
                {["Energie sparen", "Unabhängig werden", "100 % Abofrei", "Daten bleiben im Haus", "Cloud-frei", "Aus einer Hand"].map((t) => (
                  <span key={t} className="flex items-center">
                    <span className="px-6 font-display text-lg italic">{t}</span>
                    <span className="text-white/50">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ───────────────────────── ÜBER UNS / DUO ───────────────────────── */}
        <section id="ueber-uns" className="px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <Reveal>
                <Placeholder caption={about.imageCaption} ratio="aspect-[5/4]" className="w-full" />
              </Reveal>
              <Reveal delay={120}>
                <span className="eyebrow text-accent">{about.eyebrow}</span>
                <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
                  {about.titleLead} <span className="emph">{about.titleEmph}</span> {about.titleTail}
                </h2>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-soft">{about.body}</p>
                <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
                  Neugierig, was möglich ist? Entdecken Sie alle unsere{" "}
                  <LinkPreview url="#bereiche" imageSrc="/handwerk.webp" className="font-semibold">
                    Dienstleistungen
                  </LinkPreview>
                  .
                </p>
              </Reveal>
            </div>

            {/* Rollen-Karten */}
            <div className="mt-14 grid gap-6 md:grid-cols-2">
              {about.roles.map((r, i) => (
                <Reveal key={r.role} delay={i * 100} className="h-full">
                  <GlowCard className="flex h-full flex-col gap-5 rounded-3xl p-5 sm:flex-row sm:p-6">
                    <Placeholder caption={r.imageCaption} ratio="aspect-square" rounded="rounded-2xl" className="sm:w-40 sm:shrink-0" />
                    <div className="flex flex-col justify-center">
                      <span className="eyebrow text-muted">{r.sub}</span>
                      <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">{r.role}</h3>
                      <p className="mt-2 leading-relaxed text-ink-soft">{r.body}</p>
                    </div>
                  </GlowCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────────── DREI WEGE (Choose your path) ───────────────── */}
        <section id="bereiche" className="px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              eyebrow="Was wir tun"
              lead="Drei Wege zu einem"
              emph="besseren Zuhause."
            />
            <PathCards />
          </div>
        </section>

        {/* ───────────────── VERGANGENHEIT (Bucket-Gimmick) ───────────────── */}
        <section className="px-5 py-16">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <span className="eyebrow text-accent">Schluss damit</span>
              <h2 className="mt-4 font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.6rem]">
                Das gehört zur <span className="emph">Vergangenheit.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-lg leading-relaxed text-ink-soft">
                Monatliche Gebühren, Werbung, Daten auf fremden Servern — all das werfen
                wir über Bord. Ihr Zuhause arbeitet künftig für Sie, nicht für die Konzerne.
                Wie viel drin ist, zeigt der{" "}
                <LinkPreview url="/stromrechner" imageSrc="/energie.webp" className="font-semibold">
                  Strom-Spar-Rechner
                </LinkPreview>
                .
              </p>
            </Reveal>
            <Reveal delay={120}>
              <div className="mx-auto mt-20 max-w-[420px] sm:mt-24">
                <Bucket />
              </div>
            </Reveal>
            <Reveal delay={200}>
              <MotionLink
                href="#warum"
                {...pressable}
                className="group mt-2 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer"
              >
                Warum lokal besser ist
                <ArrowIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </MotionLink>
            </Reveal>
          </div>
        </section>

        {/* ───────────────── FEATURED: ENERGIE / UNABHÄNGIGKEIT ───────────────── */}
        <section id="warum" className="px-5 py-12">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-night text-canvas">
            <div className="grid gap-0 lg:grid-cols-2">
              <Reveal className="order-2 p-9 sm:p-14 lg:order-1">
                <span className="eyebrow text-accent">{featured.eyebrow}</span>
                <h2 className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-[3rem]">
                  Energie sparen.
                  <br />
                  <span className="emph">Unabhängig</span> werden.
                </h2>
                <p className="mt-6 max-w-md leading-relaxed text-white/70">{featured.body}</p>
                <ul className="mt-7 space-y-3">
                  {featured.bullets.map((b) => (
                    <li key={b} className="flex gap-3 text-white/85">
                      <span className="mt-0.5 shrink-0 text-accent"><CheckIcon className="h-5 w-5" /></span>
                      {b}
                    </li>
                  ))}
                </ul>
                <MotionLink
                  href="/kontakt"
                  {...pressable}
                  className="group mt-9 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer"
                >
                  Jetzt anfragen
                  <ArrowIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </MotionLink>
              </Reveal>
              <div className="relative order-1 min-h-[20rem] lg:order-2">
                <Image src="/energie.webp" alt="Smarte Heizungssteuerung in einem warmen Wohnraum" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              </div>
            </div>
          </div>
        </section>

        {/* ───────────────────────── LEISTUNGEN (Detail) ───────────────────────── */}
        <section id="leistungen" className="px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              eyebrow="Leistungen im Detail"
              lead="Sauberes Handwerk,"
              emph="durchdachte Technik."
              text="Von der ersten Kabelverlegung bis zum fertig eingerichteten Server — alles aus einer Hand, alles bei Ihnen im Haus."
            />
            <Reveal className="mt-10">
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl border border-line">
                <Image src="/handwerk.webp" alt="Saubere PoE-Verkabelung neben Patchpanel und Netzwerk-Dashboard" fill sizes="(max-width: 768px) 100vw, 1152px" className="object-cover" />
              </div>
            </Reveal>
            <div className="mt-16 space-y-20">
              {pillars.map((pillar, i) => {
                const Icon = pillarIcons[i];
                const flip = i % 2 === 1;
                return (
                  <Reveal key={pillar.no}>
                    <article className="grid items-center gap-10 lg:grid-cols-2">
                      <div className={flip ? "lg:order-2" : ""}>
                        <Placeholder caption={pillar.imageCaption} ratio="aspect-[4/3]" className="w-full" />
                      </div>
                      <div className={flip ? "lg:order-1" : ""}>
                        <div className="flex items-center gap-4">
                          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-white">
                            <Icon className="h-6 w-6" />
                          </span>
                          <span className="eyebrow text-muted">{pillar.kicker}</span>
                        </div>
                        <h3 className="mt-5 font-display text-3xl font-semibold leading-tight tracking-tight">
                          {pillar.title}
                        </h3>
                        <p className="mt-3 text-lg text-ink-soft">{pillar.intro}</p>
                        <ul className="mt-6 space-y-3 border-t border-line pt-6">
                          {pillar.points.map((pt) => (
                            <li key={pt} className="flex gap-3 leading-relaxed text-ink-soft">
                              <span className="mt-0.5 shrink-0 text-accent"><CheckIcon className="h-5 w-5" /></span>
                              {pt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────────────────── ABLAUF ───────────────────────── */}
        <section id="ablauf" className="bg-surface-2 px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <SectionHead
              eyebrow="So arbeiten wir"
              lead="Vom Gespräch bis zur"
              emph="Übergabe."
              text="Klar strukturiert und koordiniert aus einer Hand — Sie haben einen Ansprechpartner für alles."
            />
            <ProcessReveal />
          </div>
        </section>

        {/* ───────────────── VERSPRECHEN ───────────────── */}
        <section className="px-5 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <div className="mb-10 text-center">
                <span className="eyebrow text-accent">Unser Versprechen</span>
                <h2 className="mt-3 font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.6rem]">
                  Vier Dinge, die <span className="emph">immer</span> gelten.
                </h2>
              </div>
            </Reveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {promiseCards.map((p, i) => {
                const Icon = p.icon;
                return (
                  <Reveal key={p.title} delay={i * 90} className="h-full">
                    <CardContainer containerClassName="h-full" className="h-full w-full">
                      <CardBody className="group/card h-full w-full rounded-3xl border border-line bg-surface p-6 transition-shadow duration-300 hover:border-accent/40 hover:shadow-[0_26px_60px_-24px_rgba(176,84,58,0.5)]">
                        <CardItem translateZ={60} className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent transition-colors duration-300 group-hover/card:bg-accent group-hover/card:text-white">
                          <Icon className="h-6 w-6" />
                        </CardItem>
                        <CardItem as="h3" translateZ={45} className="mt-5 w-full font-display text-lg font-semibold tracking-tight">{p.title}</CardItem>
                        <CardItem as="p" translateZ={30} className="mt-2 w-full text-sm leading-relaxed text-ink-soft">{p.body}</CardItem>
                      </CardBody>
                    </CardContainer>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ───────────────────────── KUNDENSTIMMEN ───────────────────────── */}
        <Testimonials />

        {/* ───────────────── ABSCHLUSS-CTA ───────────────── */}
        <section className="px-5 pb-24">
          <Reveal>
            <div className="mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-night px-8 py-16 text-center text-canvas sm:px-14">
              <span className="eyebrow text-accent">Bereit?</span>
              <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.8rem]">
                Sprechen wir über <span className="emph">Ihr Zuhause.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md leading-relaxed text-white/70">
                Erzählen Sie uns kurz Ihr Vorhaben — wir melden uns persönlich mit einem
                unverbindlichen Angebot.
              </p>
              <div className="mt-8 flex justify-center">
                <MotionLink href="/kontakt" {...pressable} className="group cursor-pointer">
                  <HoverBorderGradient as="span" tone="dark" className="flex items-center gap-2">
                    Zum Kontakt
                    <ArrowIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </HoverBorderGradient>
                </MotionLink>
              </div>
            </div>
          </Reveal>
        </section>
      </main>
  );
}

function SectionHead({
  eyebrow,
  lead,
  emph,
  text,
}: {
  eyebrow: string;
  lead: string;
  emph: string;
  text?: string;
}) {
  return (
    <Reveal>
      <div className="max-w-2xl">
        <span className="eyebrow text-accent">{eyebrow}</span>
        <h2 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-[3rem]">
          {lead} <span className="emph">{emph}</span>
        </h2>
        {text && <p className="mt-5 text-lg leading-relaxed text-ink-soft">{text}</p>}
      </div>
    </Reveal>
  );
}
