/* ════════════════════════════════════════════════════════════════════════
   RECHENGRUNDLAGEN DES ENERGIE-SPAR-RECHNERS

   Bewusst konservativ. Ein Rechner, der zu viel verspricht, fliegt spätestens
   bei der ersten Jahresabrechnung auf — deshalb liegen alle Einsparwerte am
   unteren Rand dessen, was Hersteller angeben.

   Drei Dinge, die dieser Rechner anders macht als die üblichen:
   1. Strom und Wärme sind getrennt. Eine smarte Heizungssteuerung spart
      WÄRME (meist Gas), keinen Strom — zu einem völlig anderen Arbeitspreis.
   2. Gegengerechnet wird alles, was Geld kostet: der Eigenverbrauch des
      Servers UND die vollständige Investition (Material, Montage, Abnahme).
   3. Die Amortisation berücksichtigt die Energiepreissteigerung. Ohne sie
      rechnet man sich systematisch zu pessimistisch — mit einer erfundenen
      Rate zu optimistisch. Die Rate ist deshalb einstellbar und offengelegt.

   Reine Rechenlogik ohne React — dadurch unabhängig prüfbar (npm run test:rechner).
   ════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────── Haushalt & Strom ─────────────────────────── */

// Jahres-Stromverbrauch in kWh nach Haushaltsgröße — Richtwerte in Anlehnung
// an den „Stromspiegel für Deutschland". Elektrische Warmwasserbereitung
// (Durchlauferhitzer) schlägt kräftig zu Buche und wird separat erfasst.
export const STROM_BASIS = {
  wohnung: { ohne: [1300, 2000, 2500, 2900, 3400], mit: [1900, 2800, 3500, 4000, 4700] },
  haus: { ohne: [2300, 3000, 3500, 4000, 4800], mit: [2900, 3800, 4500, 5200, 6000] },
};
export type Wohnform = keyof typeof STROM_BASIS;

// Spezifischer Wärmebedarf in kWh je m² und Jahr — typischer, teilsanierter Bestand.
export const WAERME_SPEZ: Record<Wohnform, number> = { wohnung: 110, haus: 140 };

export const CO2_STROM = 0.35; // kg CO₂-Äquivalent je kWh, deutscher Strommix

/* ────────────────────────────── Wärmequellen ────────────────────────────── */

// Jahresarbeitszahl der Wärmepumpe: aus 1 kWh Strom werden 3,5 kWh Wärme.
export const JAZ = 3.5;

/**
 * Arbeitspreise (€/kWh) und CO₂-Faktoren (kg/kWh Endenergie) je Energieträger.
 * `preis: null` = wird aus dem Strompreis abgeleitet (Wärmepumpe).
 */
export const HEIZARTEN = {
  gas: { label: "Erdgas", preis: 0.11, co2: 0.201 },
  oel: { label: "Heizöl", preis: 0.11, co2: 0.266 },
  fern: { label: "Fernwärme", preis: 0.14, co2: 0.17 },
  wp: { label: "Wärmepumpe", preis: null, co2: null },
} as const;
export type Heizart = keyof typeof HEIZARTEN;
export const HEIZART_KEYS = Object.keys(HEIZARTEN) as Heizart[];

/** Eine Wärmequelle: Energieträger + was der Haushalt dafür im Jahr zahlt. */
export interface Waermequelle {
  id: string;
  art: Heizart;
  jahreskosten: number; // € pro Jahr, wie auf der Abrechnung
}

/** Arbeitspreis je kWh Wärme — bei der Wärmepumpe abhängig vom Strompreis. */
export function waermePreisFor(art: Heizart, strompreis: number): number {
  return art === "wp" ? strompreis / JAZ : HEIZARTEN[art].preis!;
}

/** CO₂-Faktor je kWh Wärme — bei der Wärmepumpe über den Strommix und die JAZ. */
export function waermeCo2For(art: Heizart): number {
  return art === "wp" ? CO2_STROM / JAZ : HEIZARTEN[art].co2!;
}

