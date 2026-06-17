"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Zap, Boxes } from "lucide-react";
import { brand } from "@/lib/data";
import { servicesByCategory } from "@/lib/services";
import { CameraIcon, ServerIcon, CubeIcon, BoltIcon, ShieldIcon } from "@/components/icons";
import Logo from "@/components/Logo";

const iconMap = { camera: CameraIcon, server: ServerIcon, cube: CubeIcon, bolt: BoltIcon, shield: ShieldIcon };
const serviceGroups = servicesByCategory();

// In-Page-Sektionen (Reihenfolge = Scroll-Reihenfolge der Startseite).
const sectionLinks = [
  { id: "ueber-uns", label: "Über uns" },
  { id: "warum", label: "Warum lokal" },
  { id: "ablauf", label: "Ablauf" },
  { id: "bewertungen", label: "Bewertungen" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false); // mobile sheet
  const [mobileSvc, setMobileSvc] = useState(false); // mobile: Dienstleistungen aufgeklappt
  const [servicesOpen, setServicesOpen] = useState(false); // desktop dropdown
  const pathname = usePathname();
  const servicesActive =
    pathname.startsWith("/leistungen") || pathname.startsWith("/konfigurator") || pathname.startsWith("/stromrechner");
  const blogActive = pathname.startsWith("/blog");
  const kontaktActive = pathname.startsWith("/kontakt");
  const [active, setActive] = useState<string>("");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scrollspy: aktive Sektion (nur auf der Startseite vorhanden).
  useEffect(() => {
    const els = sectionLinks
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Mobile-Sheet bei Routenwechsel schließen
  useEffect(() => { setOpen(false); setMobileSvc(false); }, [pathname]);

  function openServices() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setServicesOpen(true);
  }
  function closeServices() {
    closeTimer.current = setTimeout(() => setServicesOpen(false), 120);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className={`transition-colors duration-300 ${scrolled ? "border-b border-line bg-canvas/85 backdrop-blur-md" : "border-b border-transparent"}`}>
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4">
          <Link href="/" aria-label={brand.name} className="cursor-pointer">
            <Logo />
          </Link>

          {/* Desktop-Links */}
          <div className="hidden items-center gap-6 lg:flex xl:gap-8">
            {sectionLinks.map((l) => (
              <Link key={l.id} href={`/#${l.id}`} className="relative whitespace-nowrap py-1 eyebrow text-ink-soft transition-colors hover:text-ink">
                {l.label}
                <span className="absolute -bottom-0.5 left-0 h-0.5 rounded-full bg-accent transition-all duration-300" style={{ width: active === l.id ? "100%" : "0%" }} />
              </Link>
            ))}

            {/* Dienstleistungen — Mega-Dropdown */}
            <div className="relative" onMouseEnter={openServices} onMouseLeave={closeServices}>
              <button
                type="button"
                onClick={() => setServicesOpen((v) => !v)}
                aria-expanded={servicesOpen}
                className={`relative flex items-center gap-1 whitespace-nowrap py-1 eyebrow transition-colors hover:text-ink cursor-pointer ${servicesActive ? "text-accent" : "text-ink-soft"}`}
              >
                Dienstleistungen
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${servicesOpen ? "rotate-180" : ""}`} />
                <span className="absolute -bottom-0.5 left-0 h-0.5 rounded-full bg-accent transition-all duration-300" style={{ width: servicesActive ? "100%" : "0%" }} />
              </button>

              <div className={`absolute right-0 top-full pt-3 transition-all duration-200 ${servicesOpen ? "visible translate-y-0 opacity-100" : "pointer-events-none invisible translate-y-1 opacity-0"}`}>
                <div className="w-[40rem] max-w-[92vw] rounded-2xl border border-line bg-surface p-5 shadow-[0_22px_60px_-16px_rgba(33,28,23,0.22)]">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                    {serviceGroups.map((group) => (
                      <div key={group.category.key}>
                        <span className="block eyebrow text-accent">{group.category.label}</span>
                        <div className="mt-2.5 space-y-0.5">
                          {group.items.map((s) => {
                            const Icon = iconMap[s.icon];
                            return (
                              <Link
                                key={s.slug}
                                href={`/leistungen/${s.slug}`}
                                onClick={() => setServicesOpen(false)}
                                className="group/item flex items-start gap-2.5 rounded-xl p-2 transition-colors hover:bg-canvas cursor-pointer"
                              >
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent transition-colors group-hover/item:bg-accent group-hover/item:text-white">
                                  <Icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-medium leading-tight text-ink">{s.title}</span>
                                  <span className="block truncate text-xs text-muted">{s.tagline}</span>
                                </span>
                              </Link>
                            );
                          })}
                          {group.category.key === "energie" && (
                            <Link href="/stromrechner" onClick={() => setServicesOpen(false)} className="group/item flex items-center gap-2.5 rounded-xl p-2 text-accent transition-colors hover:bg-canvas cursor-pointer">
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft"><Zap className="h-4 w-4" /></span>
                              <span className="text-sm font-medium">Strom-Spar-Rechner</span>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/konfigurator"
                    onClick={() => setServicesOpen(false)}
                    className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent-ink transition-colors hover:bg-accent hover:text-white cursor-pointer"
                  >
                    <Boxes className="h-4 w-4" /> Eigenes Paket zusammenstellen
                  </Link>
                </div>
              </div>
            </div>

            <Link href="/blog" className={`relative py-1 eyebrow transition-colors hover:text-ink ${blogActive ? "text-accent" : "text-ink-soft"}`}>
              Blog
              <span className="absolute -bottom-0.5 left-0 h-0.5 rounded-full bg-accent transition-all duration-300" style={{ width: blogActive ? "100%" : "0%" }} />
            </Link>
          </div>

          {/* CTA + Mobile-Button */}
          <div className="flex items-center gap-2">
            <Link
              href="/kontakt"
              className={`hidden rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink sm:inline-block cursor-pointer ${kontaktActive ? "ring-2 ring-accent/40 ring-offset-2 ring-offset-canvas" : ""}`}
            >
              Anfrage stellen
            </Link>
            <button
              type="button"
              aria-label="Menü"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-surface lg:hidden cursor-pointer"
            >
              <span className="relative block h-3 w-4">
                <span className={`absolute left-0 h-0.5 w-4 bg-ink transition-all ${open ? "top-1.5 rotate-45" : "top-0"}`} />
                <span className={`absolute left-0 top-1.5 h-0.5 w-4 bg-ink transition-all ${open ? "opacity-0" : "opacity-100"}`} />
                <span className={`absolute left-0 h-0.5 w-4 bg-ink transition-all ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile sheet — übersichtlich gruppiert */}
      <div className={`border-b border-line bg-canvas/95 backdrop-blur-md transition-all duration-300 lg:hidden ${open ? "max-h-[85vh] overflow-y-auto opacity-100" : "max-h-0 overflow-hidden border-transparent opacity-0"}`}>
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4">
          <span className="px-1 pb-1 eyebrow text-muted">Entdecken</span>
          {sectionLinks.map((l) => (
            <Link key={l.id} href={`/#${l.id}`} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-ink-soft transition-colors hover:bg-surface hover:text-ink cursor-pointer">
              {l.label}
            </Link>
          ))}
          <Link href="/blog" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-ink-soft transition-colors hover:bg-surface hover:text-ink cursor-pointer">
            Blog
          </Link>

          {/* Dienstleistungen — aufklappbar */}
          <button
            type="button"
            onClick={() => setMobileSvc((v) => !v)}
            aria-expanded={mobileSvc}
            className="mt-2 flex items-center justify-between rounded-xl px-3 py-2.5 text-left font-medium text-ink transition-colors hover:bg-surface cursor-pointer"
          >
            Dienstleistungen
            <ChevronDown className={`h-4 w-4 text-muted transition-transform ${mobileSvc ? "rotate-180" : ""}`} />
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${mobileSvc ? "max-h-[40rem] opacity-100" : "max-h-0 opacity-0"}`}>
            <div className="space-y-1 pl-1">
              {serviceGroups.map((group) => (
                <div key={group.category.key} className="pt-1">
                  <span className="block px-3 pt-2 eyebrow text-accent">{group.category.label}</span>
                  {group.items.map((s) => {
                    const Icon = iconMap[s.icon];
                    return (
                      <Link key={s.slug} href={`/leistungen/${s.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-ink-soft transition-colors hover:bg-surface hover:text-ink cursor-pointer">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><Icon className="h-4 w-4" /></span>
                        {s.title}
                      </Link>
                    );
                  })}
                </div>
              ))}
              <Link href="/stromrechner" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-accent transition-colors hover:bg-surface cursor-pointer">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft"><Zap className="h-4 w-4" /></span>
                Strom-Spar-Rechner
              </Link>
              <Link href="/konfigurator" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium text-accent transition-colors hover:bg-surface cursor-pointer">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft"><Boxes className="h-4 w-4" /></span>
                Paket zusammenstellen
              </Link>
            </div>
          </div>

          <Link href="/kontakt" onClick={() => setOpen(false)} className="mt-4 rounded-full bg-accent px-4 py-3 text-center font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer">
            Anfrage stellen
          </Link>
        </div>
      </div>
    </header>
  );
}
