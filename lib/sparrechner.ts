/* ════════════════════════════════════════════════════════════════════════
   RECHENGRUNDLAGEN DES ENERGIE-SPAR-RECHNERS

   Bewusst konservativ. Ein Rechner, der zu viel verspricht, fliegt spätestens
   bei der ersten Jahresabrechnung auf — deshalb liegen alle Einsparwerte am
   unteren Rand dessen, was Hersteller angeben, und der Eigenverbrauch des
   Servers wird gegengerechnet.

   Entscheidend für die Ehrlichkeit: Eine smarte Heizungssteuerung spart
   WÄRME (meist Gas), keinen Strom. Beides wird deshalb getrennt gerechnet
   und mit dem jeweils eigenen Arbeitspreis bewertet.

   Reine Rechenlogik ohne React — so lässt sie sich unabhängig prüfen.
   ════════════════════════════════════════════════════════════════════════ */

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

// Jahresarbeitszahl der Wärmepumpe: aus 1 kWh Strom werden 3,5 kWh Wärme.
export const JAZ = 3.5;

// Arbeitspreise Wärme (€/kWh) und CO₂-Faktoren (kg/kWh).
// Die Wärmepumpe rechnet mit dem Strompreis geteilt durch die Jahresarbeitszahl.
export const HEIZARTEN = {
  gas: { label: "Gas", preis: 0.11, co2: 0.201 },
  oel: { label: "Öl", preis: 0.11, co2: 0.266 },
  fern: { label: "Fernwärme", preis: 0.14, co2: 0.17 },
  wp: { label: "Wärmepumpe", preis: null, co2: null },
} as const;
export type Heizart = keyof typeof HEIZARTEN;

export const CO2_STROM = 0.35; // kg je kWh, deutscher Strommix, gerundet

// Stromsparmaßnahmen — Anteil am HAUSHALTSSTROM.
export const STROM_MASSNAHMEN = [
  { key: "standby", label: "Stand-by abschalten", hint: "Steckdosen trennen, wenn niemand da ist", pct: 0.03, invest: 220 },
  { key: "licht", label: "Licht nach Präsenz", hint: "Leuchten laufen nur, wo jemand ist", pct: 0.02, invest: 400 },
  { key: "messung", label: "Verbrauch sichtbar machen", hint: "Wer sieht, was zieht, verbraucht weniger", pct: 0.03, invest: 180 },
];
export const STROM_KAPPE = 0.08; // realistische Obergrenze ohne Geräteaustausch

// Wärmemaßnahmen — Anteil am HEIZENERGIEBEDARF.
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

/** Startwert für den Stromverbrauch aus den Eckdaten des Haushalts. */
export function basisVerbrauch(wohnform: Wohnform, personen: number, warmwasserStrom: boolean): number {
  return STROM_BASIS[wohnform][warmwasserStrom ? "mit" : "ohne"][Math.min(5, Math.max(1, personen)) - 1];
}

/** Startwert für den Wärmebedarf, gerundet auf die Schrittweite des Reglers. */
export function basisWaerme(wohnform: Wohnform, flaeche: number, schritt = 500): number {
  return Math.round((flaeche * WAERME_SPEZ[wohnform]) / schritt) * schritt;
}

/** Wärmepreis je kWh — bei der Wärmepumpe abhängig vom Strompreis. */
export function waermePreisFor(heizart: Heizart, strompreis: number): number {
  return heizart === "wp" ? strompreis / JAZ : HEIZARTEN[heizart].preis!;
}

export interface Eingaben {
  verbrauch: number;      // kWh Strom / Jahr
  strompreis: number;     // €/kWh
  heizart: Heizart;
  waermeBedarf: number;   // kWh Wärme / Jahr
  flaeche: number;        // m²
  stromMass: Set<string>;
  waermeMass: Set<string>;
  abos: Set<string>;
  serverKey: ServerKey;
  investEigen: number | null; // null = Vorschlag verwenden
}

export function berechne(e: Eingaben) {
  // ── Strom ──
  const stromPct = Math.min(STROM_KAPPE, STROM_MASSNAHMEN.filter((m) => e.stromMass.has(m.key)).reduce((s, m) => s + m.pct, 0));
  const stromKwh = e.verbrauch * stromPct;
  const stromEuro = stromKwh * e.strompreis;

  // ── Wärme ──
  const waermePreis = waermePreisFor(e.heizart, e.strompreis);
  const waermeCo2 = e.heizart === "wp" ? CO2_STROM / JAZ : HEIZARTEN[e.heizart].co2!;
  const waermePct = Math.min(WAERME_KAPPE, WAERME_MASSNAHMEN.filter((m) => e.waermeMass.has(m.key)).reduce((s, m) => s + m.pct, 0));
  const waermeKwh = e.waermeBedarf * waermePct;
  const waermeEuro = waermeKwh * waermePreis;

  // ── Abos ──
  const aboMonat = CLOUD.filter((c) => e.abos.has(c.key)).reduce((s, c) => s + c.price, 0);
  const aboEuro = aboMonat * 12;

  // ── Gegenrechnung: der Server verbraucht selbst Strom ──
  const srv = SERVER.find((s) => s.key === e.serverKey) ?? SERVER[1];
  const serverKwh = (srv.watt * 8760) / 1000;
  const serverEuro = serverKwh * e.strompreis;

  const brutto = stromEuro + waermeEuro + aboEuro;
  const netto = brutto - serverEuro;

  // ── Investition (auf 50 € gerundet, passend zur Schrittweite des Reglers) ──
  const heizkoerper = Math.max(3, Math.round(e.flaeche / 18));
  const investVorschlag =
    Math.round(
      (srv.invest +
        (e.waermeMass.size > 0 ? heizkoerper * 75 + 150 : 0) +
        STROM_MASSNAHMEN.filter((m) => e.stromMass.has(m.key)).reduce((s, m) => s + m.invest, 0)) / 50
    ) * 50;
  const invest = e.investEigen ?? investVorschlag;

  const co2 = stromKwh * CO2_STROM + waermeKwh * waermeCo2 - serverKwh * CO2_STROM;

  return {
    stromPct, stromKwh, stromEuro,
    waermePct, waermeKwh, waermeEuro, waermePreis,
    aboMonat, aboEuro,
    serverKwh, serverEuro, serverWatt: srv.watt,
    brutto, netto, invest, investVorschlag, co2,
    amortisation: netto > 0 ? invest / netto : null,
    bilanz10: netto * 10 - invest,
  };
}