/**
 * Grober Kostenvorschlag für eine Wärmequelle, damit die Felder nicht leer starten:
 * Wärmebedarf (Fläche × spezifischer Verbrauch) × Arbeitspreis.
 */
export function kostenVorschlag(art: Heizart, wohnform: Wohnform, flaeche: number, strompreis: number): number {
  const kwh = flaeche * WAERME_SPEZ[wohnform];
  return Math.round((kwh * waermePreisFor(art, strompreis)) / 10) * 10;
}

/* ─────────────────────────────── Maßnahmen ─────────────────────────────── */

// Stromsparmaßnahmen — Anteil am HAUSHALTSSTROM. `invest` = Material + Einrichtung.
export const STROM_MASSNAHMEN = [
  { key: "standby", label: "Stand-by abschalten", hint: "Steckdosen trennen, wenn niemand da ist", pct: 0.03, invest: 220 },
  { key: "licht", label: "Licht nach Präsenz", hint: "Leuchten laufen nur, wo jemand ist", pct: 0.02, invest: 400 },
  { key: "messung", label: "Verbrauch sichtbar machen", hint: "Wer sieht, was zieht, verbraucht weniger", pct: 0.03, invest: 180 },
];
export const STROM_KAPPE = 0.08; // realistische Obergrenze ohne Geräteaustausch

// Wärmemaßnahmen — Anteil am HEIZENERGIEBEDARF (und damit an den Wärmekosten).
export const WAERME_MASSNAHMEN = [
  { key: "einzelraum", label: "Einzelraumregelung", hint: "Jeder Raum nur warm, wenn er genutzt wird", pct: 0.08 },
  { key: "abwesend", label: "Absenkung & Fenster-Erkennung", hint: "Reagiert auf Abwesenheit und offene Fenster", pct: 0.03 },
  { key: "heizkurve", label: "Heizkurve nachgeführt", hint: "Vorlauftemperatur folgt dem Wetter", pct: 0.05 },
];
export const WAERME_KAPPE = 0.15;

// Typische Monatspreise gängiger Abos (Stand 2026, gerundet).
export const CLOUD = [
  { key: "icloud", label: "iCloud+ 200 GB", price: 2.99 },
  { key: "google", label: "Google One 200 GB", price: 2.99 },
  { key: "dropbox", label: "Dropbox Plus 2 TB", price: 11.99 },
  { key: "m365", label: "Microsoft 365 Single", price: 10.0 },
  { key: "backup", label: "Online-Backup", price: 9.0 },
  { key: "kamera", label: "Kamera-Cloud-Abo", price: 6.0 },
];

// Der eigene Server zieht selbst Strom — das gehört in jede ehrliche Rechnung.
export const SERVER = [
  { key: "mini", label: "Mini-PC", watt: 12, hint: "Fotos, Backup, Werbefilter", invest: 750 },
  { key: "nas", label: "NAS & Dienste", watt: 25, hint: "mehr Speicher, mehrere Dienste", invest: 1200 },
  { key: "kameras", label: "Server mit Kameras", watt: 45, hint: "inkl. Aufzeichnung & lokaler Erkennung", invest: 2200 },
];
export type ServerKey = (typeof SERVER)[number]["key"];

/* ────────────────────────── Balkonkraftwerk (PV) ────────────────────────── */

/**
 * Spezifischer Jahresertrag in kWh je kWp. Eine optimal ausgerichtete
 * Dachanlage schafft in Deutschland 950–1050. Balkonmodule hängen meist
 * steiler und seltener exakt nach Süden — deshalb ist der Regler von 700
 * (Nord/Ost verschattet) bis 1050 (Süd, freie Sicht) spannbar.
 */
export const PV_SPEZ_ERTRAG_STANDARD = 900;
export const PV_WP_STANDARD = 800; // 800 W Wechselrichter = seit 2024 anmeldefreie Grenze

/**
 * Eigenverbrauchsquote: Anteil des erzeugten Stroms, der direkt im Haushalt
 * verbraucht wird. Eine kleine Anlage ohne Speicher liegt realistisch bei
 * 60–80 %, weil die Leistung selten über der Grundlast liegt.
 */
