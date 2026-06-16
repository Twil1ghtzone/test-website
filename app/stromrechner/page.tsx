"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Zap, ArrowRight, Info, Check } from "lucide-react";

// Strom-Maßnahmen (Anteil am Stromverbrauch, der eingespart werden kann)
const MEASURES = [
  { key: "heizung", label: "Intelligente Heizungssteuerung", hint: "regelt automatisch nach Bedarf", pct: 0.12 },
  { key: "beleuchtung", label: "Gesteuerte, effiziente Beleuchtung", hint: "Licht nur, wo es gebraucht wird", pct: 0.05 },
  { key: "standby", label: "Stand-by automatisch abschalten", hint: "Geräte aus, wenn niemand sie braucht", pct: 0.06 },
] as const;

// Cloud-Abos als einzelne Posten (typische Monatspreise — anpassbar)
const CLOUD = [
  { key: "icloud", label: "iCloud+", price: 2.99 },
  { key: "google", label: "Google One", price: 1.99 },
  { key: "dropbox", label: "Dropbox", price: 11.99 },
  { key: "onedrive", label: "Microsoft 365 / OneDrive", price: 2.0 },
  { key: "photos", label: "Foto-Backup-Dienst", price: 4.99 },
  { key: "backup", label: "Online-Backup", price: 6.0 },
] as const;

const nf = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });

const PERSONS = [1, 2, 3, 4, 5];
const verbrauchFor = (p: number) => 1500 + p * 800; // grobe Richtwerte

