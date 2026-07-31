"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MotionLink, pressable } from "@/components/ui/motion";
import {
  Zap, ArrowRight, Info, Check, Leaf, Server, TrendingUp, ChevronDown,
  Plus, Trash2, Sun, Printer, Flame, Sparkles, TreeDeciduous, Car, ShieldCheck,
} from "lucide-react";
import {
  berechne, basisVerbrauch, kostenVorschlag,
  STROM_MASSNAHMEN, STROM_KAPPE, WAERME_MASSNAHMEN, WAERME_KAPPE,
  WAERME_SPEZ, HEIZARTEN, HEIZART_KEYS, JAZ, CO2_STROM, CLOUD, SERVER,
  PV_WP_STANDARD, PV_SPEZ_ERTRAG_STANDARD, PV_EIGENVERBRAUCH_STANDARD,
  PREISSTEIGERUNG_STANDARD, MONTAGE_ANTEIL, AMORTISATION_ZEIGEN_BIS_JAHRE,
  CO2_BAUM_PRO_JAHR, CO2_AUTO_PRO_KM, CO2_PRO_KOPF_DE,
  type Wohnform, type Heizart, type ServerKey, type Waermequelle,
} from "@/lib/sparrechner";

export type Kontakt = { companyName: string; email: string; phone: string; region: string };

const nf = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
const komma = (n: number, stellen = 1) => n.toFixed(stellen).replace(".", ",");

/** Amortisationsdauer menschlich: unter 2 Jahren in Monaten, sonst in Jahren. */
function dauerText(jahre: number): string {
  if (jahre < 2) {
    const monate = Math.round(jahre * 12);
    return `${monate} Monat${monate === 1 ? "" : "en"}`;
  }
  return `${komma(jahre)} Jahren`;
}

/* ─────────────────────────── Hilfsbausteine ─────────────────────────── */

// Sanft zählende Zahl — macht Änderungen im Ergebnis spürbar statt sprunghaft.
function useAnimatedNumber(target: number, duration = 550): number {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    const from = fromRef.current;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const v = from + (target - from) * (1 - Math.pow(1 - t, 3));
      setValue(v);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return value;
}

function Slider({
  id, label, value, min, max, step, onChange, display, hint,
}: {
  id: string; label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display: string; hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
        <span className="font-display text-base font-semibold tabular-nums text-accent-ink">{display}</span>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="range mt-2"
        style={{ "--p": `${pct}%` } as React.CSSProperties}
      />
      {hint && <p className="text-xs leading-snug text-muted">{hint}</p>}
    </div>
  );
}