export const PV_EIGENVERBRAUCH_STANDARD = 0.65;

/** Kosten eines Balkonkraftwerks inkl. Halterung, Montage und Anmeldung. */
export function pvInvest(wp: number): number {
  const hardware = (wp / 800) * 650; // Module + Wechselrichter + Halterung
  return Math.round((hardware + 250) / 10) * 10; // + Montage, Anmeldung, Abnahme
}

/* ───────────────────── Preissteigerung & Montageanteil ───────────────────── */

/** Jährliche Energiepreissteigerung (Standard 3,5 %). */
export const PREISSTEIGERUNG_STANDARD = 0.035;

/**
 * Fachmontage, Inbetriebnahme und Abnahme — anteilig am Material.
 * Fehlte in der alten Rechnung komplett, weshalb die Amortisation zu gut aussah.
 */
export const MONTAGE_ANTEIL = 0.15;
export const MONTAGE_MINDEST = 250;

/* ──────────────────────────── CO₂-Vergleiche ──────────────────────────── */

/** Ein junger Laubbaum bindet grob 12,5 kg CO₂ im Jahr. */
export const CO2_BAUM_PRO_JAHR = 12.5;
/** Durchschnittlicher Pkw im realen Betrieb, rund 130 g CO₂ je Kilometer. */
export const CO2_AUTO_PRO_KM = 0.13;
/** Pro-Kopf-Ausstoß in Deutschland, rund 10,5 t im Jahr — der ehrliche Maßstab. */
export const CO2_PRO_KOPF_DE = 10500;

export function co2Vergleiche(kg: number) {
  return {
    baeume: Math.round(kg / CO2_BAUM_PRO_JAHR),
    autoKm: Math.round(kg / CO2_AUTO_PRO_KM),
    /** Anteil am persönlichen Jahresausstoß in Prozent — verhindert Schönfärberei. */
    anteilProKopf: (kg / CO2_PRO_KOPF_DE) * 100,
  };
}

/* ───────────────────────────── Startwerte ───────────────────────────── */

/** Startwert für den Stromverbrauch aus den Eckdaten des Haushalts. */
export function basisVerbrauch(wohnform: Wohnform, personen: number, warmwasserStrom: boolean): number {
  return STROM_BASIS[wohnform][warmwasserStrom ? "mit" : "ohne"][Math.min(5, Math.max(1, personen)) - 1];
}

/** Startwert für den Wärmebedarf, gerundet auf die Schrittweite des Reglers. */
export function basisWaerme(wohnform: Wohnform, flaeche: number, schritt = 500): number {
  return Math.round((flaeche * WAERME_SPEZ[wohnform]) / schritt) * schritt;
}

/* ───────────────────────────── Rechenkern ───────────────────────────── */

export interface Eingaben {
  verbrauch: number;              // kWh Strom / Jahr
  strompreis: number;             // €/kWh
  waermequellen: Waermequelle[];  // beliebig kombinierbar (Hybrid)
  stromMass: Set<string>;
  waermeMass: Set<string>;
  abos: Set<string>;
  serverKey: ServerKey;
  flaeche: number;                // m² — bestimmt die Zahl der Thermostate
  pvAktiv: boolean;
  pvWp: number;
  pvSpezErtrag: number;           // kWh je kWp und Jahr
  pvEigenverbrauch: number;       // 0…1
  preissteigerung: number;        // 0…0,1
  investEigen: number | null;     // null = Vorschlag verwenden
}

export interface Investposten {
  label: string;
  betrag: number;
}

