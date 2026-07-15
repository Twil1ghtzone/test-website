import type { Metadata } from "next";
import Link from "next/link";
import { MotionLink, pressable } from "@/components/ui/motion";
import Image from "next/image";
import { notFound } from "next/navigation";
import Placeholder from "@/components/Placeholder";
import { ArrowIcon, CheckIcon, CameraIcon, ServerIcon, CubeIcon, BoltIcon, ShieldIcon } from "@/components/icons";
import { services, getService, categories } from "@/lib/services";
import { brand } from "@/lib/data";

const iconMap = { camera: CameraIcon, server: ServerIcon, cube: CubeIcon, bolt: BoltIcon, shield: ShieldIcon };

export function generateStaticParams() {
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return {};
  return { title: `${service.pageTitle} — ${brand.name}`, description: service.tagline };
}

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const Icon = iconMap[service.icon];
  const category = categories.find((c) => c.key === service.category);
  const others = services.filter((s) => s.slug !== service.slug).slice(0, 3);

  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <Link href="/#leistungen" className="transition-colors hover:text-ink cursor-pointer">Leistungen</Link>
          <span>/</span>
          <span className="text-ink-soft">{service.title}</span>
        </nav>

        {/* ── HERO / ÜBERSCHRIFT ── */}
        <header className="mt-8 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 eyebrow text-accent">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white">
                <Icon className="h-5 w-5" />
              </span>
              {category?.label}
            </span>
            <h1 className="mt-5 font-display text-[1.9rem] font-semibold leading-[1.12] tracking-tight text-balance sm:text-4xl">
              {service.pageTitle}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">{service.tagline}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <MotionLink
                href="/konfigurator"
                {...pressable}
                className="group flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer"
              >
                Zum Konfigurator hinzufügen
                <ArrowIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </MotionLink>
              <MotionLink
                href="/kontakt"
                {...pressable}
                className="rounded-full border border-line-strong bg-surface px-6 py-3.5 font-medium text-ink transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer"
              >
                Anfragen
              </MotionLink>
            </div>
            {service.slug === "energie-management" && (
              <Link
                href="/stromrechner"
                className="mt-4 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-accent-ink cursor-pointer"
              >
                <span className="text-accent">⚡</span>
                Tipp: Sparpotenzial im Strom-Spar-Rechner schätzen
                <ArrowIcon className="h-4 w-4" />
              </Link>
            )}
          </div>
          {service.image ? (
            <div className="group relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line">
              <Image src={service.image} alt={service.pageTitle} fill sizes="(max-width: 1024px) 100vw, 480px" className="object-cover transition-transform duration-[700ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105" />
            </div>
          ) : (
            <Placeholder caption={service.imageCaption} ratio="aspect-[4/3]" className="w-full" />
          )}
        </header>

        {/* ── ÜBERBLICK ── */}
        <section className="mt-20 border-t border-line pt-12">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Überblick</h2>
            <p className="text-lg leading-relaxed text-ink-soft">{service.intro}</p>
          </div>
        </section>

        {/* ── DAS IST DABEI / IHR VORTEIL ── */}
        <section className="mt-16 grid gap-10 md:grid-cols-2">
          <div className="rounded-3xl border border-line bg-surface p-7">
            <span className="eyebrow text-accent">Das ist dabei</span>
            <ul className="mt-5 space-y-3">
              {service.points.map((p) => (
                <li key={p} className="flex gap-3 leading-relaxed text-ink-soft">
                  <span className="mt-0.5 shrink-0 text-accent"><CheckIcon className="h-5 w-5" /></span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-3xl border border-line bg-surface p-7">
            <span className="eyebrow text-accent">Ihr Vorteil</span>
            <ul className="mt-5 space-y-3">
              {service.outcomes.map((o) => (
                <li key={o} className="flex gap-3 leading-relaxed text-ink-soft">
                  <span className="mt-0.5 shrink-0 text-accent"><CheckIcon className="h-5 w-5" /></span>
                  {o}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── BILDERGALERIE (Slots für Fotos) ── */}
        <section className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Eindrücke</h2>
            <span className="text-sm text-muted">Platzhalter — später mit eigenen Fotos füllen</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {service.gallery.map((caption, i) => (
              <Placeholder
                key={i}
                caption={caption}
                ratio={i === 0 ? "aspect-[4/3]" : "aspect-square"}
                className="w-full"
              />
            ))}
          </div>
        </section>

        {/* ── CTA-BAND ── */}
        <section className="mt-20 overflow-hidden rounded-[2rem] bg-night px-8 py-12 text-center text-canvas sm:px-14">
          <h2 className="mx-auto max-w-xl font-display text-3xl font-semibold leading-[1.1] tracking-tight">
            Interesse an <span className="emph">{service.title}</span>?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/70">Jedes Haus ist anders — Sie erhalten ein unverbindliches Angebot auf Anfrage.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <MotionLink href="/kontakt" {...pressable} className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-night cursor-pointer">
              Unverbindlich anfragen
              <ArrowIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </MotionLink>
            <MotionLink href="/konfigurator" {...pressable} className="rounded-full border border-white/20 px-7 py-3.5 font-medium text-canvas transition-colors hover:border-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-night cursor-pointer">
              Paket zusammenstellen
            </MotionLink>
          </div>
        </section>

        {/* ── WEITERE LEISTUNGEN ── */}
        <section className="mt-16">
          <span className="eyebrow text-accent">Weitere Leistungen</span>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {others.map((o) => {
              const OIcon = iconMap[o.icon];
              return (
                <Link
                  key={o.slug}
                  href={`/leistungen/${o.slug}`}
                  className="group rounded-2xl border border-line bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_22px_50px_-22px_rgba(176,84,58,0.4)] cursor-pointer"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-white">
                    <OIcon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-semibold leading-tight tracking-tight">{o.title}</h3>
                  <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent">
                    Ansehen
                    <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