export default function StromrechnerPage() {
  const [personen, setPersonen] = useState(3);
  const [verbrauch, setVerbrauch] = useState(verbrauchFor(3));
  const [preis, setPreis] = useState(0.35);
  const [measures, setMeasures] = useState<Set<string>>(new Set(["heizung", "standby"]));
  const [abos, setAbos] = useState<Set<string>>(new Set(["icloud", "google"]));

  function setPersons(p: number) {
    setPersonen(p);
    setVerbrauch(verbrauchFor(p));
  }
  const toggle = (set: Set<string>, setter: (s: Set<string>) => void, key: string) => {
    const n = new Set(set);
    n.has(key) ? n.delete(key) : n.add(key);
    setter(n);
  };

  const result = useMemo(() => {
    const pct = Math.min(0.3, MEASURES.filter((m) => measures.has(m.key)).reduce((s, m) => s + m.pct, 0));
    const kWhSaved = verbrauch * pct;
    const stromEuro = kWhSaved * preis;
    const aboMonth = CLOUD.filter((c) => abos.has(c.key)).reduce((s, c) => s + c.price, 0);
    const aboEuro = aboMonth * 12;
    return { pct, kWhSaved, stromEuro, aboMonth, aboEuro, total: stromEuro + aboEuro };
  }, [verbrauch, preis, measures, abos]);

  const cardHover = "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-18px_rgba(33,28,23,0.18)]";

  return (
    <main className="px-5 pt-32 pb-24 sm:pt-40">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <span className="text-ink-soft">Strom-Spar-Rechner</span>
        </nav>

        <div className="mt-8 max-w-2xl">
          <span className="inline-flex items-center gap-2 eyebrow text-accent">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white"><Zap className="h-5 w-5" /></span>
            Strom-Spar-Rechner
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold leading-[1.1] tracking-tight sm:text-[2.8rem]">
            Wie viel können Sie <span className="emph">einsparen?</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Ein paar Angaben genügen — Sie sehen sofort eine Schätzung, wie viel Strom und Geld
            eine lokale, intelligente Lösung pro Jahr sparen kann.
          </p>
        </div>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* Eingaben */}
          <div className="space-y-6">
            {/* Haushalt */}
            <section className={`rounded-3xl border border-line bg-surface p-6 sm:p-7 ${cardHover}`}>
              <h2 className="font-display text-lg font-semibold tracking-tight">1 · Ihr Haushalt</h2>

              <div className="mt-5">
                <span className="text-sm font-medium text-ink">Personen im Haushalt</span>
                <div className="mt-2 flex gap-2">
                  {PERSONS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPersons(p)}
                      className={`h-10 flex-1 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
                        personen === p ? "border-accent bg-accent text-white" : "border-line bg-canvas text-ink hover:border-line-strong"
                      }`}
                    >
                      {p === 5 ? "5+" : p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between text-sm font-medium text-ink">
                    <label htmlFor="verbrauch">Verbrauch / Jahr</label>
                    <span className="text-accent-ink">{nf.format(verbrauch)} kWh</span>
                  </div>
                  <input id="verbrauch" type="range" min={1000} max={8000} step={100} value={verbrauch}
                    onChange={(e) => setVerbrauch(+e.target.value)} className="mt-3 w-full accent-[var(--color-accent)] cursor-pointer" />
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm font-medium text-ink">
                    <label htmlFor="preis">Strompreis</label>
                    <span className="text-accent-ink">{preis.toFixed(2).replace(".", ",")} €/kWh</span>
                  </div>
                  <input id="preis" type="range" min={0.2} max={0.55} step={0.01} value={preis}
                    onChange={(e) => setPreis(+e.target.value)} className="mt-3 w-full accent-[var(--color-accent)] cursor-pointer" />
                </div>
              </div>
            </section>

            {/* Maßnahmen */}
            <section className={`rounded-3xl border border-line bg-surface p-6 sm:p-7 ${cardHover}`}>
              <h2 className="font-display text-lg font-semibold tracking-tight">2 · Strom-Maßnahmen</h2>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {MEASURES.map((m) => {
                  const on = measures.has(m.key);
                  return (
                    <button key={m.key} type="button" onClick={() => toggle(measures, setMeasures, m.key)}
                      className={`flex flex-col gap-1 rounded-2xl border p-4 text-left transition-all duration-200 cursor-pointer ${
                        on ? "border-accent bg-accent-soft/50" : "border-line bg-canvas hover:border-line-strong"
                      }`}>
                      <span className={`grid h-5 w-5 place-items-center rounded-md border ${on ? "border-accent bg-accent text-white" : "border-line-strong"}`}>
                        {on && <Check className="h-3 w-3" />}
                      </span>
                      <span className="mt-1 text-sm font-medium leading-tight text-ink">{m.label}</span>
                      <span className="text-xs leading-snug text-muted">{m.hint} · bis {Math.round(m.pct * 100)} %</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Cloud-Abos */}
            <section className={`rounded-3xl border border-line bg-surface p-6 sm:p-7 ${cardHover}`}>
              <div className="flex items-end justify-between gap-4">
                <h2 className="font-display text-lg font-semibold tracking-tight">3 · Cloud-Abos, die wegfallen</h2>
                <span className="text-sm font-medium text-accent-ink">{eur2.format(result.aboMonth)}/Mon.</span>
              </div>
              <p className="mt-1 text-sm text-muted">Wählen Sie, was Sie heute zahlen — ein eigener Server ersetzt es.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {CLOUD.map((c) => {
                  const on = abos.has(c.key);
                  return (
                    <button key={c.key} type="button" onClick={() => toggle(abos, setAbos, c.key)}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 cursor-pointer ${
                        on ? "border-accent bg-accent-soft/50" : "border-line bg-canvas hover:border-line-strong"
                      }`}>
                      <span className="flex items-center gap-2.5">
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border ${on ? "border-accent bg-accent text-white" : "border-line-strong"}`}>
                          {on && <Check className="h-3 w-3" />}
                        </span>
                        <span className="text-sm font-medium text-ink">{c.label}</span>
                      </span>
                      <span className="text-sm text-muted">{eur2.format(c.price)}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Ergebnis */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="overflow-hidden rounded-3xl border border-line bg-night text-canvas">
              <div className="p-7">
                <span className="eyebrow text-accent">Ihre Schätzung</span>
                <div className="mt-4">
                  <div className="font-display text-5xl font-semibold tracking-tight">{eur.format(result.total)}</div>
                  <div className="mt-1 text-white/60">mögliche Ersparnis pro Jahr</div>
                </div>

                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15">
                  <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${Math.round(result.pct * 100)}%` }} />
                </div>
                <div className="mt-2 text-sm text-white/60">−{Math.round(result.pct * 100)} % Stromverbrauch</div>

                <dl className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-white/60">Strom gespart</dt>
                    <dd className="text-right font-medium">{nf.format(result.kWhSaved)} kWh<br /><span className="text-white/70">{eur.format(result.stromEuro)}/Jahr</span></dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-white/60">Wegfallende Abos</dt>
                    <dd className="font-medium">{eur.format(result.aboEuro)}/Jahr</dd>
                  </div>
                </dl>

                <Link href="/kontakt" className="group mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer">
                  Jetzt beraten lassen
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
              <p className="flex items-start gap-2 bg-black/20 px-7 py-4 text-xs leading-relaxed text-white/50">
                <Info className="mt-0.5 h-4 w-4 shrink-0" />
                Unverbindliche Schätzung auf Basis Ihrer Angaben. Die tatsächliche Ersparnis hängt von Ihrem Zuhause ab — gern ermitteln wir sie gemeinsam vor Ort.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