function Segmented<T extends string>({
  value, onChange, options, ariaLabel,
}: {
  value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-1.5 rounded-2xl border border-line bg-canvas p-1.5">
      {options.map((o) => (
        <button
          key={o.value} type="button" onClick={() => onChange(o.value)} aria-pressed={value === o.value}
          className={`h-10 flex-1 rounded-xl px-2 text-sm font-medium transition-colors cursor-pointer ${
            value === o.value ? "bg-accent text-white shadow-[0_6px_16px_-8px_rgba(176,84,58,0.9)]" : "text-ink-soft hover:bg-surface-2"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function OptionCard({
  on, onClick, title, hint, right,
}: {
  on: boolean; onClick: () => void; title: string; hint: string; right?: string;
}) {
  return (
    <button
      type="button" onClick={onClick} aria-pressed={on}
      className={`flex items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors cursor-pointer ${
        on ? "border-accent bg-accent-soft/45" : "border-line bg-canvas hover:border-line-strong"
      }`}
    >
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border transition-colors ${
        on ? "border-accent bg-accent text-white" : "border-line-strong"
      }`}>
        {on && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium leading-tight text-ink">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-muted">{hint}</span>
      </span>
      {right && <span className="shrink-0 text-sm tabular-nums text-muted">{right}</span>}
    </button>
  );
}

function Step({ no, title, subtitle, children }: { no: number; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-6 transition-shadow duration-300 hover:shadow-[0_18px_44px_-24px_rgba(33,28,23,0.22)] sm:p-7">
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-strong bg-canvas font-display text-sm font-semibold text-accent-ink">
          {no}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold leading-tight tracking-tight">{title}</h2>
          {subtitle && <p className="mt-1 text-sm leading-snug text-muted">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

/* ───────────────────────── Amortisations-Diagramm ───────────────────────── */

function PaybackChart({ kumuliert, jahre = 10 }: { kumuliert: (n: number) => number; jahre?: number }) {
  const values = Array.from({ length: jahre + 1 }, (_, i) => kumuliert(i));
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const zeroY = (max / span) * 100;

  return (
    <div>
      <div className="relative h-28">
        <div className="absolute inset-x-0 border-t border-dashed border-white/25" style={{ top: `${zeroY}%` }} />
        <div className="relative flex h-full items-stretch gap-[3px]">
          {values.map((v, i) => {
            const h = (Math.abs(v) / span) * 100;
            const positiv = v >= 0;
            return (
              <div key={i} className="group relative flex-1">
                <div
                  className={`absolute w-full rounded-[3px] transition-all duration-500 ${positiv ? "bg-accent" : "bg-white/22"}`}
                  style={positiv ? { bottom: `${100 - zeroY}%`, height: `${h}%` } : { top: `${zeroY}%`, height: `${h}%` }}
                />
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-canvas px-2 py-1 text-[0.7rem] font-medium text-ink opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  Jahr {i}: {eur.format(v)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[0.7rem] text-white/45">
        <span>Jahr 0</span><span>Jahr 5</span><span>Jahr {jahre}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ Seite ═══════════════════════════════ */

let quellenZaehler = 0;
const neueId = () => `q${++quellenZaehler}`;

export default function Sparrechner({ kontakt }: { kontakt: Kontakt }) {
  /* ── Haushalt ── */
  const [wohnform, setWohnform] = useState<Wohnform>("haus");
  const [personen, setPersonen] = useState(3);
  const [warmwasserStrom, setWarmwasserStrom] = useState(false);
  const [flaeche, setFlaeche] = useState(130);
  const [verbrauch, setVerbrauch] = useState<number>(basisVerbrauch("haus", 3, false));
  const [strompreis, setStrompreis] = useState(0.35);
  const [verbrauchBerührt, setVerbrauchBerührt] = useState(false);

  /* ── Wärme (Hybrid: beliebig viele Quellen) ── */
  const [waermequellen, setWaermequellen] = useState<Waermequelle[]>([
    { id: neueId(), art: "gas", jahreskosten: kostenVorschlag("gas", "haus", 130, 0.35) },
  ]);

  /* ── Maßnahmen, Abos, Server ── */
  const [stromMass, setStromMass] = useState<Set<string>>(new Set(["standby", "messung"]));
  const [waermeMass, setWaermeMass] = useState<Set<string>>(new Set(["einzelraum", "abwesend"]));
  const [abos, setAbos] = useState<Set<string>>(new Set(["icloud", "google"]));
  const [serverKey, setServerKey] = useState<ServerKey>("nas");

  /* ── Balkonkraftwerk ── */
  const [pvAktiv, setPvAktiv] = useState(true);
  const [pvWp, setPvWp] = useState(PV_WP_STANDARD);
  const [pvSpezErtrag, setPvSpezErtrag] = useState(PV_SPEZ_ERTRAG_STANDARD);
  const [pvEigenverbrauch, setPvEigenverbrauch] = useState(PV_EIGENVERBRAUCH_STANDARD);

  /* ── Annahmen ── */
  const [preissteigerung, setPreissteigerung] = useState(PREISSTEIGERUNG_STANDARD);
  const [investEigen, setInvestEigen] = useState<number | null>(null);

  useEffect(() => {
    if (verbrauchBerührt) return;
    setVerbrauch(basisVerbrauch(wohnform, personen, warmwasserStrom));
  }, [wohnform, personen, warmwasserStrom, verbrauchBerührt]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const n = new Set(set);
    if (n.has(key)) n.delete(key); else n.add(key);
    setter(n);
  };

  const r = useMemo(
    () => berechne({
      verbrauch, strompreis, waermequellen, stromMass, waermeMass, abos, serverKey, flaeche,
      pvAktiv, pvWp, pvSpezErtrag, pvEigenverbrauch, preissteigerung, investEigen,
    }),
    [verbrauch, strompreis, waermequellen, stromMass, waermeMass, abos, serverKey, flaeche,
     pvAktiv, pvWp, pvSpezErtrag, pvEigenverbrauch, preissteigerung, investEigen]
  );

  const animNetto = useAnimatedNumber(Math.max(0, r.netto));

  // Marketing-Gate: Die Amortisation wird nur ausgespielt, wenn sie innerhalb
  // von 3 Jahren erreicht ist. Darüber bleibt das Element komplett verborgen —
  // die kumulierte Bilanz und das Diagramm bleiben aber sichtbar, sonst wäre
  // die Seite nicht mehr ehrlich.
  const amortisationZeigen = r.amortisation !== null && r.amortisation <= AMORTISATION_ZEIGEN_BIS_JAHRE;
  const [popupWeg, setPopupWeg] = useState(false);
  useEffect(() => { if (amortisationZeigen) setPopupWeg(false); }, [amortisationZeigen]);

  // Mitlaufende Ergebnis-Leiste auf dem Handy.
  const ergebnisRef = useRef<HTMLDivElement>(null);
  const [leisteSichtbar, setLeisteSichtbar] = useState(false);
  useEffect(() => {
    const el = ergebnisRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setLeisteSichtbar(!e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const anteil = (v: number) => (r.brutto > 0 ? (v / r.brutto) * 100 : 0);
  const heute = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

  /* ── Wärmequellen bearbeiten ── */
  const quelleAendern = (id: string, patch: Partial<Waermequelle>) =>
    setWaermequellen((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const quelleHinzu = () => {
    // Sinnvoller Vorschlag: die noch nicht verwendete Art, sonst Wärmepumpe.
    const frei = HEIZART_KEYS.find((k) => !waermequellen.some((q) => q.art === k)) ?? "wp";
    setWaermequellen((qs) => [
      ...qs,
      { id: neueId(), art: frei, jahreskosten: kostenVorschlag(frei, wohnform, Math.round(flaeche / 2), strompreis) },
    ]);
  };
  const quelleWeg = (id: string) => setWaermequellen((qs) => qs.filter((q) => q.id !== id));

  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        <nav className="noprint flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <span className="text-ink-soft">Energie-Spar-Rechner</span>
        </nav>

        <div className="noprint mt-8 max-w-2xl">
          <span className="inline-flex items-center gap-2 eyebrow text-accent">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white"><Zap className="h-5 w-5" /></span>
            Energie-Spar-Rechner
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.8rem]">
            Was bleibt am Jahresende <span className="emph">wirklich übrig?</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Strom und Wärme getrennt gerechnet, der Eigenverbrauch des Servers abgezogen und
            das <strong className="font-semibold text-ink">vollständige Paket</strong> — Material,
            Montage und Abnahme — als Investition gegengestellt. Die Einsparwerte liegen bewusst
            am unteren Rand.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
          {/* ───────────────────────── Eingaben ───────────────────────── */}
          <div className="noprint space-y-6">
            {/* ── 1 Haushalt ── */}
            <Step no={1} title="Ihr Zuhause" subtitle="Daraus ergeben sich die Startwerte — jeden Regler können Sie überschreiben.">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <span className="mb-2 block text-sm font-medium text-ink">Wohnform</span>
                  <Segmented
                    ariaLabel="Wohnform" value={wohnform}
                    onChange={(v) => {
                      setWohnform(v);
                      const f = v === "haus" ? 130 : 75;
                      setFlaeche(f);
                      setVerbrauchBerührt(false);
                      setWaermequellen((qs) => qs.map((q) => ({ ...q, jahreskosten: kostenVorschlag(q.art, v, f / Math.max(1, qs.length), strompreis) })));
                    }}
                    options={[{ value: "wohnung", label: "Wohnung" }, { value: "haus", label: "Haus" }]}
                  />
                </div>
                <div>
                  <span className="mb-2 block text-sm font-medium text-ink">Personen</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((p) => (
                      <button
                        key={p} type="button" onClick={() => { setPersonen(p); setVerbrauchBerührt(false); }}
                        aria-pressed={personen === p}
                        className={`h-[3.25rem] flex-1 rounded-2xl border text-sm font-medium transition-colors cursor-pointer ${
                          personen === p ? "border-accent bg-accent text-white" : "border-line bg-canvas text-ink hover:border-line-strong"
                        }`}
                      >
                        {p === 5 ? "5+" : p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5">
                <OptionCard
                  on={warmwasserStrom}
                  onClick={() => { setWarmwasserStrom(!warmwasserStrom); setVerbrauchBerührt(false); }}
                  title="Warmwasser läuft über Strom"
                  hint="Durchlauferhitzer oder Boiler — das hebt den Verbrauch deutlich an"
                />
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <Slider
                  id="verbrauch" label="Stromverbrauch / Jahr" value={verbrauch}
                  min={800} max={9000} step={100}
                  onChange={(v) => { setVerbrauch(v); setVerbrauchBerührt(true); }}
                  display={`${nf.format(verbrauch)} kWh`}
                />
                <Slider
                  id="strompreis" label="Ihr Strompreis" value={strompreis}
                  min={0.2} max={0.55} step={0.01} onChange={setStrompreis}
                  display={`${komma(strompreis, 2)} €/kWh`}
                />
                <Slider
                  id="flaeche" label="Wohnfläche" value={flaeche} min={40} max={300} step={5}
                  onChange={setFlaeche} display={`${flaeche} m²`}
                  hint={`bestimmt die Zahl der Thermostate · ${WAERME_SPEZ[wohnform]} kWh/m² Wärmebedarf`}
                />
              </div>
            </Step>

            {/* ── 2 Strom ── */}
            <Step no={2} title="Strom sparen" subtitle={`Maßnahmen, die den Haushaltsstrom senken — zusammen höchstens ${Math.round(STROM_KAPPE * 100)} %.`}>
              <div className="grid gap-2 sm:grid-cols-3">
                {STROM_MASSNAHMEN.map((m) => (
                  <OptionCard
                    key={m.key} on={stromMass.has(m.key)}
                    onClick={() => toggle(stromMass, setStromMass, m.key)}
                    title={m.label} hint={`${m.hint} · bis ${Math.round(m.pct * 100)} %`}
                  />
                ))}
              </div>
              <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Ohne Geräteaustausch ist beim reinen Haushaltsstrom weniger drin, als oft versprochen wird.
                Die großen Hebel sind Wärme und eigene Erzeugung — die nächsten beiden Schritte.
              </p>
            </Step>

            {/* ── 3 Wärme (Hybrid) ── */}
            <Step
              no={3} title="Wärme sparen"
              subtitle="Tragen Sie ein, was Sie pro Jahr fürs Heizen zahlen. Mehrere Energieträger? Einfach hinzufügen."
            >
              <div className="space-y-2.5">
                {waermequellen.map((q, i) => {
                  const preis = q.art === "wp" ? strompreis / JAZ : HEIZARTEN[q.art].preis!;
                  const kwh = preis > 0 ? q.jahreskosten / preis : 0;
                  return (
                    <div key={q.id} className="rounded-2xl border border-line bg-canvas p-3.5">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[9rem] flex-1">
                          <label htmlFor={`art-${q.id}`} className="mb-1.5 block text-xs font-medium text-muted">Energieträger</label>
                          <select
                            id={`art-${q.id}`} value={q.art}
                            onChange={(e) => {
                              const art = e.target.value as Heizart;
                              quelleAendern(q.id, { art, jahreskosten: kostenVorschlag(art, wohnform, Math.round(flaeche / Math.max(1, waermequellen.length)), strompreis) });
                            }}
                            className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent cursor-pointer"
                          >
                            {HEIZART_KEYS.map((k) => (
                              <option key={k} value={k} disabled={k !== q.art && waermequellen.some((x) => x.art === k)}>
                                {HEIZARTEN[k].label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="min-w-[9rem] flex-1">
                          <label htmlFor={`kosten-${q.id}`} className="mb-1.5 block text-xs font-medium text-muted">Kosten pro Jahr</label>
                          <div className="relative">
                            <input
                              id={`kosten-${q.id}`} type="number" min={0} max={20000} step={10}
                              value={q.jahreskosten}
                              onChange={(e) => quelleAendern(q.id, { jahreskosten: Math.max(0, Math.min(20000, +e.target.value || 0)) })}
                              className="h-11 w-full rounded-xl border border-line bg-surface pl-3 pr-8 text-sm tabular-nums text-ink outline-none focus:border-accent"
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">€</span>
                          </div>
                        </div>
                        {waermequellen.length > 1 && (
                          <button
                            type="button" onClick={() => quelleWeg(q.id)}
                            aria-label={`${HEIZARTEN[q.art].label} entfernen`}
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line text-muted transition-colors hover:border-red-300 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {komma(preis, 2)} €/kWh
                        {q.art === "wp" && ` (Strompreis ÷ JAZ ${komma(JAZ)})`}
                        {" · entspricht "}{nf.format(kwh)} kWh Wärme
                        {i === 0 && waermequellen.length === 1 && " · Wert steht auf Ihrer Jahresabrechnung"}
                      </p>
                    </div>
                  );
                })}
              </div>

              {waermequellen.length < HEIZART_KEYS.length && (
                <button
                  type="button" onClick={quelleHinzu}
                  className="mt-2.5 inline-flex items-center gap-2 rounded-full border border-dashed border-line-strong px-4 py-2.5 text-sm font-medium text-accent-ink transition-colors hover:border-accent hover:bg-accent-soft/40 cursor-pointer"
                >
                  <Plus className="h-4 w-4" /> Weiteren Energieträger hinzufügen
                </button>
              )}
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Hybrid-Heizungen sind der Normalfall geworden — Gastherme für die kalten Tage,
                Wärmepumpe für den Rest. Beide Posten lassen sich hier getrennt eintragen.
              </p>

              <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-surface-2/60 px-4 py-3">
                <span className="flex items-center gap-2 text-sm text-ink-soft"><Flame className="h-4 w-4 text-accent" /> Wärmekosten gesamt</span>
                <span className="font-display font-semibold tabular-nums text-accent-ink">{eur.format(r.waermeKosten)} / Jahr</span>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {WAERME_MASSNAHMEN.map((m) => (
                  <OptionCard
                    key={m.key} on={waermeMass.has(m.key)}
                    onClick={() => toggle(waermeMass, setWaermeMass, m.key)}
                    title={m.label} hint={`${m.hint} · bis ${Math.round(m.pct * 100)} %`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted">Zusammen höchstens {Math.round(WAERME_KAPPE * 100)} % — ohne Kessel- oder Fenstertausch.</p>
            </Step>

            {/* ── 4 Balkonkraftwerk ── */}
            <Step no={4} title="Balkonkraftwerk" subtitle="Eigener Strom vom Balkon oder der Garagenwand — der direkteste Hebel auf die Stromrechnung.">
              <OptionCard
                on={pvAktiv} onClick={() => setPvAktiv(!pvAktiv)}
                title="Balkonkraftwerk einplanen"
                hint={`${PV_WP_STANDARD} Wp sind seit 2024 die vereinfachte Grenze — Leistung unten frei einstellbar`}
              />

              {pvAktiv && (
                <div className="mt-5 space-y-6">
                  <div className="grid gap-6 sm:grid-cols-2">
                    <Slider
                      id="pvwp" label="Leistung" value={pvWp} min={300} max={2000} step={50}
                      onChange={setPvWp} display={`${nf.format(pvWp)} Wp`}
                      hint={pvWp > 800 ? "über 800 W: Wechselrichter wird begrenzt oder es braucht eine reguläre Anmeldung" : "im vereinfachten Verfahren anmeldbar"}
                    />
                    <Slider
                      id="pvertrag" label="Ertrag je kWp" value={pvSpezErtrag} min={700} max={1050} step={10}
                      onChange={setPvSpezErtrag} display={`${nf.format(pvSpezErtrag)} kWh`}
                      hint="700 = Ost/West oder verschattet · 1050 = Süd, freie Sicht"
                    />
                  </div>
                  <Slider
                    id="pveigen" label="Eigenverbrauchsquote" value={Math.round(pvEigenverbrauch * 100)}
                    min={40} max={95} step={5}
                    onChange={(v) => setPvEigenverbrauch(v / 100)}
                    display={`${Math.round(pvEigenverbrauch * 100)} %`}
                    hint="Anteil, der direkt im Haus verbraucht wird. Ohne Speicher realistisch 60–80 %."
                  />

                  <div className="rounded-2xl border border-line bg-canvas p-4">
                    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
                      <span className="flex items-center gap-2 text-ink-soft"><Sun className="h-4 w-4 text-amber-500" /> Jahresertrag</span>
                      <span className="font-display font-semibold tabular-nums text-accent-ink">{nf.format(r.pvKwhBrutto)} kWh</span>
                    </div>
                    <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-xs">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">davon selbst verbraucht</dt>
                        <dd className="tabular-nums text-ink-soft">{nf.format(r.pvKwhEigen)} kWh · {eur.format(r.pvEuro)}/Jahr</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted">Überschuss (ohne Einspeisevertrag unvergütet)</dt>
                        <dd className="tabular-nums text-muted">{nf.format(r.pvKwhUeberschuss)} kWh · 0 €</dd>
                      </div>
                    </dl>
                  </div>

                  <p className="flex items-start gap-2.5 rounded-2xl bg-accent-soft/50 p-4 text-sm leading-relaxed text-ink-soft">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span>
                      <strong className="font-semibold text-ink">Rechtlich vollkommen unkompliziert:</strong>{" "}
                      Wir als Fachbetrieb übernehmen die schnelle Anmeldung bei der Bundesnetzagentur
                      und dem Netzbetreiber komplett für Sie.
                    </span>
                  </p>
                </div>
              )}
            </Step>

            {/* ── 5 Abos ── */}
            <Step no={5} title="Abos, die wegfallen" subtitle="Wählen Sie, was Sie heute monatlich zahlen — ein eigener Server übernimmt das.">
              <div className="grid gap-2 sm:grid-cols-2">
                {CLOUD.map((c) => (
                  <OptionCard
                    key={c.key} on={abos.has(c.key)}
                    onClick={() => toggle(abos, setAbos, c.key)}
                    title={c.label} hint="monatlich" right={eur2.format(c.price)}
                  />
                ))}
              </div>
              <p className="mt-3 text-right text-sm font-medium text-accent-ink">
                {eur2.format(r.aboMonat)} / Monat · {eur.format(r.aboEuro)} / Jahr
              </p>
            </Step>

            {/* ── 6 Kosten ── */}
            <Step no={6} title="Was das Paket kostet" subtitle="Der Server verbraucht selbst Strom, und alles muss einmal angeschafft und montiert werden.">
              <div className="grid gap-2 sm:grid-cols-3">
                {SERVER.map((s) => (
                  <button
                    key={s.key} type="button" onClick={() => { setServerKey(s.key); setInvestEigen(null); }}
                    aria-pressed={serverKey === s.key}
                    className={`rounded-2xl border p-4 text-left transition-colors cursor-pointer ${
                      serverKey === s.key ? "border-accent bg-accent-soft/45" : "border-line bg-canvas hover:border-line-strong"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Server className={`h-4 w-4 ${serverKey === s.key ? "text-accent" : "text-muted"}`} />
                      <span className="text-sm font-medium text-ink">{s.label}</span>
                    </span>
                    <span className="mt-1.5 block text-xs leading-snug text-muted">{s.hint}</span>
                    <span className="mt-2 block font-display text-sm font-semibold tabular-nums text-accent-ink">
                      {s.watt} W · ca. {nf.format((s.watt * 8760) / 1000)} kWh/Jahr
                    </span>
                  </button>
                ))}
              </div>

              {/* Aufschlüsselung — genau der Punkt, der vorher fehlte */}
              <div className="mt-5 overflow-hidden rounded-2xl border border-line">
                <table className="w-full text-sm">
                  <tbody>
                    {r.posten.map((p) => (
                      <tr key={p.label} className="border-b border-line last:border-0">
                        <td className="px-4 py-2.5 text-ink-soft">{p.label}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-ink">{eur.format(p.betrag)}</td>
                      </tr>
                    ))}
                    <tr className="bg-surface-2/60">
                      <td className="px-4 py-3 font-medium text-ink">Gesamtinvestition</td>
                      <td className="px-4 py-3 text-right font-display font-semibold tabular-nums text-accent-ink">{eur.format(r.investVorschlag)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Fachmontage, Inbetriebnahme und Abnahme sind mit {Math.round(MONTAGE_ANTEIL * 100)} % des Materials
                angesetzt (mindestens 250 €). Diese Position fehlte in der früheren Rechnung — deshalb sah
                die Amortisation zu gut aus.
              </p>

              <div className="mt-5 grid gap-6 sm:grid-cols-2">
                <Slider
                  id="invest" label="Investition anpassen" value={r.invest} min={300} max={12000} step={50}
                  onChange={setInvestEigen} display={eur.format(r.invest)}
                  hint={investEigen !== null ? `Vorschlag wäre ${eur.format(r.investVorschlag)}` : "entspricht der Aufstellung oben"}
                />
                <Slider
                  id="steigerung" label="Energiepreissteigerung / Jahr" value={Math.round(preissteigerung * 1000)}
                  min={0} max={80} step={5}
                  onChange={(v) => setPreissteigerung(v / 1000)}
                  display={`${komma(preissteigerung * 100)} %`}
                  hint="Wirkt auf Strom, Wärme und PV-Ersparnis. Abos bleiben bewusst flach."
                />
              </div>
              {investEigen !== null && (
                <button type="button" onClick={() => setInvestEigen(null)} className="mt-2 text-xs text-muted underline underline-offset-2 transition-colors hover:text-accent-ink cursor-pointer">
                  Vorschlag wieder übernehmen
                </button>
              )}
            </Step>

            {/* Offenlegung der Annahmen */}
            <details className="group rounded-3xl border border-line bg-surface/60 p-6 sm:p-7">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-display text-lg font-semibold tracking-tight">So rechnen wir</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-ink-soft">
                <p><strong className="font-semibold text-ink">Stromverbrauch:</strong> Startwerte in Anlehnung an den „Stromspiegel für Deutschland", getrennt nach Wohnung/Haus, Personenzahl und elektrischer Warmwasserbereitung.</p>
                <p><strong className="font-semibold text-ink">Wärme:</strong> Sie geben die Jahreskosten direkt ein — daraus ergibt sich mit dem Arbeitspreis die Energiemenge für die CO₂-Rechnung. Erdgas und Heizöl {eur2.format(HEIZARTEN.gas.preis!)}, Fernwärme {eur2.format(HEIZARTEN.fern.preis!)} je kWh; Wärmepumpe = Strompreis ÷ Jahresarbeitszahl {komma(JAZ)}.</p>
                <p><strong className="font-semibold text-ink">Einsparungen:</strong> Strom höchstens {Math.round(STROM_KAPPE * 100)} %, Wärme höchstens {Math.round(WAERME_KAPPE * 100)} % — ohne Geräte-, Kessel- oder Fenstertausch und am unteren Rand üblicher Herstellerangaben.</p>
                <p><strong className="font-semibold text-ink">Balkonkraftwerk:</strong> Leistung × spezifischer Ertrag × Eigenverbrauchsquote × Strompreis. Nur der selbst verbrauchte Strom spart Geld; der Überschuss wird ohne Einspeisevertrag unvergütet abgegeben und daher mit 0 € angesetzt.</p>
                <p><strong className="font-semibold text-ink">Server:</strong> Der Eigenverbrauch wird abgezogen — {r.serverWatt} W dauerhaft sind {nf.format(r.serverKwh)} kWh im Jahr.</p>
                <p><strong className="font-semibold text-ink">Investition:</strong> Vollständiges Paket aus Material, Fachmontage, Inbetriebnahme und Abnahme. Ein verbindlicher Preis entsteht erst nach der Besichtigung.</p>
                <p><strong className="font-semibold text-ink">Amortisation:</strong> kumulierte Ersparnis K(n) = E₁ · ((1+p)ⁿ−1)/p + A · n, wobei E₁ der energieabhängige Anteil im ersten Jahr, A die Abo-Ersparnis und p die Preissteigerung ist. Die Dauer ist das n mit K(n) = Investition.</p>
                <p><strong className="font-semibold text-ink">CO₂:</strong> {komma(CO2_STROM, 2)} kg je kWh Strom (deutscher Strommix), Wärme je Energieträger ({komma(HEIZARTEN.gas.co2!, 3)} Erdgas, {komma(HEIZARTEN.oel.co2!, 3)} Heizöl, {komma(HEIZARTEN.fern.co2!, 2)} Fernwärme). Der Serverstrom wird gegengerechnet. Ein junger Baum bindet rund {komma(CO2_BAUM_PRO_JAHR)} kg im Jahr, ein Pkw stößt etwa {nf.format(CO2_AUTO_PRO_KM * 1000)} g je Kilometer aus.</p>
                <p className="text-muted">Alle Preise sind Annahmen für 2026 und keine Zusage. Zinsen und Wartungskosten bleiben unberücksichtigt.</p>
              </div>
            </details>
          </div>

          {/* ───────────────────────── Ergebnis ───────────────────────── */}
          <aside className="noprint lg:sticky lg:top-28 lg:self-start">
            <div ref={ergebnisRef} className="overflow-hidden rounded-3xl border border-line bg-night text-canvas shadow-[0_28px_70px_-40px_rgba(33,28,23,0.8)]">
              <div className="p-7">
                <span className="eyebrow text-accent">Ihre Schätzung</span>
                <div className="mt-4">
                  <div className="font-display text-5xl font-semibold tabular-nums leading-none tracking-tight">{eur.format(animNetto)}</div>
                  <div className="mt-2 text-sm text-white/60">netto im ersten Jahr — nach Abzug des Serverstroms</div>
                </div>

                {/* Woher die Ersparnis kommt */}
                <div className="mt-6 flex h-2.5 gap-[3px] overflow-hidden rounded-full">
                  <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${anteil(r.stromEuro)}%` }} />
                  <div className="h-full rounded-full bg-amber-400/85 transition-all duration-500" style={{ width: `${anteil(r.waermeEuro)}%` }} />
                  <div className="h-full rounded-full bg-sky-400/85 transition-all duration-500" style={{ width: `${anteil(r.pvEuro)}%` }} />
                  <div className="h-full rounded-full bg-emerald-400/85 transition-all duration-500" style={{ width: `${anteil(r.aboEuro)}%` }} />
                  {r.brutto === 0 && <div className="h-full w-full rounded-full bg-white/15" />}
                </div>

                <dl className="mt-5 space-y-2.5 text-sm">
                  <Zeile farbe="bg-accent" label="Strom" zusatz={`−${Math.round(r.stromPct * 100)} %`} wert={r.stromEuro} />
                  <Zeile farbe="bg-amber-400/85" label="Wärme" zusatz={`−${Math.round(r.waermePct * 100)} %`} wert={r.waermeEuro} />
                  {pvAktiv && <Zeile farbe="bg-sky-400/85" label="Balkonkraftwerk" zusatz={`${nf.format(r.pvKwhEigen)} kWh`} wert={r.pvEuro} />}
                  <Zeile farbe="bg-emerald-400/85" label="Abos" wert={r.aboEuro} />
                  <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2.5">
                    <dt className="flex items-center gap-2 text-white/60"><Server className="h-3.5 w-3.5 shrink-0" /> Strom für den Server</dt>
                    <dd className="tabular-nums text-white/80">−{eur.format(r.serverEuro)}</dd>
                  </div>
                </dl>

                {/* Marketing-Gate: nur bei Amortisation innerhalb von 3 Jahren */}
                {amortisationZeigen && !popupWeg && (
                  <div className="mt-6 rounded-2xl border border-accent/50 bg-accent/15 p-4 print-exact">
                    <div className="flex items-start gap-2.5">
                      <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-lg font-semibold leading-tight text-canvas">
                          Trägt sich in {dauerText(r.amortisation!)}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-white/70">
                          Danach ist jede eingesparte Kilowattstunde reiner Gewinn.
                        </p>
                      </div>
                      <button
                        type="button" onClick={() => setPopupWeg(true)} aria-label="Hinweis schließen"
                        className="shrink-0 text-white/40 transition-colors hover:text-white/80 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}

                {/* Verlauf */}
                <div className="mt-7 border-t border-white/10 pt-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-white/60"><TrendingUp className="h-4 w-4" /> Kumulierte Bilanz</span>
                    <span className={`font-display text-lg font-semibold tabular-nums ${r.bilanz10 >= 0 ? "text-emerald-300" : "text-white/70"}`}>
                      {r.bilanz10 >= 0 ? "+" : ""}{eur.format(r.bilanz10)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">nach 10 Jahren, inklusive {komma(preissteigerung * 100)} % Preissteigerung</p>
                  <div className="mt-4"><PaybackChart kumuliert={r.kumuliert} /></div>
                </div>

                {/* CO₂ */}
                <div className="mt-6 rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-white/60"><Leaf className="h-4 w-4 shrink-0 text-emerald-300" /> CO₂ vermieden</span>
                    <span className="font-display font-semibold tabular-nums">{nf.format(Math.max(0, r.co2))} kg/Jahr</span>
                  </div>
                  {r.co2 > 20 && (
                    <>
                      <div className="mt-3 grid gap-2 border-t border-white/10 pt-3 text-xs">
                        <div className="flex items-center gap-2 text-white/70">
                          <TreeDeciduous className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                          wie {nf.format(r.co2Vergleich.baeume)} Bäume, die ein Jahr lang binden
                        </div>
                        <div className="flex items-center gap-2 text-white/70">
                          <Car className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
                          wie {nf.format(r.co2Vergleich.autoKm)} km, die das Auto stehen bleibt
                        </div>
                      </div>
                      <p className="mt-3 border-t border-white/10 pt-3 text-[0.7rem] leading-relaxed text-white/45">
                        Das sind {komma(r.co2Vergleich.anteilProKopf)} % des durchschnittlichen
                        Pro-Kopf-Ausstoßes in Deutschland ({komma(CO2_PRO_KOPF_DE / 1000)} t im Jahr) —
                        ein echter Beitrag, aber kein Freifahrtschein.
                      </p>
                    </>
                  )}
                </div>

                <div className="mt-6 space-y-2.5">
                  <MotionLink
                    href="/kontakt" {...pressable}
                    className="group flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer"
                  >
                    Zahlen gemeinsam prüfen
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </MotionLink>
                  <button
                    type="button" onClick={() => window.print()}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-canvas transition-colors hover:border-white/60 hover:bg-white/5 cursor-pointer"
                  >
                    <Printer className="h-4 w-4" /> Als PDF speichern oder drucken
                  </button>
                </div>
              </div>

              <p className="flex items-start gap-2 bg-black/25 px-7 py-4 text-xs leading-relaxed text-white/50">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                Unverbindliche Schätzung auf Basis Ihrer Angaben und der offengelegten Annahmen.
                Was in Ihrem Zuhause tatsächlich möglich ist, sagt Ihnen erst ein Blick vor Ort.
              </p>
            </div>
          </aside>
        </div>

        {/* ═══════════════ Druckbogen (nur im PDF/Ausdruck sichtbar) ═══════════════ */}
        <div className="printonly print-exact">
          <header className="print-keep flex items-start justify-between gap-6 border-b-2 border-[#211c17] pb-4">
            <div>
              <p className="text-[8pt] uppercase tracking-[0.22em] text-[#8a8076]">{kontakt.companyName}</p>
              <h1 className="mt-1 font-display text-[20pt] font-semibold leading-tight text-[#211c17]">
                Energie-Spar-Analyse
              </h1>
              <p className="mt-1 text-[9pt] text-[#4d453c]">
                {wohnform === "haus" ? "Einfamilienhaus" : "Wohnung"} · {flaeche} m² · {personen} {personen === 1 ? "Person" : "Personen"} · erstellt am {heute}
              </p>
            </div>
            <div className="text-right text-[8.5pt] leading-snug text-[#4d453c]">
              <p>{kontakt.email}</p>
              <p>{kontakt.phone}</p>
              <p>{kontakt.region}</p>
            </div>
          </header>

          {/* Ergebnis groß */}
          <section className="print-keep mt-6 flex items-end justify-between gap-6 rounded-[3mm] border-[0.4mm] border-[#b0543a] bg-[#ecd9cf] px-6 py-5">
            <div>
              <p className="text-[8pt] uppercase tracking-[0.22em] text-[#8d4129]">Mögliche Ersparnis</p>
              <p className="mt-1 font-display text-[28pt] font-semibold leading-none text-[#211c17]">
                {eur.format(Math.max(0, r.netto))}
              </p>
              <p className="mt-1 text-[9pt] text-[#4d453c]">netto im ersten Jahr, nach Abzug des Serverstroms</p>
            </div>
            <div className="text-right">
              <p className="text-[9pt] text-[#4d453c]">Bilanz nach 10 Jahren</p>
              <p className="font-display text-[15pt] font-semibold tabular-nums text-[#8d4129]">
                {r.bilanz10 >= 0 ? "+" : ""}{eur.format(r.bilanz10)}
              </p>
              {amortisationZeigen && (
                <p className="mt-1 text-[9pt] font-semibold text-[#211c17]">Trägt sich in {dauerText(r.amortisation!)}</p>
              )}
            </div>
          </section>

          <div className="mt-6 grid grid-cols-2 gap-5">
            {/* Eingaben */}
            <section className="print-card print-keep p-4">
              <h2 className="font-display text-[11pt] font-semibold text-[#211c17]">Ihre Angaben</h2>
              <table className="mt-2 w-full text-[9pt]">
                <tbody className="align-top">
                  <PrintRow label="Stromverbrauch" wert={`${nf.format(verbrauch)} kWh / Jahr`} />
                  <PrintRow label="Strompreis" wert={`${komma(strompreis, 2)} €/kWh`} />
                  {r.waermeDetail.map((d) => (
                    <PrintRow key={d.id} label={HEIZARTEN[d.art].label} wert={`${eur.format(d.jahreskosten)} / Jahr · ${nf.format(d.kwh)} kWh`} />
                  ))}
                  {r.waermeDetail.length === 0 && <PrintRow label="Wärme" wert="keine Angabe" />}
                  <PrintRow label="Strommaßnahmen" wert={STROM_MASSNAHMEN.filter((m) => stromMass.has(m.key)).map((m) => m.label).join(", ") || "keine"} />
                  <PrintRow label="Wärmemaßnahmen" wert={WAERME_MASSNAHMEN.filter((m) => waermeMass.has(m.key)).map((m) => m.label).join(", ") || "keine"} />
                  <PrintRow label="Server" wert={`${SERVER.find((s) => s.key === serverKey)!.label} · ${r.serverWatt} W`} />
                  <PrintRow
                    label="Balkonkraftwerk"
                    wert={pvAktiv ? `${nf.format(pvWp)} Wp · ${nf.format(pvSpezErtrag)} kWh/kWp · ${Math.round(pvEigenverbrauch * 100)} % Eigenverbrauch` : "nicht eingeplant"}
                  />
                  <PrintRow label="Abos, die wegfallen" wert={CLOUD.filter((c) => abos.has(c.key)).map((c) => c.label).join(", ") || "keine"} />
                  <PrintRow label="Preissteigerung" wert={`${komma(preissteigerung * 100)} % pro Jahr`} />
                </tbody>
              </table>
            </section>

            {/* Ersparnis */}
            <section className="print-card print-keep p-4">
              <h2 className="font-display text-[11pt] font-semibold text-[#211c17]">Jahresersparnis</h2>
              <table className="mt-2 w-full text-[9pt]">
                <tbody>
                  <PrintRow label={`Strom (−${Math.round(r.stromPct * 100)} %)`} wert={`${eur.format(r.stromEuro)} · ${nf.format(r.stromKwh)} kWh`} />
                  <PrintRow label={`Wärme (−${Math.round(r.waermePct * 100)} %)`} wert={`${eur.format(r.waermeEuro)} · ${nf.format(r.waermeKwh)} kWh`} />
                  {pvAktiv && <PrintRow label="Balkonkraftwerk" wert={`${eur.format(r.pvEuro)} · ${nf.format(r.pvKwhEigen)} kWh selbst genutzt`} />}
                  <PrintRow label="Wegfallende Abos" wert={`${eur.format(r.aboEuro)} · ${eur2.format(r.aboMonat)}/Monat`} />
                  <PrintRow label="Strom für den Server" wert={`−${eur.format(r.serverEuro)} · ${nf.format(r.serverKwh)} kWh`} />
                  <tr className="border-t-[0.3mm] border-[#211c17]">
                    <td className="pt-2 font-semibold text-[#211c17]">Netto im ersten Jahr</td>
                    <td className="pt-2 text-right font-semibold tabular-nums text-[#211c17]">{eur.format(r.netto)}</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="mt-5 font-display text-[11pt] font-semibold text-[#211c17]">CO₂-Bilanz</h2>
              <p className="mt-1 text-[9pt] leading-relaxed text-[#4d453c]">
                <strong className="text-[#211c17]">{nf.format(Math.max(0, r.co2))} kg CO₂</strong> weniger pro Jahr — so viel binden
                rund {nf.format(r.co2Vergleich.baeume)} junge Bäume in einem Jahr, oder so viel entsteht
                auf {nf.format(r.co2Vergleich.autoKm)} Autokilometern. Das entspricht {komma(r.co2Vergleich.anteilProKopf)} %
                des durchschnittlichen Pro-Kopf-Ausstoßes in Deutschland.
              </p>
            </section>
          </div>

          {/* Investition */}
          <section className="print-card print-keep mt-5 p-4">
            <h2 className="font-display text-[11pt] font-semibold text-[#211c17]">Investition — vollständiges Paket</h2>
            <table className="mt-2 w-full text-[9pt]">
              <tbody>
                {r.posten.map((p) => (
                  <PrintRow key={p.label} label={p.label} wert={eur.format(p.betrag)} />
                ))}
                <tr className="border-t-[0.3mm] border-[#211c17]">
                  <td className="pt-2 font-semibold text-[#211c17]">Gesamt</td>
                  <td className="pt-2 text-right font-semibold tabular-nums text-[#211c17]">{eur.format(r.invest)}</td>
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[8pt] leading-relaxed text-[#8a8076]">
              Enthält Material, Fachmontage, Inbetriebnahme und Abnahme. Unverbindliche Schätzung —
              ein verbindliches Angebot entsteht nach der Besichtigung vor Ort.
            </p>
          </section>

          {/* Verlauf als Tabelle — druckt sauberer als ein Diagramm */}
          <section className="print-card print-keep mt-5 p-4">
            <h2 className="font-display text-[11pt] font-semibold text-[#211c17]">Kumulierte Bilanz</h2>
            <table className="mt-2 w-full text-[8.5pt]">
              <thead>
                <tr className="border-b-[0.2mm] border-[#d3c8b5] text-left text-[#8a8076]">
                  <th className="pb-1 font-medium">Jahr</th>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((j) => (
                    <th key={j} className="pb-1 text-right font-medium">{j}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="pt-1.5 text-[#4d453c]">Bilanz</td>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((j) => {
                    const v = r.kumuliert(j);
                    return (
                      <td key={j} className={`pt-1.5 text-right tabular-nums ${v >= 0 ? "font-semibold text-[#211c17]" : "text-[#8a8076]"}`}>
                        {eur.format(v)}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
            <p className="mt-2 text-[8pt] text-[#8a8076]">
              Kumulierte Ersparnis minus Investition, inklusive {komma(preissteigerung * 100)} % Energiepreissteigerung pro Jahr.
              Ab dem ersten positiven Wert hat sich das Paket bezahlt.
            </p>
          </section>

          {/* Fuß mit Kontakt und Handlungsaufforderung */}
          <footer className="print-keep mt-6 border-t-2 border-[#211c17] pt-4">
            <div className="flex items-start justify-between gap-6">
              <div className="max-w-[60%]">
                <p className="font-display text-[12pt] font-semibold text-[#211c17]">Sollen wir das gemeinsam durchrechnen?</p>
                <p className="mt-1 text-[9pt] leading-relaxed text-[#4d453c]">
                  Wir sehen uns Ihr Zuhause vor Ort an, prüfen die Zahlen an Ihrer echten Abrechnung
                  und machen Ihnen ein verbindliches Angebot. Die Anmeldung des Balkonkraftwerks bei
                  Bundesnetzagentur und Netzbetreiber übernehmen wir komplett.
                </p>
              </div>
              <div className="text-right text-[9pt] leading-relaxed text-[#4d453c]">
                <p className="font-semibold text-[#211c17]">{kontakt.companyName}</p>
                <p>{kontakt.email}</p>
                <p>{kontakt.phone}</p>
                <p>{kontakt.region}</p>
              </div>
            </div>
            <p className="mt-3 text-[7.5pt] leading-snug text-[#8a8076]">
              Unverbindliche Schätzung auf Basis Ihrer Angaben. Einsparwerte am unteren Rand üblicher
              Herstellerangaben; Strom höchstens {Math.round(STROM_KAPPE * 100)} %, Wärme höchstens {Math.round(WAERME_KAPPE * 100)} %.
              CO₂-Faktoren: {komma(CO2_STROM, 2)} kg/kWh Strom, {komma(HEIZARTEN.gas.co2!, 3)} Erdgas, {komma(HEIZARTEN.oel.co2!, 3)} Heizöl,
              {" "}{komma(HEIZARTEN.fern.co2!, 2)} Fernwärme. Keine Zusage, keine Rechtsberatung.
            </p>
          </footer>
        </div>
      </div>

      {/* Mitlaufende Ergebnis-Leiste auf schmalen Bildschirmen */}
      <div
        className={`noprint pointer-events-none fixed inset-x-4 bottom-5 z-[80] flex justify-start transition-all duration-300 lg:hidden ${
          leisteSichtbar ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
        aria-hidden={!leisteSichtbar}
      >
        <div className="pointer-events-auto mr-16 flex items-center gap-3 rounded-2xl border border-line bg-night/95 px-4 py-2.5 text-canvas shadow-[0_20px_50px_-24px_rgba(33,28,23,0.9)] backdrop-blur">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent"><Zap className="h-4 w-4 text-white" /></span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold tabular-nums">{eur.format(animNetto)}</span>
            <span className="block text-[0.7rem] text-white/55">netto im ersten Jahr</span>
          </span>
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────────── kleine Bausteine ─────────────────────────── */

function Zeile({ farbe, label, zusatz, wert }: { farbe: string; label: string; zusatz?: string; wert: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex min-w-0 items-center gap-2 text-white/60">
        <span className={`h-2 w-2 shrink-0 rounded-full ${farbe}`} />
        <span className="truncate">{label}</span>
        {zusatz && <span className="shrink-0 text-white/35">{zusatz}</span>}
      </dt>
      <dd className="shrink-0 tabular-nums">{eur.format(wert)}</dd>
    </div>
  );
}

function PrintRow({ label, wert }: { label: string; wert: string }) {
  return (
    <tr>
      <td className="py-[1.2mm] pr-3 text-[#4d453c]">{label}</td>
      <td className="py-[1.2mm] text-right tabular-nums text-[#211c17]">{wert}</td>
    </tr>
  );
}
