// Prüft die Rechenlogik des Energie-Spar-Rechners gegen von Hand nachvollziehbare Werte.
const L = await import("./sparrechner.ts");
const { berechne, basisVerbrauch, basisWaerme, waermePreisFor } = L;

let pass = 0, fail = 0;
const ok = (name, cond, info = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  OK  " : " FAIL "} ${name}${info ? "  — " + info : ""}`); };
const nah = (a, b, tol = 0.51) => Math.abs(a - b) <= tol;
const e0 = (n) => Math.round(n);

const basis = (over = {}) => ({
  verbrauch: 3500, strompreis: 0.35, heizart: "gas", waermeBedarf: 18000, flaeche: 130,
  stromMass: new Set(["standby", "messung"]), waermeMass: new Set(["einzelraum", "abwesend"]),
  abos: new Set(["icloud", "google"]), serverKey: "nas", investEigen: null, ...over,
});

console.log("=== 1) Startwerte aus den Eckdaten ===");
ok("Haus, 3 Pers., ohne E-Warmwasser = 3500 kWh", basisVerbrauch("haus", 3, false) === 3500);
ok("Wohnung, 1 Pers. = 1300 kWh", basisVerbrauch("wohnung", 1, false) === 1300);
ok("E-Warmwasser hebt den Verbrauch an", basisVerbrauch("haus", 3, true) > basisVerbrauch("haus", 3, false),
   `${basisVerbrauch("haus", 3, false)} → ${basisVerbrauch("haus", 3, true)} kWh`);
ok("Mehr Personen = mehr Verbrauch (monoton)",
   [1, 2, 3, 4, 5].every((p, i, a) => i === 0 || basisVerbrauch("haus", p, false) > basisVerbrauch("haus", a[i - 1], false)));
ok("Wärme 130 m² Haus = 18.000 kWh (auf 500 gerundet)", basisWaerme("haus", 130) === 18000, `${basisWaerme("haus", 130)}`);
ok("Startwert liegt immer auf der Regler-Schrittweite", [40, 75, 130, 199, 300].every((f) => basisWaerme("haus", f) % 500 === 0));

console.log("\n=== 2) Standardfall, von Hand nachgerechnet ===");
const r = berechne(basis());
// Strom: 3500 × 6 % = 210 kWh × 0,35 € = 73,50 €
ok("Stromersparnis 6 % = 210 kWh", nah(r.stromKwh, 210), `${r.stromKwh} kWh`);
ok("Strom in Euro = 73,50 €", nah(r.stromEuro, 73.5, 0.01), `${r.stromEuro.toFixed(2)} €`);
// Wärme: 18000 × 11 % = 1980 kWh × 0,11 € = 217,80 €
ok("Wärmeersparnis 11 % = 1.980 kWh", nah(r.waermeKwh, 1980), `${r.waermeKwh} kWh`);
ok("Wärme in Euro = 217,80 €", nah(r.waermeEuro, 217.8, 0.01), `${r.waermeEuro.toFixed(2)} €`);
// Abos: (2,99 + 2,99) × 12 = 71,76 €
ok("Abos = 71,76 €/Jahr", nah(r.aboEuro, 71.76, 0.01), `${r.aboEuro.toFixed(2)} €`);
// Server: 25 W × 8760 h = 219 kWh × 0,35 € = 76,65 €
ok("Serverstrom = 219 kWh", nah(r.serverKwh, 219), `${r.serverKwh} kWh`);
ok("Serverkosten = 76,65 €", nah(r.serverEuro, 76.65, 0.01), `${r.serverEuro.toFixed(2)} €`);
ok("Netto = brutto − Serverstrom", nah(r.netto, r.brutto - r.serverEuro, 0.001), `${e0(r.netto)} € netto`);
ok("Netto liegt bei rund 286 €", nah(r.netto, 286.4, 1), `${r.netto.toFixed(2)} €`);
ok("Amortisation rund 8 Jahre", nah(r.amortisation, 8.0, 0.3), `${r.amortisation.toFixed(1)} Jahre`);
ok("Investitionsvorschlag ist ein Vielfaches von 50", r.investVorschlag % 50 === 0, `${r.investVorschlag} €`);

console.log("\n=== 3) Der Server rechnet sich gegen (die entscheidende Ehrlichkeit) ===");
const klein = berechne(basis({ serverKey: "mini" }));
const gross = berechne(basis({ serverKey: "kameras" }));
ok("Größerer Server senkt die Netto-Ersparnis", gross.netto < r.netto && r.netto < klein.netto,
   `mini ${e0(klein.netto)} € > nas ${e0(r.netto)} € > kameras ${e0(gross.netto)} €`);
ok("45-W-Server frisst rund 138 € Strom", nah(gross.serverEuro, 137.97, 0.5), `${gross.serverEuro.toFixed(2)} €`);
ok("Serverstrom mindert auch die CO₂-Bilanz", gross.co2 < klein.co2, `${e0(gross.co2)} kg < ${e0(klein.co2)} kg`);

console.log("\n=== 4) Ohne Auswahl bleibt nichts übrig ===");
const leer = berechne(basis({ stromMass: new Set(), waermeMass: new Set(), abos: new Set() }));
ok("Brutto-Ersparnis = 0", leer.brutto === 0);
ok("Netto ist negativ (nur der Server zieht Strom)", leer.netto < 0, `${leer.netto.toFixed(2)} €`);
ok("Keine Amortisation ausweisbar", leer.amortisation === null);
ok("10-Jahres-Bilanz ist negativ", leer.bilanz10 < 0, `${e0(leer.bilanz10)} €`);

console.log("\n=== 5) Obergrenzen greifen ===");
const alle = berechne(basis({
  stromMass: new Set(["standby", "licht", "messung"]),
  waermeMass: new Set(["einzelraum", "abwesend", "heizkurve"]),
}));
ok(`Strom gekappt bei ${L.STROM_KAPPE * 100} %`, nah(alle.stromPct, L.STROM_KAPPE, 0.0001), `${(alle.stromPct * 100).toFixed(0)} %`);
ok(`Wärme gekappt bei ${L.WAERME_KAPPE * 100} %`, nah(alle.waermePct, L.WAERME_KAPPE, 0.0001), `${(alle.waermePct * 100).toFixed(0)} %`);
ok("Strom: Summe der Einzelwerte erreicht genau die Kappe (Sicherheitsnetz)",
   Math.abs(L.STROM_MASSNAHMEN.reduce((s, m) => s + m.pct, 0) - L.STROM_KAPPE) < 1e-9,
   `${(L.STROM_MASSNAHMEN.reduce((s, m) => s + m.pct, 0) * 100).toFixed(0)} % vs. Kappe ${L.STROM_KAPPE * 100} %`);
ok("Wärme: Summe liegt über der Kappe, sie greift also wirklich",
   L.WAERME_MASSNAHMEN.reduce((s, m) => s + m.pct, 0) > L.WAERME_KAPPE,
   `${(L.WAERME_MASSNAHMEN.reduce((s, m) => s + m.pct, 0) * 100).toFixed(0)} % → gekappt auf ${L.WAERME_KAPPE * 100} %`);

console.log("\n=== 6) Heizarten ===");
ok("Gas und Öl 0,11 €/kWh", waermePreisFor("gas", 0.35) === 0.11 && waermePreisFor("oel", 0.35) === 0.11);
ok("Fernwärme 0,14 €/kWh", waermePreisFor("fern", 0.35) === 0.14);
ok("Wärmepumpe = Strompreis ÷ JAZ", nah(waermePreisFor("wp", 0.35), 0.1, 0.001), `${waermePreisFor("wp", 0.35).toFixed(3)} €/kWh`);
ok("Wärmepumpe ist die günstigste Wärme", waermePreisFor("wp", 0.35) < 0.11);
const wp = berechne(basis({ heizart: "wp" }));
ok("Bei Wärmepumpe sinkt die Wärme-Ersparnis in Euro", wp.waermeEuro < r.waermeEuro,
   `${e0(wp.waermeEuro)} € statt ${e0(r.waermeEuro)} €`);
ok("Wärmepumpe spart auch weniger CO₂ pro kWh", wp.co2 < r.co2, `${e0(wp.co2)} kg < ${e0(r.co2)} kg`);
const oel = berechne(basis({ heizart: "oel" }));
ok("Öl spart bei gleichem Preis mehr CO₂ als Gas", oel.co2 > r.co2, `${e0(oel.co2)} kg > ${e0(r.co2)} kg`);

console.log("\n=== 7) Plausibilität gegen die Realität ===");
ok("Stromersparnis bleibt unter 10 % (ohne Geräteaustausch realistisch)", alle.stromPct < 0.1);
ok("Wärmeersparnis bleibt unter 20 %", alle.waermePct < 0.2);
const wohnung = berechne(basis({ verbrauch: basisVerbrauch("wohnung", 2, false), waermeBedarf: basisWaerme("wohnung", 75), flaeche: 75 }));
ok("Wohnung spart weniger als Haus", wohnung.netto < r.netto, `${e0(wohnung.netto)} € < ${e0(r.netto)} €`);
ok("Amortisation ist eine sinnvolle Zahl, keine Fantasie",
   r.amortisation > 3 && r.amortisation < 20, `${r.amortisation.toFixed(1)} Jahre`);
ok("10-Jahres-Bilanz = Netto × 10 − Investition",
   nah(r.bilanz10, r.netto * 10 - r.invest, 0.001), `${e0(r.bilanz10)} €`);
const teuer = berechne(basis({ investEigen: 5000 }));
ok("Eigene Investition überschreibt den Vorschlag", teuer.invest === 5000 && teuer.amortisation > r.amortisation,
   `${teuer.amortisation.toFixed(1)} Jahre statt ${r.amortisation.toFixed(1)}`);

console.log("\n=== 8) Keine kaputten Zahlen in Randfällen ===");
const rand = [
  berechne(basis({ verbrauch: 800, waermeBedarf: 2000, flaeche: 40, strompreis: 0.2 })),
  berechne(basis({ verbrauch: 9000, waermeBedarf: 45000, flaeche: 300, strompreis: 0.55 })),
  leer, alle, wp,
];
ok("Alle Ergebnisse sind endliche Zahlen",
   rand.every((x) => Object.values(x).every((v) => v === null || (typeof v === "number" && Number.isFinite(v)))));
ok("Größtes Szenario liefert plausible Netto-Ersparnis",
   rand[1].netto > 500 && rand[1].netto < 4000, `${e0(rand[1].netto)} €/Jahr`);

console.log(`\n──────────────────────────────\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen\n`);
process.exit(fail ? 1 : 0);
