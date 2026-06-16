"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { brand } from "@/lib/data";
import { servicesByCategory } from "@/lib/services";
import Logo from "@/components/Logo";

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
  const [servicesOpen, setServicesOpen] = useState(false); // desktop dropdown
  const pathname = usePathname();
  const servicesActive =
    pathname.startsWith("/leistungen") || pathname.startsWith("/konfigurator") || pathname.startsWith("/stromrechner");
  const kontaktActive = pathname.startsWith("/kontakt");
  const [active, setActive] = useState<string>("");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scrollspy: aktive Sektion bestimmen (nur auf der Startseite vorhanden).
  useEffect(() => {
    const els = sectionLinks
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  function openServices() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setServicesOpen(true);
  }
  function closeServices() {
    closeTimer.current = setTimeout(() => setServicesOpen(false), 120);
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`transition-colors duration-300 ${
          scrolled ? "border-b border-line bg-canvas/85 backdrop-blur-md" : "border-b border-transparent"
        }`}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4">
          {/* Marke */}
          <Link href="/" aria-label={brand.name} className="cursor-pointer">
            <Logo />
          </Link>

          {/* Links-Reihe (gleichmäßige Abstände) */}
          <div className="hidden items-center gap-8 lg:flex">
            {sectionLinks.map((l) => (
              <Link
                key={l.id}
                href={`/#${l.id}`}
                className="relative py-1 eyebrow text-ink-soft transition-colors hover:text-ink"
              >
                {l.label}
                {/* animierter Strich unter dem aktiven Punkt */}
                <span
                  className="absolute -bottom-0.5 left-0 h-0.5 rounded-full bg-accent transition-all duration-300"
                  style={{ width: active === l.id ? "100%" : "0%" }}
                />
              </Link>
            ))}

            {/* Dienstleistungen — horizontales Mega-Dropdown */}
            <div className="relative" onMouseEnter={openServices} onMouseLeave={closeServices}>
              <button
                type="button"
                onClick={() => setServicesOpen((v) => !v)}
                aria-expanded={servicesOpen}
                aria-haspopup="true"
                className={`relative flex items-center gap-1 py-1 eyebrow transition-colors hover:text-ink cursor-pointer ${
                  servicesActive ? "text-accent" : "text-ink-soft"
                }`}
              >
                Dienstleistungen
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${servicesOpen ? "rotate-180" : ""}`} />
                <span
                  className="absolute -bottom-0.5 left-0 h-0.5 rounded-full bg-accent transition-all duration-300"
                  style={{ width: servicesActive ? "100%" : "0%" }}
                />
              </button>

              <div
                className={`absolute right-0 top-full pt-3 transition-all duration-200 ${
                  servicesOpen ? "visible opacity-100" : "pointer-events-none invisible opacity-0"
                }`}
              >
                <div className="w-[46rem] max-w-[90vw] rounded-2xl border border-line bg-surface p-5 shadow-[0_18px_50px_-12px_rgba(33,28,23,0.18)]">
                  <div className="grid grid-cols-4 gap-5">
                    {serviceGroups.map((group) => (
                      <div key={group.category.key}>
                        <span className="block eyebrow text-accent">{group.category.label}</span>
                        <div className="mt-3 space-y-1">
                          {group.items.map((s) => (
                            <Link
                              key={s.slug}
                              href={`/leistungen/${s.slug}`}
                              onClick={() => setServicesOpen(false)}
                              className="block rounded-lg px-2 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-canvas hover:text-accent-ink cursor-pointer"
                            >
                              {s.title}
                            </Link>
                          ))}
                          {group.category.key === "energie" && (
                            <Link
                              href="/stromrechner"
                              onClick={() => setServicesOpen(false)}
                              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-accent transition-colors hover:bg-canvas hover:text-accent-ink cursor-pointer"
                            >
                              <span>⚡</span> Strom-Spar-Rechner
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/konfigurator"
                    onClick={() => setServicesOpen(false)}
                    className="mt-5 block rounded-xl bg-accent-soft px-4 py-3 text-center text-sm font-medium text-accent-ink transition-colors hover:bg-accent hover:text-white cursor-pointer"
                  >
                    → Eigenes Paket zusammenstellen
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* CTA + Mobile-Button */}
          <div className="flex items-center gap-2">
            <Link
              href="/kontakt"
              className={`hidden rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink sm:inline-block cursor-pointer ${
                kontaktActive ? "ring-2 ring-accent/40 ring-offset-2 ring-offset-canvas" : ""
              }`}
            >
              Anfrage stellen
            </Link>
            <button
              type="button"
              aria-label="Menü öffnen"
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

      {/* Mobile sheet */}
      <div
        className={`border-b border-line bg-canvas/95 backdrop-blur-md transition-all duration-300 lg:hidden ${
          open ? "max-h-[85vh] overflow-y-auto opacity-100" : "max-h-0 overflow-hidden border-transparent opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-col px-5 py-3">
          {sectionLinks.map((l) => (
            <Link
              key={l.id}
              href={`/#${l.id}`}
              onClick={() => setOpen(false)}
              className="border-b border-line py-3 text-ink-soft transition-colors hover:text-ink cursor-pointer"
            >
              {l.label}
            </Link>
          ))}
          {serviceGroups.map((group) => (
            <div key={group.category.key}>
              <span className="mt-4 block eyebrow text-accent">{group.category.label}</span>
              {group.items.map((s) => (
                <Link
                  key={s.slug}
                  href={`/leistungen/${s.slug}`}
                  onClick={() => setOpen(false)}
                  className="block border-b border-line py-3 text-ink-soft transition-colors hover:text-ink cursor-pointer"
                >
                  {s.title}
                </Link>
              ))}
            </div>
          ))}
          <Link
            href="/konfigurator"
            onClick={() => setOpen(false)}
            className="mt-3 block border-b border-line py-3 font-medium text-accent transition-colors hover:text-accent-ink cursor-pointer"
          >
            → Eigenes Paket zusammenstellen
          </Link>
          <Link
            href="/stromrechner"
            onClick={() => setOpen(false)}
            className="block border-b border-line py-3 font-medium text-accent transition-colors hover:text-accent-ink cursor-pointer"
          >
            ⚡ Strom-Spar-Rechner
          </Link>
          <Link
            href="/kontakt"
            onClick={() => setOpen(false)}
            className="mt-4 rounded-full bg-accent px-4 py-3 text-center font-medium text-white cursor-pointer"
          >
            Anfrage stellen
          </Link>
        </div>
      </div>
    </header>
  );
}
