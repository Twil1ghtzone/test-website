/* Tests für die FAQ-Suche.
   Lauf: node --experimental-strip-types --no-warnings lib/faq.test.mjs */

import { faqGruppen, alleFragen, normalisieren, filterFaq } from "./faq.ts";

let bestanden = 0;
let fehlgeschlagen = 0;

function ok(name, bedingung, detail = "") {
  if (bedingung) {
    bestanden++;
    console.log(`  OK   ${name}${detail ? `  — ${detail}` : ""}`);
  } else {
    fehlgeschlagen++;
    console.log(` FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
}
const section = (t) => console.log(`\n=== ${t} ===`);

const zaehle = (gruppen) => gruppen.reduce((s, g) => s + g.fragen.length, 0);

section("1) Datenbestand");
ok("Es gibt mehrere Themengruppen", faqGruppen.length >= 4, `${faqGruppen.length} Gruppen`);
ok("Alle Fragen sind flach abrufbar (FAQPage-Schema)", alleFragen.length === zaehle(faqGruppen),
   `${alleFragen.length} Fragen`);
ok("Keine Frage ist leer", alleFragen.every((f) => f.frage.trim() && f.antwort.trim()));
ok("Keine doppelten Fragen", new Set(alleFragen.map((f) => f.frage)).size === alleFragen.length);

section("2) Normalisierung — Umlaute dürfen egal sein");
ok("Umlaute werden zerlegt", normalisieren("Wärmepumpe") === "warmepumpe", normalisieren("Wärmepumpe"));
ok("Großschreibung egal", normalisieren("KOSTEN") === "kosten");
ok("ß wird zu ss", normalisieren("Straße") === "strasse", normalisieren("Straße"));
ok("Bereits normaler Text bleibt gleich", normalisieren("miete") === "miete");

section("3) Filtern");
const alle = zaehle(faqGruppen);
ok("Leere Suche liefert alles", zaehle(filterFaq(faqGruppen, "")) === alle, `${alle} Fragen`);
ok("Nur Leerzeichen liefert ebenfalls alles", zaehle(filterFaq(faqGruppen, "   ")) === alle);

const miete = filterFaq(faqGruppen, "Miete");
ok("Suche nach 'Miete' findet die Mietwohnungs-Frage", zaehle(miete) >= 1, `${zaehle(miete)} Treffer`);
ok("… und filtert deutlich ein", zaehle(miete) < alle);

const kosten = filterFaq(faqGruppen, "kosten");
ok("Suche nach 'kosten' findet mehrere Fragen", zaehle(kosten) >= 2, `${zaehle(kosten)} Treffer`);

// Der Begriff steht NUR in der Antwort, nicht in der Frage — beweist,
// dass auch der Fließtext durchsucht wird.
const antwortTreffer = filterFaq(faqGruppen, "Bundesland");
ok("Begriffe aus der ANTWORT werden gefunden", zaehle(antwortTreffer) >= 1,
   `${zaehle(antwortTreffer)} Treffer für „Bundesland"`);
ok("… und der Treffer steht wirklich nur in der Antwort",
   antwortTreffer.every((g) => g.fragen.every((f) => !normalisieren(f.frage).includes("bundesland"))));

section("4) Umlaut-Toleranz in der echten Suche");
// "Förderung" steht wirklich im Text — sonst wäre der Vergleich 0 === 0
// und damit wertlos.
const mitUmlaut = filterFaq(faqGruppen, "Förderung");
const ohneUmlaut = filterFaq(faqGruppen, "forderung");
ok("Der Testbegriff kommt überhaupt vor", zaehle(mitUmlaut) >= 1, `${zaehle(mitUmlaut)} Treffer`);
ok("Mit und ohne Umlaut liefert dasselbe", zaehle(mitUmlaut) === zaehle(ohneUmlaut),
   `${zaehle(mitUmlaut)} vs. ${zaehle(ohneUmlaut)}`);
ok("Groß-/Kleinschreibung ändert nichts",
   zaehle(filterFaq(faqGruppen, "KOSTEN")) === zaehle(filterFaq(faqGruppen, "kosten")));

section("5) Randfälle");
ok("Unsinns-Suche liefert keine Gruppen", filterFaq(faqGruppen, "xyzabc123").length === 0);
ok("Leere Gruppen fallen weg (keine Überschrift ohne Inhalt)",
   filterFaq(faqGruppen, "Miete").every((g) => g.fragen.length > 0));
ok("Original bleibt unverändert (kein versehentliches Mutieren)",
   zaehle(faqGruppen) === alle, `weiterhin ${zaehle(faqGruppen)} Fragen`);

console.log("\n──────────────────────────────");
console.log(`Ergebnis: ${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen`);
process.exit(fehlgeschlagen === 0 ? 0 : 1);