export function berechne(e: Eingaben) {
  /* ── Strom ── */
  const stromPct = Math.min(STROM_KAPPE, STROM_MASSNAHMEN.filter((m) => e.stromMass.has(m.key)).reduce((s, m) => s + m.pct, 0));
  const stromKwh = e.verbrauch * stromPct;
  const stromEuro = stromKwh * e.strompreis;

  /* ── Wärme: Summe über alle Quellen (Hybrid) ── */
  const waermePct = Math.min(WAERME_KAPPE, WAERME_MASSNAHMEN.filter((m) => e.waermeMass.has(m.key)).reduce((s, m) => s + m.pct, 0));
  const waermeKosten = e.waermequellen.reduce((s, q) => s + Math.max(0, q.jahreskosten), 0);
  const waermeEuro = waermeKosten * waermePct;
  // kWh und CO₂ je Quelle, weil jeder Energieträger anders viel Kohlendioxid trägt.
  const waermeDetail = e.waermequellen.map((q) => {
    const preis = waermePreisFor(q.art, e.strompreis);
    const kwh = preis > 0 ? Math.max(0, q.jahreskosten) / preis : 0;
    return {
      id: q.id, art: q.art, jahreskosten: Math.max(0, q.jahreskosten), preis, kwh,
      sparKwh: kwh * waermePct,
      sparEuro: Math.max(0, q.jahreskosten) * waermePct,
      sparCo2: kwh * waermePct * waermeCo2For(q.art),
    };
  });
  const waermeKwh = waermeDetail.reduce((s, d) => s + d.sparKwh, 0);
  const waermeCo2 = waermeDetail.reduce((s, d) => s + d.sparCo2, 0);

  /* ── Abos ── */
  const aboMonat = CLOUD.filter((c) => e.abos.has(c.key)).reduce((s, c) => s + c.price, 0);
  const aboEuro = aboMonat * 12;

  /* ── Balkonkraftwerk ── */
  const pvKwhBrutto = e.pvAktiv ? (e.pvWp / 1000) * e.pvSpezErtrag : 0;
  const pvKwhEigen = pvKwhBrutto * e.pvEigenverbrauch;
  const pvKwhUeberschuss = pvKwhBrutto - pvKwhEigen;
  // Nur der selbst verbrauchte Strom spart Geld. Der Überschuss wird ohne
  // Einspeisevertrag vergütungsfrei abgegeben — deshalb hier bewusst 0 €.
  const pvEuro = pvKwhEigen * e.strompreis;
  const pvCo2 = pvKwhEigen * CO2_STROM;

  /* ── Gegenrechnung: der Server verbraucht selbst Strom ── */
  const srv = SERVER.find((s) => s.key === e.serverKey) ?? SERVER[1];
  const serverKwh = (srv.watt * 8760) / 1000;
  const serverEuro = serverKwh * e.strompreis;

  /* ── Jahresbilanz ── */
  const brutto = stromEuro + waermeEuro + aboEuro + pvEuro;
  const netto = brutto - serverEuro;
  // Energieabhängiger Teil: steigt mit dem Energiepreis. Abos bleiben flach
  // (konservativ — real steigen auch die, das rechnen wir uns nicht schön).
  const energieAnteil = stromEuro + waermeEuro + pvEuro - serverEuro;

  /* ── Investition: das VOLLSTÄNDIGE Paket ── */
  const heizkoerper = Math.max(3, Math.round(e.flaeche / 18));
  const posten: Investposten[] = [{ label: srv.label, betrag: srv.invest }];
  if (e.waermeMass.size > 0) {
    posten.push({ label: `Heizungssteuerung (${heizkoerper} Thermostate + Zentrale)`, betrag: heizkoerper * 75 + 150 });
  }
  for (const m of STROM_MASSNAHMEN) {
    if (e.stromMass.has(m.key)) posten.push({ label: m.label, betrag: m.invest });
  }
  if (e.pvAktiv) posten.push({ label: `Balkonkraftwerk ${e.pvWp} Wp`, betrag: pvInvest(e.pvWp) });

  const material = posten.reduce((s, p) => s + p.betrag, 0);
  const montage = material > 0 ? Math.max(MONTAGE_MINDEST, Math.round(material * MONTAGE_ANTEIL)) : 0;
  if (montage > 0) posten.push({ label: "Fachmontage, Inbetriebnahme & Abnahme", betrag: montage });

  const investVorschlag = Math.round((material + montage) / 50) * 50;
  const invest = e.investEigen ?? investVorschlag;

  /* ── CO₂ ── */
  const co2 = stromKwh * CO2_STROM + waermeCo2 + pvCo2 - serverKwh * CO2_STROM;

  /* ── Amortisation mit Preissteigerung ── */
  const p = Math.max(0, e.preissteigerung);
  const kumuliert = (jahre: number) => kumulierteBilanz(energieAnteil, aboEuro, p, jahre) - invest;
  const amortisation = amortisationsdauer(energieAnteil, aboEuro, p, invest);

  return {
    stromPct, stromKwh, stromEuro,
    waermePct, waermeKosten, waermeKwh, waermeEuro, waermeCo2, waermeDetail,
    aboMonat, aboEuro,
    pvKwhBrutto, pvKwhEigen, pvKwhUeberschuss, pvEuro, pvCo2,
    serverKwh, serverEuro, serverWatt: srv.watt,
    brutto, netto, energieAnteil,
    posten, material, montage, invest, investVorschlag,
    co2, co2Vergleich: co2Vergleiche(Math.max(0, co2)),
    amortisation,
    kumuliert,
    bilanz10: kumuliert(10),
    /** Ersparnis im Jahr n unter Berücksichtigung der Preissteigerung. */
    nettoImJahr: (n: number) => energieAnteil * Math.pow(1 + p, n - 1) + aboEuro,
  };
}

