// Prüft die Rechenlogik des Energie-Spar-Rechners gegen von Hand nachvollziehbare
// Werte und die analytischen Formeln gegen eine naive Jahr-für-Jahr-Schleife.
const L = await import("./sparrechner.ts");
const {
  berechne, basisVerbrauch, basisWaerme, waermePreisFor, waermeCo2For,
  kumulierteBilanz, amortisationsdauer, co2Vergleiche, pvInvest, kostenVorschlag,
} = L;

let pass = 0, fail = 0;
const ok = (name, cond, info = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  OK  " : " FAIL "} ${name}${info ? "  — " + info : ""}`); };
const nah = (a, b, tol = 0.51) => Math.abs(a - b) <= tol;
const e0 = (n) => Math.round(n);
const section = (t) => console.log(`\n=== ${t} ===`);

const quelle = (art, kosten, id = art) => ({ id, art, jahreskosten: kosten });

const basis = (over = {}) => ({
  verbrauch: 3500, strompreis: 0.35,
  waermequellen: [quelle("gas", 1800)],
  stromMass: new Set(["standby", "messung"]),
  waermeMass: new Set(["einzelraum", "abwesend"]),
  abos: new Set(["icloud", "google"]),
  serverKey: "nas", flaeche: 130,
  pvAktiv: false, pvWp: 800, pvSpezErtrag: 900, pvEigenverbrauch: 0.65,
  preissteigerung: 0.035, investEigen: null,
  ...over,
});

/* ═══════════════════════════════════════════════════════════════════ */
section("1) Startwerte aus den Eckdaten");
ok("Haus, 3 Pers., ohne E-Warmwasser = 3500 kWh", basisVerbrauch("haus", 3, false) === 3500);
ok("Wohnung, 1 Pers. = 1300 kWh", basisVerbrauch("wohnung", 1, false) === 1300);
ok("E-Warmwasser hebt den Verbrauch an", basisVerbrauch("haus", 3, true) > basisVerbrauch("haus", 3, false),
   `${basisVerbrauch("haus", 3, false)} → ${basisVerbrauch("haus", 3, true)} kWh`);
ok("Mehr Personen = mehr Verbrauch (monoton)",
   [1, 2, 3, 4, 5].every((p, i, a) => i === 0 || basisVerbrauch("haus", p, false) > basisVerbrauch("haus", a[i - 1], false)));
ok("Startwert liegt auf der Regler-Schrittweite", [40, 75, 130, 199, 300].every((f) => basisWaerme("haus", f) % 500 === 0));
// 130 m² × 140 kWh/m² × 0,11 €/kWh = 2002 € → auf 10 € gerundet
ok("Kostenvorschlag Gas für 130 m² Haus ≈ 2000 €", nah(kostenVorschlag("gas", "haus", 130, 0.35), 2000, 10),
   `${kostenVorschlag("gas", "haus", 130, 0.35)} €`);
ok("Wärmepumpe schlägt günstigeren Kostenvorschlag vor",
   kostenVorschlag("wp", "haus", 130, 0.35) < kostenVorschlag("gas", "haus", 130, 0.35),
   `${kostenVorschlag("wp", "haus", 130, 0.35)} € statt ${kostenVorschlag("gas", "haus", 130, 0.35)} €`);

section("2) Standardfall, von Hand nachgerechnet");
const r = berechne(basis());
// Strom: 3500 × 6 % = 210 kWh × 0,35 € = 73,50 €
// Stand-by 6 % + Verbrauch sichtbar 5 % = 11 % von 3500 kWh = 385 kWh
ok("Stromersparnis 11 % = 385 kWh", nah(r.stromKwh, 385), `${r.stromKwh} kWh`);
ok("Strom in Euro = 134,75 €", nah(r.stromEuro, 134.75, 0.01), `${r.stromEuro.toFixed(2)} €`);
// Wärme: 1800 € Rechnung − 180 € Gas-Grundpreis = 1620 € Verbrauch × 11 % = 178,20 €.
// Der Grundpreis (Zähler/Bereitstellung) läuft unabhängig vom Verbrauch weiter,
// eine Heizungssteuerung kann daran nichts sparen.
ok("Wärmeersparnis 11 % vom VERBRAUCH (1620 €) = 178,20 €", nah(r.waermeEuro, 178.2, 0.01), `${r.waermeEuro.toFixed(2)} €`);
// kWh dahinter: 1620 / 0,11 = 14.727 kWh, davon 11 % = 1620 kWh
ok("kWh werden aus dem Verbrauchsanteil abgeleitet", nah(r.waermeKwh, 1620, 1), `${e0(r.waermeKwh)} kWh`);
ok("Grundpreis wird ausgewiesen und nicht mitgespart",
   r.waermeDetail[0].grundpreis === 180 && nah(r.waermeDetail[0].verbrauchsteil, 1620),
   `Grundpreis ${r.waermeDetail[0].grundpreis} €, Verbrauch ${e0(r.waermeDetail[0].verbrauchsteil)} €`);
ok("Abos = 71,76 €/Jahr", nah(r.aboEuro, 71.76, 0.01), `${r.aboEuro.toFixed(2)} €`);
ok("Serverstrom 25 W = 219 kWh = 76,65 €", nah(r.serverKwh, 219) && nah(r.serverEuro, 76.65, 0.01), `${r.serverEuro.toFixed(2)} €`);
ok("Netto = brutto − Serverstrom", nah(r.netto, r.brutto - r.serverEuro, 0.001), `${e0(r.netto)} €`);
ok("Netto rund 308 €", nah(r.netto, 308.1, 1), `${r.netto.toFixed(2)} €`);

section("3) Hybrid: mehrere Wärmequellen addieren sich");
const hybrid = berechne(basis({ waermequellen: [quelle("gas", 1200), quelle("wp", 600, "wp1")] }));
ok("Wärmekosten werden summiert", nah(hybrid.waermeKosten, 1800), `${hybrid.waermeKosten} €`);
// Gas 1200 € − 180 € Grundpreis = 1020 €, Wärmepumpe 600 € ohne eigenen
// Grundpreis (steckt im Stromvertrag) → zusammen 1620 € Verbrauch × 11 %.
ok("Ersparnis = 11 % des Verbrauchsanteils", nah(hybrid.waermeEuro, 178.2, 0.01), `${hybrid.waermeEuro.toFixed(2)} €`);
ok("Gleiche Kosten wie Einzelquelle → gleiche Euro-Ersparnis", nah(hybrid.waermeEuro, r.waermeEuro, 0.01));
ok("Aber weniger CO₂, weil die Wärmepumpe sauberer ist", hybrid.waermeCo2 < r.waermeCo2,
   `${e0(hybrid.waermeCo2)} kg statt ${e0(r.waermeCo2)} kg`);
ok("Detailzeile je Quelle vorhanden", hybrid.waermeDetail.length === 2);
ok("Summe der Detail-Euro = Gesamt-Euro",
   nah(hybrid.waermeDetail.reduce((s, d) => s + d.sparEuro, 0), hybrid.waermeEuro, 0.01));
const drei = berechne(basis({ waermequellen: [quelle("gas", 900), quelle("oel", 500, "o"), quelle("fern", 400, "f")] }));
// Gas 900−180=720, Öl 500−0=500, Fernwärme 400−300=100 → 1320 € × 11 % = 145,20 €.
// Fernwärme hat den höchsten Grundpreis, deshalb bleibt dort am wenigsten übrig.
ok("Drei Quellen: je eigener Grundpreis", nah(drei.waermeKosten, 1800) && nah(drei.waermeEuro, 145.2, 0.01),
   `${drei.waermeEuro.toFixed(2)} €`);
ok("Leere Liste ergibt keine Wärme-Ersparnis",
   berechne(basis({ waermequellen: [] })).waermeEuro === 0);
ok("Negative Eingaben werden nicht gutgeschrieben",
   berechne(basis({ waermequellen: [quelle("gas", -500)] })).waermeEuro === 0);

section("4) Arbeitspreise und CO₂ je Energieträger");
ok("Gas und Öl 0,11 €/kWh", waermePreisFor("gas", 0.35) === 0.11 && waermePreisFor("oel", 0.35) === 0.11);
ok("Fernwärme 0,14 €/kWh", waermePreisFor("fern", 0.35) === 0.14);
ok("Wärmepumpe = Strompreis ÷ JAZ 3,5", nah(waermePreisFor("wp", 0.35), 0.1, 0.001), `${waermePreisFor("wp", 0.35).toFixed(3)}`);
ok("Öl trägt mehr CO₂ als Gas", waermeCo2For("oel") > waermeCo2For("gas"));
ok("Wärmepumpe trägt am wenigsten CO₂ je kWh Wärme",
   ["gas", "oel", "fern"].every((a) => waermeCo2For("wp") < waermeCo2For(a)),
   `${waermeCo2For("wp").toFixed(3)} kg/kWh`);

section("5) Balkonkraftwerk");
const pv = berechne(basis({ pvAktiv: true }));
// 800 Wp × 900 kWh/kWp = 720 kWh brutto
ok("800 Wp × 900 kWh/kWp = 720 kWh brutto", nah(pv.pvKwhBrutto, 720), `${pv.pvKwhBrutto} kWh`);
ok("Ertrag liegt im realistischen Band 700–900 kWh", pv.pvKwhBrutto >= 700 && pv.pvKwhBrutto <= 900);
// 720 × 65 % = 468 kWh eigenverbraucht × 0,35 € = 163,80 €
ok("Eigenverbrauch 65 % = 468 kWh", nah(pv.pvKwhEigen, 468), `${pv.pvKwhEigen} kWh`);
ok("Ersparnis = 163,80 €", nah(pv.pvEuro, 163.8, 0.01), `${pv.pvEuro.toFixed(2)} €`);
ok("Überschuss wird ausgewiesen, aber nicht vergütet",
   nah(pv.pvKwhUeberschuss, 252) && nah(pv.pvEuro, pv.pvKwhEigen * 0.35, 0.01), `${pv.pvKwhUeberschuss} kWh`);
ok("Nur der Eigenverbrauch zählt fürs CO₂", nah(pv.pvCo2, 468 * 0.35, 0.1), `${e0(pv.pvCo2)} kg`);
ok("PV hebt die Netto-Ersparnis deutlich", pv.netto > r.netto + 150, `${e0(pv.netto)} € statt ${e0(r.netto)} €`);
ok("Mehr Wp = mehr Ertrag (linear)",
   nah(berechne(basis({ pvAktiv: true, pvWp: 1600 })).pvKwhBrutto, 1440), "1600 Wp → 1440 kWh");
ok("Schlechtere Ausrichtung senkt den Ertrag",
   berechne(basis({ pvAktiv: true, pvSpezErtrag: 700 })).pvKwhBrutto < pv.pvKwhBrutto);
ok("PV aus = kein Ertrag, keine Kosten",
   r.pvKwhBrutto === 0 && r.pvEuro === 0 && !r.posten.some((p) => /Balkon/.test(p.label)));
ok("Investition eines 800-Wp-Werks liegt bei rund 900 €", nah(pvInvest(800), 900, 10), `${pvInvest(800)} €`);

section("5b) Lastverschiebung hebt die Eigenverbrauchsquote (statt den Verbrauch zu senken)");
const pvVerschoben = berechne(basis({ pvAktiv: true, pvLastverschiebung: true }));
ok("Quote steigt um den Bonus", nah(pvVerschoben.pvQuote, 0.65 + L.PV_LASTVERSCHIEBUNG_BONUS, 1e-9),
   `${(pvVerschoben.pvQuote * 100).toFixed(0)} % statt 65 %`);
ok("Der erzeugte Strom bleibt gleich — es wird nichts dazuerfunden",
   nah(pvVerschoben.pvKwhBrutto, pv.pvKwhBrutto), `${pvVerschoben.pvKwhBrutto} kWh`);
ok("Es wird mehr selbst genutzt und weniger verschenkt",
   pvVerschoben.pvKwhEigen > pv.pvKwhEigen && pvVerschoben.pvKwhUeberschuss < pv.pvKwhUeberschuss,
   `${e0(pvVerschoben.pvKwhEigen)} statt ${e0(pv.pvKwhEigen)} kWh eigen`);
ok("Eigen + Überschuss ergibt weiterhin die Bruttoerzeugung",
   nah(pvVerschoben.pvKwhEigen + pvVerschoben.pvKwhUeberschuss, pvVerschoben.pvKwhBrutto, 0.01));
ok("Die Quote wird nie über die Obergrenze gehoben",
   nah(berechne(basis({ pvAktiv: true, pvEigenverbrauch: 0.95, pvLastverschiebung: true })).pvQuote,
       L.PV_EIGENVERBRAUCH_MAX, 1e-9),
   `${L.PV_EIGENVERBRAUCH_MAX * 100} %`);
ok("Ohne PV wirkt die Lastverschiebung nicht",
   berechne(basis({ pvAktiv: false, pvLastverschiebung: true })).pvEuro === 0);

section("5c) Stromsparmaßnahmen sind realistisch dimensioniert");
ok("Zirkulationspumpe ist als Maßnahme vorhanden",
   L.STROM_MASSNAHMEN.some((m) => m.key === "zirkulation"));
ok("Jede Maßnahme liegt zwischen 3 % und 8 % — keine Fantasiewerte",
   L.STROM_MASSNAHMEN.every((m) => m.pct >= 0.03 && m.pct <= 0.08),
   L.STROM_MASSNAHMEN.map((m) => `${(m.pct * 100).toFixed(0)}%`).join(" / "));
ok("Die Summe liegt über der Kappe — die Kappe greift also wirklich",
   L.STROM_MASSNAHMEN.reduce((s, m) => s + m.pct, 0) > L.STROM_KAPPE,
   `${(L.STROM_MASSNAHMEN.reduce((s, m) => s + m.pct, 0) * 100).toFixed(0)} % vs. Kappe ${L.STROM_KAPPE * 100} %`);
ok("Auch mit allen Maßnahmen bleibt es unter einem Fünftel des Verbrauchs",
   L.STROM_KAPPE <= 0.2, `${L.STROM_KAPPE * 100} %`);
ok("Jede Maßnahme hat einen Investitionsbetrag",
   L.STROM_MASSNAHMEN.every((m) => m.invest > 0));

section("6) Investition: das VOLLSTÄNDIGE Paket (der alte Rechenfehler)");
ok("Enthält den Server", r.posten.some((p) => /NAS/.test(p.label)));
ok("Enthält die Heizungssteuerung", r.posten.some((p) => /Thermostate/.test(p.label)));
ok("Enthält die gewählten Strommaßnahmen",
   r.posten.some((p) => /Stand-by/.test(p.label)) && r.posten.some((p) => /sichtbar/.test(p.label)));
ok("Enthält Fachmontage & Abnahme — fehlte vorher komplett",
   r.posten.some((p) => /Fachmontage/.test(p.label)), r.posten.find((p) => /Fachmontage/.test(p.label))?.betrag + " €");
ok("Montage ist mindestens 250 €", r.montage >= 250, `${r.montage} €`);
ok("Summe der Posten = Investition (auf 50 € gerundet)",
   Math.abs(r.posten.reduce((s, p) => s + p.betrag, 0) - r.investVorschlag) <= 25,
   `Posten ${r.posten.reduce((s, p) => s + p.betrag, 0)} € → ${r.investVorschlag} €`);
ok("PV erhöht die Investition", berechne(basis({ pvAktiv: true })).investVorschlag > r.investVorschlag,
   `${berechne(basis({ pvAktiv: true })).investVorschlag} € statt ${r.investVorschlag} €`);
ok("Ohne jede Maßnahme bleibt nur Server + Montage",
   berechne(basis({ stromMass: new Set(), waermeMass: new Set() })).posten.length === 2);
ok("Eigene Investition überschreibt den Vorschlag", berechne(basis({ investEigen: 5000 })).invest === 5000);

section("7) Kumulierte Bilanz — analytische Formel gegen naive Schleife");
// Referenz: Jahr für Jahr aufsummieren. Muss exakt der geometrischen Reihe entsprechen.
function naiv(energie, abo, p, jahre) {
  let summe = 0;
  for (let t = 1; t <= jahre; t++) summe += energie * Math.pow(1 + p, t - 1) + abo;
  return summe;
}
let alleGleich = true, groesstAbweichung = 0;
for (const p of [0, 0.02, 0.035, 0.06, 0.1]) {
  for (const jahre of [1, 2, 3, 5, 10, 20, 30]) {
    const a = kumulierteBilanz(200, 72, p, jahre);
    const b = naiv(200, 72, p, jahre);
    groesstAbweichung = Math.max(groesstAbweichung, Math.abs(a - b));
    if (Math.abs(a - b) > 0.01) alleGleich = false;
  }
}
ok("Formel stimmt für alle Raten und Laufzeiten mit der Schleife überein", alleGleich,
   `max. Abweichung ${groesstAbweichung.toExponential(1)} €`);
ok("p = 0 wird korrekt behandelt (keine Division durch Null)",
   nah(kumulierteBilanz(200, 72, 0, 10), 2720, 0.01), `${kumulierteBilanz(200, 72, 0, 10)} €`);
ok("Preissteigerung erhöht die kumulierte Bilanz",
   kumulierteBilanz(200, 72, 0.035, 10) > kumulierteBilanz(200, 72, 0, 10),
   `${e0(kumulierteBilanz(200, 72, 0.035, 10))} € statt ${e0(kumulierteBilanz(200, 72, 0, 10))} €`);
ok("Bilanz bei 0 Jahren ist 0", kumulierteBilanz(200, 72, 0.035, 0) === 0);
ok("Gebrochene Jahre liegen zwischen den ganzen",
   kumulierteBilanz(200, 72, 0.035, 3) < kumulierteBilanz(200, 72, 0.035, 3.5) &&
   kumulierteBilanz(200, 72, 0.035, 3.5) < kumulierteBilanz(200, 72, 0.035, 4));
ok("Verlauf ist streng monoton steigend",
   Array.from({ length: 40 }, (_, i) => kumulierteBilanz(200, 72, 0.035, i / 2))
     .every((v, i, a) => i === 0 || v > a[i - 1]));

section("8) Amortisation — die Umkehrung muss exakt aufgehen");
let umkehrOk = true, maxRest = 0;
for (const p of [0, 0.02, 0.035, 0.07]) {
  for (const invest of [500, 1200, 2300, 4000, 9000]) {
    const n = amortisationsdauer(200, 72, p, invest);
    if (n === null) continue;
    const bilanzBeiN = kumulierteBilanz(200, 72, p, n);
    maxRest = Math.max(maxRest, Math.abs(bilanzBeiN - invest));
    if (Math.abs(bilanzBeiN - invest) > 0.01) umkehrOk = false;
  }
}
ok("Bei der gefundenen Dauer ist die Investition genau abbezahlt", umkehrOk, `max. Restfehler ${maxRest.toFixed(3)} €`);
ok("Investition 0 → sofort amortisiert", amortisationsdauer(200, 72, 0.035, 0) === 0);
ok("Ohne Ersparnis niemals amortisiert", amortisationsdauer(-80, 0, 0.035, 2000) === null);
ok("Höhere Preissteigerung verkürzt die Amortisation",
   amortisationsdauer(200, 72, 0.06, 2300) < amortisationsdauer(200, 72, 0, 2300),
   `${amortisationsdauer(200, 72, 0.06, 2300)} statt ${amortisationsdauer(200, 72, 0, 2300)} Jahre`);
ok("Größere Investition verlängert sie", amortisationsdauer(200, 72, 0.035, 5000) > amortisationsdauer(200, 72, 0.035, 2000));
ok("Absurd hohe Investition gibt null statt einer Fantasiezahl", amortisationsdauer(200, 72, 0.035, 500000) === null);
ok("Standardfall amortisiert in einer plausiblen Zeit",
   r.amortisation !== null && r.amortisation > 3 && r.amortisation < 30, `${r.amortisation.toFixed(2)} Jahre`);
ok("10-Jahres-Bilanz = kumuliert(10) − Investition",
   nah(r.bilanz10, kumulierteBilanz(r.energieAnteil, r.aboEuro, 0.035, 10) - r.invest, 0.01), `${e0(r.bilanz10)} €`);
ok("Amortisation und Bilanz sind konsistent: bei n ist die Bilanz null",
   r.amortisation === null || nah(r.kumuliert(r.amortisation), 0, 0.01), `Bilanz bei ${r.amortisation} Jahren: ${r.kumuliert(r.amortisation ?? 0).toFixed(2)} €`);

section("9) Das Marketing-Gate greift nur bei kurzer Amortisation");
const schnell = berechne(basis({ pvAktiv: true, pvWp: 2000, abos: new Set(["dropbox", "m365", "backup", "kamera"]), investEigen: 1200 }));
ok("Bei viel Ersparnis und kleiner Investition unter 3 Jahren",
   schnell.amortisation !== null && schnell.amortisation <= L.AMORTISATION_ZEIGEN_BIS_JAHRE, `${schnell.amortisation} Jahre`);
ok("Grenze steht bei 3 Jahren", L.AMORTISATION_ZEIGEN_BIS_JAHRE === 3);
ok("Standardfall liegt darüber und wird ausgeblendet", r.amortisation > L.AMORTISATION_ZEIGEN_BIS_JAHRE);

section("10) CO₂ — realistisch und anschaulich");
ok("CO₂ = Strom + Wärme + PV − Serverstrom",
   nah(r.co2, r.stromKwh * 0.35 + r.waermeCo2 + r.pvCo2 - r.serverKwh * 0.35, 0.01), `${e0(r.co2)} kg`);
ok("Serverstrom mindert die CO₂-Bilanz",
   berechne(basis({ serverKey: "kameras" })).co2 < berechne(basis({ serverKey: "mini" })).co2);
const v = co2Vergleiche(500);
ok("500 kg ≈ 40 Bäume (12,5 kg je Baum und Jahr)", v.baeume === 40, `${v.baeume} Bäume`);
ok("500 kg ≈ 3846 Auto-Kilometer (130 g/km)", v.autoKm === 3846, `${v.autoKm} km`);
ok("Ehrlicher Maßstab: Anteil am Pro-Kopf-Ausstoß", nah(v.anteilProKopf, 4.76, 0.05), `${v.anteilProKopf.toFixed(1)} %`);
ok("Der Anteil bleibt bei realistischen Werten unter 100 %", co2Vergleiche(r.co2).anteilProKopf < 100);
ok("PV verbessert die CO₂-Bilanz", pv.co2 > r.co2, `${e0(pv.co2)} kg statt ${e0(r.co2)} kg`);

section("11) Obergrenzen und Randfälle");
const alle = berechne(basis({
  stromMass: new Set(L.STROM_MASSNAHMEN.map((m) => m.key)),
  waermeMass: new Set(["einzelraum", "abwesend", "heizkurve"]),
}));
ok(`Strom gekappt bei ${L.STROM_KAPPE * 100} %`, nah(alle.stromPct, L.STROM_KAPPE, 1e-9), `${(alle.stromPct * 100).toFixed(0)} %`);
ok(`Wärme gekappt bei ${L.WAERME_KAPPE * 100} %`, nah(alle.waermePct, L.WAERME_KAPPE, 1e-9), `${(alle.waermePct * 100).toFixed(0)} %`);
ok("Wärme: Summe der Einzelwerte liegt über der Kappe, sie greift wirklich",
   L.WAERME_MASSNAHMEN.reduce((s, m) => s + m.pct, 0) > L.WAERME_KAPPE);
const leer = berechne(basis({ stromMass: new Set(), waermeMass: new Set(), abos: new Set(), waermequellen: [] }));
ok("Ohne Auswahl ist die Brutto-Ersparnis 0", leer.brutto === 0);
ok("Netto negativ (nur der Server zieht Strom)", leer.netto < 0, `${leer.netto.toFixed(2)} €`);
ok("Keine Amortisation ausweisbar", leer.amortisation === null);
const extrem = [
  berechne(basis({ verbrauch: 800, strompreis: 0.2, flaeche: 40, waermequellen: [quelle("fern", 300)] })),
  berechne(basis({ verbrauch: 9000, strompreis: 0.55, flaeche: 300, pvAktiv: true, pvWp: 2000,
                   waermequellen: [quelle("oel", 4000), quelle("wp", 900, "w")], preissteigerung: 0.1 })),
  leer, alle, pv, hybrid,
];
ok("Alle Zahlen bleiben endlich", extrem.every((x) =>
  Object.entries(x).every(([, val]) =>
    typeof val === "function" || val === null || typeof val === "string" || Array.isArray(val) || typeof val === "object"
      ? true : Number.isFinite(val))));
ok("Größtes Szenario liefert eine plausible Ersparnis",
   extrem[1].netto > 800 && extrem[1].netto < 6000, `${e0(extrem[1].netto)} €/Jahr`);
ok("Preissteigerung 0 % ist erlaubt und rechnet weiter",
   Number.isFinite(berechne(basis({ preissteigerung: 0 })).bilanz10));

section("12) Konsistenz: Jahreswerte gegen die kumulierte Bilanz");
const summeEinzeljahre = Array.from({ length: 10 }, (_, i) => r.nettoImJahr(i + 1)).reduce((s, v) => s + v, 0);
ok("Summe der Einzeljahre = kumulierte Bilanz nach 10 Jahren",
   nah(summeEinzeljahre, r.bilanz10 + r.invest, 0.02), `${e0(summeEinzeljahre)} € vs. ${e0(r.bilanz10 + r.invest)} €`);
ok("Jahr 1 entspricht der Netto-Ersparnis", nah(r.nettoImJahr(1), r.netto, 0.01));
ok("Spätere Jahre bringen mehr (Preissteigerung)", r.nettoImJahr(10) > r.nettoImJahr(1),
   `${e0(r.nettoImJahr(10))} € statt ${e0(r.nettoImJahr(1))} €`);

console.log(`\n──────────────────────────────\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen\n`);
process.exit(fail ? 1 : 0);
