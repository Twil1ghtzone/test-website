"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MotionLink, pressable } from "@/components/ui/motion";
import {
  Zap, ArrowRight, Info, Leaf, Server, TrendingUp, ChevronDown,
  Plus, Trash2, Sun, Printer, Flame, Sparkles, TreeDeciduous, Car, ShieldCheck,
} from "lucide-react";
import {
  berechne, basisVerbrauch, kostenVorschlag,
  STROM_MASSNAHMEN, STROM_KAPPE, WAERME_MASSNAHMEN, WAERME_KAPPE,
  WAERME_SPEZ, HEIZARTEN, HEIZART_KEYS, JAZ, CO2_STROM, CLOUD, SERVER,
  PV_WP_STANDARD, PV_SPEZ_ERTRAG_STANDARD, PV_EIGENVERBRAUCH_STANDARD,
  PREISSTEIGERUNG_STANDARD, AMORTISATION_ZEIGEN_BIS_JAHRE, PV_LASTVERSCHIEBUNG_BONUS,
  CO2_BAUM_PRO_JAHR, CO2_AUTO_PRO_KM, CO2_PRO_KOPF_DE,
  type Wohnform, type Heizart, type ServerKey, type Waermequelle,
} from "@/lib/sparrechner";
import { nf, eur, eur2, komma, dauerText, type Kontakt } from "@/components/sparrechner/format";
import { useAnimatedNumber, Slider, Segmented, OptionCard, Step, Zeile } from "@/components/sparrechner/Primitives";
import { ErsparnisChart } from "@/components/sparrechner/ErsparnisChart";
import { PrintSheet } from "@/components/sparrechner/PrintSheet";

export type { Kontakt };

/* ═══════════════════════════════ Seite ═══════════════════════════════ */

/*
 * IDs der Wärmequellen — Grundlage für `htmlFor`/`id` der Formularfelder.
 *
 * Der Zähler stand früher auf MODULEBENE. Auf dem Server bleibt ein Modul
 * über Anfragen hinweg im Speicher, der Zähler lief also immer weiter: Der
 * Server lieferte `art-q3`, der frisch geladene Client begann wieder bei
 * `art-q1` — React meldete einen Hydration-Fehler und verwarf den Teilbaum.
 *
 * Die erste Quelle bekommt deshalb eine feste ID; erst die im Browser
 * hinzugefügten Quellen zählen hoch, und zwar in einem Ref pro Komponente.
 */
const ERSTE_QUELLE_ID = "q1";