/**
 * Kumulierte Ersparnis (ohne Investition) nach `jahre` Jahren.
 *
 *   K(n) = E₁ · ((1+p)ⁿ − 1)/p  +  A · n
 *
 * E₁ = energieabhängige Netto-Ersparnis im ersten Jahr (steigt mit p),
 * A  = Abo-Ersparnis (bleibt konstant),
 * p  = jährliche Energiepreissteigerung.
 *
 * Für p = 0 geht der erste Term gegen E₁ · n (Grenzwert), was hier
 * gesondert behandelt wird, um eine Division durch Null zu vermeiden.
 * Gebrochene Jahre werden innerhalb des laufenden Jahres linear interpoliert.
 */
export function kumulierteBilanz(energieAnteil: number, aboEuro: number, p: number, jahre: number): number {
  if (jahre <= 0) return 0;
  const ganze = Math.floor(jahre);
  const rest = jahre - ganze;
  const summeGanze = p === 0 ? energieAnteil * ganze : energieAnteil * ((Math.pow(1 + p, ganze) - 1) / p);
  const imLaufendenJahr = energieAnteil * Math.pow(1 + p, ganze) * rest;
  return summeGanze + imLaufendenJahr + aboEuro * jahre;
}

/**
 * Amortisationsdauer in Jahren: das kleinste n mit K(n) ≥ Investition.
 * Analytisch nicht auflösbar (Summe aus geometrischer Reihe und linearem
 * Term), deshalb per Bisektion — exakt bis auf ein Hundertstel Jahr.
 * Gibt `null` zurück, wenn sich die Investition nie trägt.
 */
export function amortisationsdauer(energieAnteil: number, aboEuro: number, p: number, invest: number): number | null {
  if (invest <= 0) return 0;
  const jahresErsparnisJetzt = energieAnteil + aboEuro;
  // Ohne positive Ersparnis und ohne Preissteigerung wird es nie besser.
  if (jahresErsparnisJetzt <= 0 && (p === 0 || energieAnteil <= 0)) return null;

  const OBERGRENZE = 50;
  if (kumulierteBilanz(energieAnteil, aboEuro, p, OBERGRENZE) < invest) return null;

  let lo = 0, hi = OBERGRENZE;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (kumulierteBilanz(energieAnteil, aboEuro, p, mid) < invest) lo = mid;
    else hi = mid;
  }
  // Bewusst ungerundet: nur so gilt exakt K(n) = Investition. Gerundet wird
  // erst in der Anzeige — sonst weicht die Bilanz beim ausgewiesenen Zeitpunkt
  // um bis zu ein paar Euro ab.
  return hi;
}

/** Marketing-Gate: Die Amortisation wird nur bis zu dieser Dauer ausgespielt. */
export const AMORTISATION_ZEIGEN_BIS_JAHRE = 3;
