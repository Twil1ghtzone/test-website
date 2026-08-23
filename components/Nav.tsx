"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Zap, Boxes, ArrowRight } from "lucide-react";
import { brand } from "@/lib/data";
import { services, servicesByCategory } from "@/lib/services";
import { CameraIcon, ServerIcon, CubeIcon, BoltIcon, ShieldIcon } from "@/components/icons";
import { MotionLink, pressable } from "@/components/ui/motion";
import Logo from "@/components/Logo";

// Matrix-Punkte-Effekt (Canvas 2D), nur bei Bedarf geladen.
const CanvasRevealEffect = dynamic(
  () => import("@/components/ui/canvas-reveal-effect").then((m) => m.CanvasRevealEffect),
  { ssr: false }
);

const iconMap = { camera: CameraIcon, server: ServerIcon, cube: CubeIcon, bolt: BoltIcon, shield: ShieldIcon };
const serviceGroups = servicesByCategory();

// In-Page-Sektionen (Reihenfolge = Scroll-Reihenfolge der Startseite).
// "Über uns" ist bewusst NICHT mehr dabei: Es gibt jetzt eine eigene Seite
// /ueber-uns — bei einem kleinen Betrieb ist "wer steckt dahinter" der
// stärkste Vertrauenshebel und sollte verlinkbar sein, statt im Scroll
// der Startseite zu verschwinden.
const sectionLinks = [
  { id: "warum", label: "Warum lokal" },
  { id: "ablauf", label: "Ablauf" },
  { id: "bewertungen", label: "Bewertungen" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false); // mobile sheet
  const [mobileSvc, setMobileSvc] = useState(false); // mobile: Dienstleistungen aufgeklappt
  const [servicesOpen, setServicesOpen] = useState(false); // desktop dropdown
  const [hover, setHover] = useState<string | null>(null); // gleitende Pille
  const [svcHover, setSvcHover] = useState<string | null>(null); // Matrix-Effekt im Dropdown
  const pathname = usePathname();
  const servicesActive =
    pathname.startsWith("/leistungen") || pathname.startsWith("/konfigurator") || pathname.startsWith("/stromrechner");
  const blogActive = pathname.startsWith("/blog");
  const kontaktActive = pathname.startsWith("/kontakt");
  const ueberUnsActive = pathname.startsWith("/ueber-uns");
  const faqActive = pathname.startsWith("/faq");
  const [active, setActive] = useState<string>("");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scrollspy: aktive Sektion robust über die Scroll-Position bestimmen.
  // getElementById wird bei JEDEM Scroll neu abgefragt — so wird auch die
  // clientseitig nachgeladene Bewertungen-Sektion (ssr:false) zuverlässig erfasst,
  // die der frühere IntersectionObserver beim Mount noch gar nicht kannte.
  useEffect(() => {
    let raf = 0;
    const compute = () => {
      raf = 0;
      const line = window.innerHeight * 0.35; // Aktivierungslinie im oberen Drittel
      let current = "";
      for (const l of sectionLinks) {
        const el = document.getElementById(l.id);
        if (el && el.getBoundingClientRect().top <= line) current = l.id;
      }
      // Ganz unten angekommen → letzte vorhandene Sektion gilt als aktiv.
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8;
      if (nearBottom) {
        for (let i = sectionLinks.length - 1; i >= 0; i--) {
          if (document.getElementById(sectionLinks[i].id)) { current = sectionLinks[i].id; break; }
        }
      }
      setActive((prev) => (prev === current ? prev : current));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(compute); };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // Nachgeladene Sektionen (z. B. Bewertungen) kurz nach dem Mount erneut prüfen.
    const t = setTimeout(compute, 800);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      clearTimeout(t);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // Mobile-Sheet bei Routenwechsel schließen
  useEffect(() => { setOpen(false); setMobileSvc(false); }, [pathname]);

  /*
   * Klick auf eine In-Page-Sektion ("Warum lokal" etc.).
   *
   * Der Bug: Next.js' App-Router scrollt bei einem `<Link href="/#warum">`
   * NUR zuverlässig zum Anker, wenn sich der PFAD ändert (Navigation von
   * einer anderen Seite). Ändert sich nur der Hash — man ist bereits auf
   * "/" und klickt eine andere Sektion an —, behandelt der Router das
   * manchmal gar nicht als Navigation und scrollt überhaupt nicht, manchmal
   * schon: genau das unberechenbare "mal ja, mal nein", das gemeldet wurde.
   *
   * Fix: Ist man schon auf "/", wird selbst gescrollt (`scrollIntoView`,
   * zuverlässig) und die URL nur per `history.pushState` nachgeführt — ohne
   * Next"s Link-Navigation dafür zu bemühen. Kommt man von einer ANDEREN
   * Seite, lässt man die normale Link-Navigation laufen; der Effekt weiter
   * unten holt den Rest nach, sobald "/" fertig gemountet ist.
   */
  function handleSectionClick(id: string) {
    return (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (pathname !== "/") return; // andere Seite → normale Link-Navigation zulassen
      const el = document.getElementById(id);
      if (!el) return; // Sektion (noch) nicht im DOM → normale Link-Navigation als Rückfall
      e.preventDefault();
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      window.history.pushState(null, "", `/#${id}`);
    };
  }

  // Ankunft von einer ANDEREN Seite mit Ziel-Hash: erst wenn "/" fertig
  // gemountet ist, existiert das Zielelement überhaupt. Ein einzelner
  // Versuch direkt nach dem Mount kam bei animiert eingeblendeten Sektionen
  // manchmal zu früh — deshalb ein paar Versuche mit kurzer Pause.
  useEffect(() => {
    if (pathname !== "/") return;
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    let versuche = 0;
    const tick = () => {
      const el = document.getElementById(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (versuche++ < 10) {
        setTimeout(tick, 100);
      }
    };
    tick();
  }, [pathname]);

  // Body-Scroll sperren, solange das mobile Menü offen ist
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function openServices() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setServicesOpen(true);
  }
  function closeServices() {
    closeTimer.current = setTimeout(() => setServicesOpen(false), 120);
  }

  // Eine Nav-Pille mit gleitendem Hover-Hintergrund (geteiltes layoutId).
  // Kompakter Innenabstand, damit die acht Einträge plus CTA auch bei genau
  // 1280 px noch mit Luft in die Leiste passen.
  const pill =
    "relative z-10 flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-medium transition-colors cursor-pointer";

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 pt-3 sm:px-5">
        <nav
          className={`flex items-center justify-between gap-3 rounded-full border px-3 py-2 transition-all duration-300 sm:px-4 ${
            scrolled
              ? "border-line bg-canvas/80 shadow-[0_10px_30px_-16px_rgba(33,28,23,0.4)] backdrop-blur-xl"
              : "border-transparent bg-canvas/40 backdrop-blur-md"
          }`}
        >
          <Link href="/" aria-label={brand.name} className="shrink-0 rounded-full px-1.5 py-1 transition-transform hover:scale-[1.03] cursor-pointer">
            <Logo />
          </Link>

          {/* Desktop-Links — Pillen-Gruppe.

              Erst ab xl (1280 px) sichtbar, davor übernimmt das Menü.
              Grund: Mit acht Einträgen plus CTA passt die Reihe bei 1024 px
              nicht mehr. Ein vorheriger Versuch mit `min-w-0` machte es
              schlimmer — die Gruppe durfte dadurch unter ihre Inhaltsbreite
              schrumpfen, der Text bricht wegen `whitespace-nowrap` aber nicht
              um und lief deshalb sichtbar UNTER den CTA-Knopf ("Blog" und
              "Anfrage stellen" überlappten). Kein Schrumpfen, kein Überlauf:
              Ab hier gilt entweder ganz oder gar nicht. */}
          <div className="hidden shrink-0 items-center xl:flex" onMouseLeave={() => setHover(null)}>
            <Link
              href="/ueber-uns"
              onMouseEnter={() => setHover("ueber-uns")}
              className={`${pill} ${ueberUnsActive ? "text-accent" : "text-ink-soft hover:text-ink"}`}
            >
              {hover === "ueber-uns" && (
                <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-surface" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              Über uns
            </Link>

            {sectionLinks.map((l) => (
              <Link
                key={l.id}
                href={`/#${l.id}`}
                onClick={handleSectionClick(l.id)}
                onMouseEnter={() => setHover(l.id)}
                className={`${pill} ${active === l.id ? "text-accent-ink" : "text-ink-soft hover:text-ink"}`}
              >
                {/* Aktive Sektion: dauerhafte, gleitende Akzent-Pille (Scrollspy) */}
                {active === l.id && (
                  <motion.span layoutId="nav-active" className="absolute inset-0 -z-10 rounded-full bg-accent-soft" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                )}
                {hover === l.id && active !== l.id && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-surface" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                )}
                {l.label}
              </Link>
            ))}

            {/* Dienstleistungen — Mega-Dropdown */}
            <div className="relative" onMouseEnter={() => { setHover("svc"); openServices(); }} onMouseLeave={closeServices}>
              <button
                type="button"
                onClick={() => setServicesOpen((v) => !v)}
                aria-expanded={servicesOpen}
                className={`${pill} ${servicesActive || servicesOpen ? "text-accent" : "text-ink-soft hover:text-ink"}`}
              >
                {hover === "svc" && (
                  <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-surface" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                )}
                Dienstleistungen
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${servicesOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {servicesOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full pt-3"
                  >
                    {/* Klares, scannbares Dropdown (NN/g): kurze Liste mit
                        Kurzbeschreibungen, gruppierte Werkzeuge, gleitendes
                        Matrix-Highlight als edles Interaktions-Signal. */}
                    <div
                      role="menu"
                      aria-label="Dienstleistungen"
                      onKeyDown={(e) => { if (e.key === "Escape") setServicesOpen(false); }}
                      className="w-[38rem] max-w-[94vw] overflow-hidden rounded-3xl border border-line bg-surface/95 p-2.5 shadow-[0_28px_70px_-24px_rgba(33,28,23,0.35)] backdrop-blur-xl"
                    >
                      <div className="flex items-center justify-between px-2.5 pb-2 pt-1">
                        <span className="eyebrow text-muted">Unsere Leistungen</span>
                        <span className="text-[0.7rem] font-medium text-muted">{services.length} Bereiche</span>
                      </div>

                      {/* onMouseLeave auf dem GANZEN Bereich: so bleibt die Vorschau
                          aktiv, wenn man von der Liste zur rechten Vorschau wandert,
                          um dort auf „Ansehen" zu klicken. */}
                      <div className="flex gap-2.5" onMouseLeave={() => setSvcHover(null)}>
                      {/* Linke Spalte: nach Kategorie gruppiert — schlanke Eyebrow-Labels */}
                      <div className="min-w-0 flex-1">
                        {serviceGroups.map((group, gi) => (
                          <div key={group.category.key} className={gi > 0 ? "mt-1" : undefined}>
                            <span className="block px-2.5 pb-1 pt-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted/80">
                              {group.category.label}
                            </span>
                            <div className="relative">
                              {group.items.map((s) => {
                                const Icon = iconMap[s.icon];
                                const on = svcHover === s.slug;
                                return (
                                  <Link
                                    key={s.slug}
                                    role="menuitem"
                                    href={`/leistungen/${s.slug}`}
                                    onClick={() => setServicesOpen(false)}
                                    onMouseEnter={() => setSvcHover(s.slug)}
                                    onFocus={() => setSvcHover(s.slug)}
                                    className="group/item relative flex items-center gap-3 rounded-2xl p-2.5 outline-none cursor-pointer"
                                  >
                                    {on && (
                                      <motion.span
                                        layoutId="svc-hl"
                                        transition={{ type: "spring", stiffness: 400, damping: 34 }}
                                        className="absolute inset-0 z-0 overflow-hidden rounded-2xl bg-accent-soft/70 ring-1 ring-accent/10"
                                      >
                                        <span className="absolute inset-0 opacity-60">
                                          <CanvasRevealEffect
                                            animationSpeed={4}
                                            containerClassName="bg-transparent"
                                            colors={[[176, 84, 58], [212, 150, 110]]}
                                            dotSize={2}
                                            showGradient={false}
                                          />
                                        </span>
                                      </motion.span>
                                    )}
                                    <span className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-colors duration-300 ${on ? "bg-accent text-white" : "bg-accent-soft text-accent"}`}>
                                      <Icon className="h-4 w-4" />
                                    </span>
                                    <span className="relative z-10 min-w-0 flex-1">
                                      <span className="block truncate text-sm font-semibold text-ink">{s.title}</span>
                                      <span className="block truncate text-xs text-muted">{s.tagline}</span>
                                    </span>
                                    <ArrowRight className={`relative z-10 h-4 w-4 shrink-0 text-accent transition-all duration-300 ${on ? "translate-x-0 opacity-100" : "-translate-x-1 opacity-0"}`} />
                                  </Link>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Rechte Spalte: Live-Vorschau des gehoverten Eintrags mit weichem Crossfade */}
                      <div className="hidden w-[13.5rem] shrink-0 overflow-hidden rounded-2xl border border-line bg-canvas/70 lg:block">
                        <AnimatePresence mode="wait" initial={false}>
                          {(() => {
                            const active = services.find((x) => x.slug === svcHover) ?? null;
                            return (
                              <motion.div
                                key={active ? active.slug : "default"}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.16, ease: "easeOut" }}
                                className="flex h-full flex-col"
                              >
                                {active ? (
                                  <Link
                                    href={`/leistungen/${active.slug}`}
                                    onClick={() => setServicesOpen(false)}
                                    className="group/preview flex h-full flex-col outline-none"
                                  >
                                    <div className="relative h-32 w-full overflow-hidden">
                                      {active.image ? (
                                        /*
                                         * Statisches Bild aus /public (siehe lib/services.ts),
                                         * daher über next/image: WebP/AVIF und passende Größe
                                         * statt des Originals. Die Vorschau ist konstant
                                         * 13.5rem = 216 px breit, deshalb ein fester `sizes`-Wert
                                         * statt einer Viewport-Formel.
                                         */
                                        <Image src={active.image} alt="" fill sizes="216px" className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover/preview:scale-105" />
                                      ) : (
                                        <div className="grid h-full w-full place-items-center bg-accent-soft">
                                          {(() => { const I = iconMap[active.icon]; return <I className="h-9 w-9 text-accent" />; })()}
                                        </div>
                                      )}
                                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-canvas/80 to-transparent" />
                                    </div>
                                    <div className="flex flex-1 flex-col p-3">
                                      <span className="text-sm font-semibold leading-snug text-ink">{active.title}</span>
                                      <span className="mt-1 line-clamp-3 text-xs leading-relaxed text-muted">{active.outcomes[0]}</span>
                                      <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-xs font-semibold text-accent">
                                        Ansehen <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/preview:translate-x-1" />
                                      </span>
                                    </div>
                                  </Link>
                                ) : (
                                  <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                                    <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent">
                                      <Zap className="h-5 w-5" />
                                    </span>
                                    <span className="text-xs leading-relaxed text-muted">
                                      Fahren Sie über eine Leistung,<br />um eine Vorschau zu sehen.
                                    </span>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })()}
                        </AnimatePresence>
                      </div>
                      </div>

                      <div className="mx-1.5 my-2 h-px bg-line" />

                      <div className="flex gap-2 px-0.5 pb-0.5">
                        <Link href="/stromrechner" onClick={() => setServicesOpen(false)} className="flex flex-1 items-center gap-2 rounded-2xl border border-line bg-canvas/60 p-2.5 text-accent-ink transition-colors hover:border-accent/40 hover:bg-accent-soft cursor-pointer">
                          <Zap className="h-4 w-4 shrink-0 text-accent" />
                          <span className="text-xs font-semibold leading-tight">Energie-Spar-Rechner</span>
                        </Link>
                        <Link href="/konfigurator" onClick={() => setServicesOpen(false)} className="flex flex-1 items-center gap-2 rounded-2xl border border-line bg-canvas/60 p-2.5 text-accent-ink transition-colors hover:border-accent/40 hover:bg-accent-soft cursor-pointer">
                          <Boxes className="h-4 w-4 shrink-0 text-accent" />
                          <span className="text-xs font-semibold leading-tight">Paket zusammenstellen</span>
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href="/faq"
              onMouseEnter={() => setHover("faq")}
              className={`${pill} ${faqActive ? "text-accent" : "text-ink-soft hover:text-ink"}`}
            >
              {hover === "faq" && (
                <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-surface" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              FAQ
            </Link>

            <Link
              href="/support"
              onMouseEnter={() => setHover("support")}
              className={`${pill} ${pathname === "/support" ? "text-accent" : "text-ink-soft hover:text-ink"}`}
            >
              {hover === "support" && (
                <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-surface" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              Support
            </Link>

            <Link
              href="/blog"
              onMouseEnter={() => setHover("blog")}
              className={`${pill} ${blogActive ? "text-accent" : "text-ink-soft hover:text-ink"}`}
            >
              {hover === "blog" && (
                <motion.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-full bg-surface" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              )}
              Blog
            </Link>
          </div>

          {/* CTA + Mobile-Button */}
          <div className="flex shrink-0 items-center gap-2">
            {/*
              `inline-flex` + feste Höhe statt `inline-block`: Als Inline-Block
              richtet sich der Knopf an der Textgrundlinie aus und wird durch
              den Unterlängen-Raum höher als die Leiste — er ragte sichtbar
              oben und unten heraus. Mit derselben Höhe wie der Menü-Knopf
              (h-10) sitzen beide exakt in der Pille.
            */}
            <MotionLink
              href="/kontakt"
              {...pressable}
              className={`hidden h-10 shrink-0 items-center rounded-full bg-accent px-4 text-sm font-medium whitespace-nowrap text-white shadow-[0_6px_18px_-8px_rgba(176,84,58,0.45)] transition-colors hover:bg-accent-ink sm:inline-flex xl:px-5 cursor-pointer ${kontaktActive ? "ring-2 ring-accent/40 ring-offset-2 ring-offset-canvas" : ""}`}
            >
              Anfrage stellen
            </MotionLink>
            <button
              type="button"
              aria-label="Menü"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="grid h-10 w-10 place-items-center rounded-full border border-line-strong bg-surface transition-colors hover:border-ink active:scale-95 xl:hidden cursor-pointer"
            >
              <span className="relative block h-3 w-4">
                <span className={`absolute left-0 h-0.5 w-4 rounded-full bg-ink transition-all duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`} />
                <span className={`absolute left-0 top-1.5 h-0.5 w-4 rounded-full bg-ink transition-all duration-300 ${open ? "opacity-0" : "opacity-100"}`} />
                <span className={`absolute left-0 h-0.5 w-4 rounded-full bg-ink transition-all duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`} />
              </span>
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile sheet — übersichtlich gruppiert */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="mx-3 mt-2 max-h-[80vh] overflow-y-auto overscroll-contain rounded-3xl border border-line bg-canvas/95 p-2 pb-safe shadow-[0_24px_60px_-24px_rgba(33,28,23,0.32)] backdrop-blur-xl xl:hidden"
          >
            <div className="flex flex-col gap-1 p-2">
              <span className="px-2 pb-1 eyebrow text-muted">Entdecken</span>
              <Link href="/ueber-uns" onClick={() => setOpen(false)} className="rounded-2xl px-3 py-2.5 text-ink-soft transition-colors hover:bg-surface hover:text-ink active:scale-[0.98] cursor-pointer">
                Über uns
              </Link>
              {sectionLinks.map((l) => (
                <Link
                  key={l.id}
                  href={`/#${l.id}`}
                  onClick={(e) => { handleSectionClick(l.id)(e); setOpen(false); }}
                  className="rounded-2xl px-3 py-2.5 text-ink-soft transition-colors hover:bg-surface hover:text-ink active:scale-[0.98] cursor-pointer"
                >
                  {l.label}
                </Link>
              ))}
              <Link href="/faq" onClick={() => setOpen(false)} className="rounded-2xl px-3 py-2.5 text-ink-soft transition-colors hover:bg-surface hover:text-ink active:scale-[0.98] cursor-pointer">
                Häufige Fragen
              </Link>
              <Link href="/blog" onClick={() => setOpen(false)} className="rounded-2xl px-3 py-2.5 text-ink-soft transition-colors hover:bg-surface hover:text-ink active:scale-[0.98] cursor-pointer">
                Blog
              </Link>
              <Link href="/support" onClick={() => setOpen(false)} className="rounded-2xl px-3 py-2.5 text-ink-soft transition-colors hover:bg-surface hover:text-ink active:scale-[0.98] cursor-pointer">
                Support
              </Link>

              {/* Dienstleistungen — aufklappbar */}
              <button
                type="button"
                onClick={() => setMobileSvc((v) => !v)}
                aria-expanded={mobileSvc}
                className="mt-2 flex items-center justify-between rounded-2xl px-3 py-2.5 text-left font-medium text-ink transition-colors hover:bg-surface active:scale-[0.98] cursor-pointer"
              >
                Dienstleistungen
                <ChevronDown className={`h-4 w-4 text-muted transition-transform duration-300 ${mobileSvc ? "rotate-180" : ""}`} />
              </button>
              <div className={`overflow-hidden transition-all duration-300 ${mobileSvc ? "max-h-[44rem] opacity-100" : "max-h-0 opacity-0"}`}>
                <div className="space-y-1 pl-1">
                  {serviceGroups.map((group) => (
                    <div key={group.category.key} className="pt-1">
                      <span className="block px-3 pt-2 eyebrow text-accent">{group.category.label}</span>
                      {group.items.map((s) => {
                        const Icon = iconMap[s.icon];
                        return (
                          <Link key={s.slug} href={`/leistungen/${s.slug}`} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-ink-soft transition-colors hover:bg-surface hover:text-ink active:scale-[0.98] cursor-pointer">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Icon className="h-4 w-4" /></span>
                            {s.title}
                          </Link>
                        );
                      })}
                    </div>
                  ))}
                  <Link href="/stromrechner" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 font-medium text-accent transition-colors hover:bg-surface active:scale-[0.98] cursor-pointer">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent-soft"><Zap className="h-4 w-4" /></span>
                    Energie-Spar-Rechner
                  </Link>
                  <Link href="/konfigurator" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 font-medium text-accent transition-colors hover:bg-surface active:scale-[0.98] cursor-pointer">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent-soft"><Boxes className="h-4 w-4" /></span>
                    Paket zusammenstellen
                  </Link>
                </div>
              </div>

              <MotionLink href="/kontakt" onClick={() => setOpen(false)} {...pressable} className="mt-3 rounded-full bg-accent px-4 py-3 text-center font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer">
                Anfrage stellen
              </MotionLink>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