export default function Sparrechner({ kontakt }: { kontakt: Kontakt }) {
  const quellenZaehler = useRef(1);
  const neueId = () => `q${++quellenZaehler.current}`;

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
    { id: ERSTE_QUELLE_ID, art: "gas", jahreskosten: kostenVorschlag("gas", "haus", 130, 0.35) },
  ]);

  /*
   * Rohtext der Kosten-Eingabefelder, solange dort getippt wird.
   *
   * Ohne das ließ sich die Zahl nicht löschen: Ein leeres Feld liefert "",
   * daraus wurde über `+"" || 0` sofort wieder eine 0, die im nächsten
   * Render zurück ins Feld sprang. Man musste die alte Zahl also umständlich
   * überschreiben statt sie zu leeren. Jetzt darf das Feld zwischendurch
   * leer sein; gerechnet wird solange mit 0, und beim Verlassen erscheint
   * wieder der gültige, begrenzte Wert.
   */
  const [rohKosten, setRohKosten] = useState<Record<string, string>>({});
  const rohLoeschen = (id: string) =>
    setRohKosten((r) => {
      if (!(id in r)) return r;
      const kopie = { ...r };
      delete kopie[id];
      return kopie;
    });

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
  const [pvLastverschiebung, setPvLastverschiebung] = useState(true);

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
      pvAktiv, pvWp, pvSpezErtrag, pvEigenverbrauch, pvLastverschiebung, preissteigerung, investEigen,
    }),
    [verbrauch, strompreis, waermequellen, stromMass, waermeMass, abos, serverKey, flaeche,
     pvAktiv, pvWp, pvSpezErtrag, pvEigenverbrauch, pvLastverschiebung, preissteigerung, investEigen]
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
                      // Alle Kostenvorschläge werden neu gesetzt — noch stehende
                      // Roheingaben würden sie sonst überdecken.
                      setRohKosten({});
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
                        className={`h-[3.25rem] flex-1 rounded-2xl border text-sm font-medium transition-all duration-300 active:scale-[0.96] cursor-pointer ${
                          personen === p
                            ? "border-accent bg-accent text-white shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent)_18%,transparent),0_8px_22px_-12px_color-mix(in_oklab,var(--color-accent)_75%,transparent)]"
                            : "border-line bg-canvas text-ink hover:border-line-strong active:border-accent/60"
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
                  // Nur der Verbrauchsanteil zählt — der Grundpreis läuft
                  // unabhängig weiter und lässt sich nicht wegsparen.
                  const grund = HEIZARTEN[q.art].grundpreis;
                  const verbrauchsteil = Math.max(0, q.jahreskosten - grund);
                  const kwh = preis > 0 ? verbrauchsteil / preis : 0;
                  return (
                    <div key={q.id} className="rounded-2xl border border-line bg-canvas p-3.5">
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[9rem] flex-1">
                          <label htmlFor={`art-${q.id}`} className="mb-1.5 block text-xs font-medium text-muted">Energieträger</label>
                          <select
                            id={`art-${q.id}`} value={q.art}
                            onChange={(e) => {
                              const art = e.target.value as Heizart;
                              // Neuer Energieträger = neuer Kostenvorschlag. Ein noch
                              // stehender Rohtext würde den sonst verdecken.
                              rohLoeschen(q.id);
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
                              // Während des Tippens gewinnt der Rohtext (darf leer sein),
                              // sonst der gültige Wert aus dem Zustand.
                              value={rohKosten[q.id] ?? String(q.jahreskosten)}
                              onChange={(e) => {
                                const roh = e.target.value;
                                setRohKosten((r) => ({ ...r, [q.id]: roh }));
                                const zahl = roh.trim() === "" ? 0 : Number(roh);
                                if (Number.isFinite(zahl)) {
                                  quelleAendern(q.id, { jahreskosten: Math.max(0, Math.min(20000, zahl)) });
                                }
                              }}
                              // Beim Verlassen den Rohtext verwerfen — dann zeigt das Feld
                              // den tatsächlich gerechneten, begrenzten Wert.
                              onBlur={() => rohLoeschen(q.id)}
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
                      <p className="mt-2 text-xs leading-relaxed text-muted">
                        {komma(preis, 2)} €/kWh
                        {q.art === "wp" && ` (Strompreis ÷ JAZ ${komma(JAZ)})`}
                        {grund > 0 && ` · abzüglich ca. ${eur.format(grund)} Grundpreis`}
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

                  <OptionCard
                    on={pvLastverschiebung}
                    onClick={() => setPvLastverschiebung(!pvLastverschiebung)}
                    title="Große Verbraucher in die Sonnenstunden legen"
                    hint={`Spül-/Waschmaschine und Warmwasser laufen automatisch, wenn die Sonne liefert · +${Math.round(PV_LASTVERSCHIEBUNG_BONUS * 100)} Prozentpunkte Eigenverbrauch`}
                  />
                  {pvLastverschiebung && (
                    <p className="-mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Das senkt nicht den Verbrauch, sondern erhöht den Anteil, den Sie vom
                      eigenen Strom nutzen — gerechnet wird deshalb mit {Math.round(r.pvQuote * 100)} % statt {Math.round(pvEigenverbrauch * 100)} %.
                    </p>
                  )}

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
                    className={`rounded-2xl border p-4 text-left transition-all duration-300 active:scale-[0.98] cursor-pointer ${
                      serverKey === s.key
                        ? "border-accent bg-accent-soft/45 shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-accent)_18%,transparent),0_10px_28px_-14px_color-mix(in_oklab,var(--color-accent)_65%,transparent)]"
                        : "border-line bg-canvas hover:border-line-strong active:border-accent/60"
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
                      <td className="px-4 py-3 text-right font-display font-semibold tabular-nums text-accent-ink">{eur.format(r.invest)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">
                <strong className="font-medium text-ink-soft">Unverbindlich:</strong> Diese Posten sind eine
                grobe, preisliche Einschätzung für Material, Fachmontage und Inbetriebnahme — je nach
                Gegebenheit vor Ort kann der endgültige Preis abweichen. Im persönlichen Gespräch erstellen
                wir Ihnen ein individuelles, verbindliches Angebot.
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
                <p><strong className="font-semibold text-ink">Wärme:</strong> Sie geben die Jahreskosten direkt ein. Davon wird zuerst der <strong className="font-semibold text-ink">Grundpreis</strong> abgezogen (Erdgas rund {eur.format(HEIZARTEN.gas.grundpreis)}, Fernwärme rund {eur.format(HEIZARTEN.fern.grundpreis)} im Jahr) — die Zähler- und Bereitstellungsgebühr läuft unabhängig vom Verbrauch weiter, daran kann eine Steuerung nichts sparen. Nur der verbleibende Verbrauchsanteil wird gesenkt. Arbeitspreise: Erdgas und Heizöl {eur2.format(HEIZARTEN.gas.preis!)}, Fernwärme {eur2.format(HEIZARTEN.fern.preis!)} je kWh; Wärmepumpe = Strompreis ÷ Jahresarbeitszahl {komma(JAZ)}.</p>
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
                          Trägt sich voraussichtlich in {dauerText(r.amortisation!)}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-white/70">
                          Grobe Schätzung auf Basis Ihrer Angaben — danach wäre jede eingesparte Kilowattstunde reiner Gewinn.
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

                {/* Verlauf — führt mit der Ersparnis, nicht mit dem Minus. */}
                <div className="mt-7 border-t border-white/10 pt-6">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm text-white/60"><TrendingUp className="h-4 w-4" /> In 10 Jahren gespart</span>
                    <span className="font-display text-lg font-semibold tabular-nums text-emerald-300">
                      {eur.format(r.gespart10)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/45">
                    inklusive {komma(preissteigerung * 100)} % Energiepreissteigerung pro Jahr
                  </p>
                  <div className="mt-4">
                    <ErsparnisChart kumuliertOhneInvest={r.kumuliertOhneInvest} invest={r.invest} />
                  </div>
                  {/* Die Investition bleibt sichtbar — nur nicht als Erstes. */}
                  <dl className="mt-4 space-y-1.5 border-t border-white/10 pt-3 text-xs">
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/50">Einmalige Investition</dt>
                      <dd className="tabular-nums text-white/70">−{eur.format(r.invest)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-white/50">Bleibt nach 10 Jahren</dt>
                      <dd className={`font-medium tabular-nums ${r.bilanz10 >= 0 ? "text-emerald-300" : "text-white/70"}`}>
                        {r.bilanz10 >= 0 ? "+" : ""}{eur.format(r.bilanz10)}
                      </dd>
                    </div>
                  </dl>
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
        <PrintSheet
          kontakt={kontakt} r={r} wohnform={wohnform} flaeche={flaeche} personen={personen} heute={heute}
          verbrauch={verbrauch} strompreis={strompreis} stromMass={stromMass} waermeMass={waermeMass}
          serverKey={serverKey} pvAktiv={pvAktiv} pvWp={pvWp} pvSpezErtrag={pvSpezErtrag}
          pvEigenverbrauch={pvEigenverbrauch} abos={abos} preissteigerung={preissteigerung}
        />
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

