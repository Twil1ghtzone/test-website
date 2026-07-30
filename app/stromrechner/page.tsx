"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MotionLink, pressable } from "@/components/ui/motion";
import { Zap, ArrowRight, Info, Check, Leaf, Server, TrendingUp, ChevronDown } from "lucide-react";
import {
  berechne, basisVerbrauch, basisWaerme,
  STROM_MASSNAHMEN, STROM_KAPPE, WAERME_MASSNAHMEN, WAERME_KAPPE,
  WAERME_SPEZ, HEIZARTEN, JAZ, CO2_STROM, CLOUD, SERVER,
  type Wohnform, type Heizart, type ServerKey,
} from "@/lib/sparrechner";

const nf = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

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
  id, label, value, min, max, step, onChange, display,
}: {
  id: string; label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display: string;
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
          key={o.value} type="button" onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
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

function PaybackChart({ invest, netto }: { invest: number; netto: number }) {
  const years = Array.from({ length: 11 }, (_, i) => i);
  const values = years.map((y) => netto * y - invest);
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const zeroY = (max / span) * 100; // Nulllinie in % von oben

  return (
    <div>
      <div className="relative h-28">
        {/* Nulllinie */}
        <div className="absolute inset-x-0 border-t border-dashed border-white/25" style={{ top: `${zeroY}%` }} />
        <div className="relative flex h-full items-stretch gap-[3px]">
          {values.map((v, i) => {
            const h = (Math.abs(v) / span) * 100;
            const positiv = v >= 0;
            return (
              <div key={i} className="group relative flex-1">
                <div
                  className={`absolute w-full rounded-[3px] transition-all duration-500 ${positiv ? "bg-accent" : "bg-white/22"}`}
                  style={
                    positiv
                      ? { bottom: `${100 - zeroY}%`, height: `${h}%` }
                      : { top: `${zeroY}%`, height: `${h}%` }
                  }
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
        <span>Jahr 0</span>
        <span>Jahr 5</span>
        <span>Jahr 10</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════ Seite ═══════════════════════════════ */

export default function SparrechnerPage() {
  const [wohnform, setWohnform] = useState<Wohnform>("haus");
  const [personen, setPersonen] = useState(3);
  const [warmwasserStrom, setWarmwasserStrom] = useState(false);
  const [flaeche, setFlaeche] = useState(130);
  const [verbrauch, setVerbrauch] = useState<number>(basisVerbrauch("haus", 3, false));
  const [preis, setPreis] = useState(0.35);
  const [heizart, setHeizart] = useState<Heizart>("gas");
  const [waermeBedarf, setWaermeBedarf] = useState<number>(basisWaerme("haus", 130));
  const [stromMass, setStromMass] = useState<Set<string>>(new Set(["standby", "messung"]));
  const [waermeMass, setWaermeMass] = useState<Set<string>>(new Set(["einzelraum", "abwesend"]));
  const [abos, setAbos] = useState<Set<string>>(new Set(["icloud", "google"]));
  const [serverKey, setServerKey] = useState<ServerKey>("nas");
  const [investEigen, setInvestEigen] = useState<number | null>(null); // null = Vorschlag übernehmen

  // Verbrauchs- und Bedarfsvorgaben folgen den Eckdaten, solange der Nutzer
  // die Regler nicht selbst angefasst hat — danach bleibt seine Eingabe stehen.
  const [verbrauchBerührt, setVerbrauchBerührt] = useState(false);
  const [waermeBerührt, setWaermeBerührt] = useState(false);

  useEffect(() => {
    if (verbrauchBerührt) return;
    setVerbrauch(basisVerbrauch(wohnform, personen, warmwasserStrom));
  }, [wohnform, personen, warmwasserStrom, verbrauchBerührt]);

  useEffect(() => {
    if (waermeBerührt) return;
    setWaermeBedarf(basisWaerme(wohnform, flaeche));
  }, [flaeche, wohnform, waermeBerührt]);

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const n = new Set(set);
    if (n.has(key)) n.delete(key); else n.add(key);
    setter(n);
  };

  const r = useMemo(
    () => berechne({ verbrauch, strompreis: preis, heizart, waermeBedarf, flaeche, stromMass, waermeMass, abos, serverKey, investEigen }),
    [verbrauch, preis, heizart, waermeBedarf, flaeche, stromMass, waermeMass, abos, serverKey, investEigen]
  );

  const animNetto = useAnimatedNumber(Math.max(0, r.netto));

  // Kompakte Ergebnis-Leiste auf dem Handy, sobald die Ergebniskarte
  // aus dem Blick gescrollt ist. Bleibt links, damit sie den
  // Support-Knopf unten rechts nicht überdeckt.
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

  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <span className="text-ink-soft">Energie-Spar-Rechner</span>
        </nav>

        <div className="mt-8 max-w-2xl">
          <span className="inline-flex items-center gap-2 eyebrow text-accent">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white"><Zap className="h-5 w-5" /></span>
            Energie-Spar-Rechner
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.8rem]">
            Was bleibt am Jahresende <span className="emph">wirklich übrig?</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Diese Schätzung rechnet Strom und Wärme getrennt, zieht den Eigenverbrauch
            des Servers wieder ab und stellt die einmalige Investition dagegen. Die
            Einsparwerte liegen bewusst am unteren Rand — lieber positiv überrascht werden.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_23rem]">
          {/* ───────────────────────── Eingaben ───────────────────────── */}
          <div className="space-y-6">
            <Step no={1} title="Ihr Zuhause" subtitle="Daraus ergeben sich die Startwerte — jeden Regler können Sie überschreiben.">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <span className="mb-2 block text-sm font-medium text-ink">Wohnform</span>
                  <Segmented
                    ariaLabel="Wohnform"
                    value={wohnform}
                    onChange={(v) => { setWohnform(v); setFlaeche(v === "haus" ? 130 : 75); setVerbrauchBerührt(false); setWaermeBerührt(false); }}
                    options={[{ value: "wohnung", label: "Wohnung" }, { value: "haus", label: "Haus" }]}
                  />
                </div>
                <div>
                  <span className="mb-2 block text-sm font-medium text-ink">Personen</span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((p) => (
                      <button
                        key={p} type="button" onClick={() => { setPersonen(p); setVerbrauchBerührt(false); }} aria-pressed={personen === p}
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
                  id="preis" label="Ihr Strompreis" value={preis}
                  min={0.2} max={0.55} step={0.01}
                  onChange={setPreis}
                  display={`${preis.toFixed(2).replace(".", ",")} €/kWh`}
                />
              </div>
            </Step>

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
                Ohne Geräteaustausch ist beim reinen Haushaltsstrom deutlich weniger drin, als oft
                versprochen wird. Der große Hebel liegt bei der Wärme — siehe nächster Schritt.
              </p>
            </Step>

            <Step no={3} title="Wärme sparen" subtitle="Smarte Steuerung spart Heizenergie, nicht Strom. Deshalb rechnen wir sie mit Ihrem Wärmepreis.">
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <span className="mb-2 block text-sm font-medium text-ink">Heizung</span>
                  <Segmented
                    ariaLabel="Heizart" value={heizart} onChange={setHeizart}
                    options={[
                      { value: "gas", label: "Gas" }, { value: "oel", label: "Öl" },
                      { value: "fern", label: "Fernwärme" }, { value: "wp", label: "Wärmepumpe" },
                    ]}
                  />
                  <p className="mt-2 text-xs text-muted">
                    Rechnet mit {r.waermePreis.toFixed(2).replace(".", ",")} €/kWh Wärme
                    {heizart === "wp" && ` (Strompreis ÷ Jahresarbeitszahl ${String(JAZ).replace(".", ",")})`}
                  </p>
                </div>
                <Slider
                  id="flaeche" label="Wohnfläche" value={flaeche} min={40} max={300} step={5}
                  onChange={(v) => { setFlaeche(v); setWaermeBerührt(false); }}
                  display={`${flaeche} m²`}
                />
              </div>

              <div className="mt-5">
                <Slider
                  id="waerme" label="Heizenergie / Jahr" value={waermeBedarf}
                  min={2000} max={45000} step={500}
                  onChange={(v) => { setWaermeBedarf(v); setWaermeBerührt(true); }}
                  display={`${nf.format(waermeBedarf)} kWh`}
                />
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
            </Step>

            <Step no={4} title="Abos, die wegfallen" subtitle="Wählen Sie, was Sie heute monatlich zahlen — ein eigener Server übernimmt das.">
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

            <Step no={5} title="Was der Server kostet" subtitle="Er verbraucht selbst Strom und muss einmal angeschafft werden. Beides zählt hier dagegen.">
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

              <div className="mt-5">
                <Slider
                  id="invest" label="Einmalige Investition" value={r.invest}
                  min={300} max={6000} step={50}
                  onChange={setInvestEigen}
                  display={eur.format(r.invest)}
                />
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                  <span>Vorschlag aus Ihrer Auswahl: {eur.format(r.investVorschlag)}</span>
                  {investEigen !== null && investEigen !== r.investVorschlag && (
                    <button type="button" onClick={() => setInvestEigen(null)} className="underline underline-offset-2 transition-colors hover:text-accent-ink cursor-pointer">
                      Vorschlag übernehmen
                    </button>
                  )}
                </div>
              </div>
            </Step>

            {/* Offenlegung der Annahmen — schafft mehr Vertrauen als jede große Zahl. */}
            <details className="group rounded-3xl border border-line bg-surface/60 p-6 sm:p-7">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                <span className="font-display text-lg font-semibold tracking-tight">So rechnen wir</span>
                <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
              </summary>
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-ink-soft">
                <p><strong className="font-semibold text-ink">Stromverbrauch:</strong> Startwerte in Anlehnung an den „Stromspiegel für Deutschland", getrennt nach Wohnung/Haus, Personenzahl und elektrischer Warmwasserbereitung.</p>
                <p><strong className="font-semibold text-ink">Wärmebedarf:</strong> {WAERME_SPEZ[wohnform]} kWh je m² und Jahr für {wohnform === "haus" ? "ein Haus" : "eine Wohnung"} im teilsanierten Bestand. Ihr echter Wert steht auf der Heizkostenabrechnung — tragen Sie ihn gern direkt ein.</p>
                <p><strong className="font-semibold text-ink">Einsparungen:</strong> Strom höchstens {Math.round(STROM_KAPPE * 100)} %, Wärme höchstens {Math.round(WAERME_KAPPE * 100)} %. Beides ohne Geräte- oder Kesseltausch und am unteren Rand üblicher Herstellerangaben.</p>
                <p><strong className="font-semibold text-ink">Wärmepreis:</strong> Gas und Öl {eur2.format(HEIZARTEN.gas.preis!)}, Fernwärme {eur2.format(HEIZARTEN.fern.preis!)} je kWh. Bei der Wärmepumpe Ihr Strompreis geteilt durch die Jahresarbeitszahl {String(JAZ).replace(".", ",")}.</p>
                <p><strong className="font-semibold text-ink">Server:</strong> Der Eigenverbrauch wird mit Ihrem Strompreis abgezogen — {r.serverWatt} W dauerhaft sind {nf.format(r.serverKwh)} kWh im Jahr.</p>
                <p><strong className="font-semibold text-ink">CO₂:</strong> {String(CO2_STROM).replace(".", ",")} kg je kWh Strom (deutscher Strommix), Wärme je nach Energieträger. Der Serverstrom wird gegengerechnet.</p>
                <p><strong className="font-semibold text-ink">Investition:</strong> grobe Schätzung aus Ihrer Auswahl, inklusive Material und Einrichtung. Ein verbindlicher Preis entsteht erst nach der Besichtigung.</p>
                <p className="text-muted">Preise sind Annahmen für 2026 und keine Zusage. Zinsen und Preissteigerungen bleiben unberücksichtigt.</p>
              </div>
            </details>
          </div>

          {/* ───────────────────────── Ergebnis ───────────────────────── */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div ref={ergebnisRef} className="overflow-hidden rounded-3xl border border-line bg-night text-canvas shadow-[0_28px_70px_-40px_rgba(33,28,23,0.8)]">
              <div className="p-7">
                <span className="eyebrow text-accent">Ihre Schätzung</span>
                <div className="mt-4">
                  <div className="font-display text-5xl font-semibold tabular-nums leading-none tracking-tight">
                    {eur.format(animNetto)}
                  </div>
                  <div className="mt-2 text-sm text-white/60">
                    netto pro Jahr — nach Abzug des Serverstroms
                  </div>
                </div>

                {/* Woher die Ersparnis kommt */}
                <div className="mt-6 flex h-2.5 gap-[3px] overflow-hidden rounded-full">
                  <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${anteil(r.stromEuro)}%` }} />
                  <div className="h-full rounded-full bg-amber-400/85 transition-all duration-500" style={{ width: `${anteil(r.waermeEuro)}%` }} />
                  <div className="h-full rounded-full bg-emerald-400/85 transition-all duration-500" style={{ width: `${anteil(r.aboEuro)}%` }} />
                  {r.brutto === 0 && <div className="h-full w-full rounded-full bg-white/15" />}
                </div>

                <dl className="mt-5 space-y-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-white/60">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                      Strom <span className="text-white/35">−{Math.round(r.stromPct * 100)} %</span>
                    </dt>
                    <dd className="tabular-nums">{eur.format(r.stromEuro)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-white/60">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400/85" />
                      Wärme <span className="text-white/35">−{Math.round(r.waermePct * 100)} %</span>
                    </dt>
                    <dd className="tabular-nums">{eur.format(r.waermeEuro)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-2 text-white/60">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400/85" />
                      Abos
                    </dt>
                    <dd className="tabular-nums">{eur.format(r.aboEuro)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-2.5">
                    <dt className="flex items-center gap-2 text-white/60">
                      <Server className="h-3.5 w-3.5 shrink-0" />
                      Strom für den Server
                    </dt>
                    <dd className="tabular-nums text-white/80">−{eur.format(r.serverEuro)}</dd>
                  </div>
                </dl>

                {/* Amortisation */}
                <div className="mt-7 border-t border-white/10 pt-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-white/60">
                      <TrendingUp className="h-4 w-4" /> Wann es sich trägt
                    </span>
                    <span className="font-display text-lg font-semibold tabular-nums text-accent">
                      {r.amortisation === null
                        ? "—"
                        : r.amortisation <= 10
                          ? `nach ${r.amortisation.toFixed(1).replace(".", ",")} Jahren`
                          : "über 10 Jahre"}
                    </span>
                  </div>
                  <div className="mt-4">
                    <PaybackChart invest={r.invest} netto={r.netto} />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-white/60">Bilanz nach 10 Jahren</span>
                    <span className={`font-semibold tabular-nums ${r.bilanz10 >= 0 ? "text-emerald-300" : "text-white/70"}`}>
                      {r.bilanz10 >= 0 ? "+" : ""}{eur.format(r.bilanz10)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3.5 py-3 text-sm">
                  <span className="flex items-center gap-2 text-white/60"><Leaf className="h-4 w-4 shrink-0 text-emerald-300" /> CO₂ vermieden</span>
                  <span className="tabular-nums">{nf.format(Math.max(0, r.co2))} kg/Jahr</span>
                </div>

                <MotionLink
                  href="/kontakt" {...pressable}
                  className="group mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer"
                >
                  Zahlen gemeinsam prüfen
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </MotionLink>
              </div>

              <p className="flex items-start gap-2 bg-black/25 px-7 py-4 text-xs leading-relaxed text-white/50">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                Unverbindliche Schätzung auf Basis Ihrer Angaben und der offengelegten Annahmen.
                Was in Ihrem Zuhause tatsächlich möglich ist, sagt Ihnen erst ein Blick vor Ort.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* Mitlaufende Ergebnis-Leiste auf schmalen Bildschirmen */}
      <div
        className={`pointer-events-none fixed inset-x-4 bottom-5 z-[80] flex justify-start transition-all duration-300 lg:hidden ${
          leisteSichtbar ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
        }`}
        aria-hidden={!leisteSichtbar}
      >
        <div className="pointer-events-auto mr-16 flex items-center gap-3 rounded-2xl border border-line bg-night/95 px-4 py-2.5 text-canvas shadow-[0_20px_50px_-24px_rgba(33,28,23,0.9)] backdrop-blur">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent"><Zap className="h-4 w-4 text-white" /></span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold tabular-nums">{eur.format(animNetto)}</span>
            <span className="block text-[0.7rem] text-white/55">netto pro Jahr</span>
          </span>
        </div>
      </div>
    </main>
  );
}
