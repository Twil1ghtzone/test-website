/* Prüft die Schutzmechanismen des Backup-Systems.
   Jeder Abschnitt steht für eine Schwachstelle, die vorher offen war.
   Lauf: node --experimental-strip-types --no-warnings lib/server/backup.test.mjs */

import {
  BACKUP_FORMAT, istHuelleGueltig, istBekanntesFormat, pruefeForm,
  istSensibel, verweigerteSammlungen, zusammenfuehren, eintragSchluessel,
  istGueltigerSnapshotName, ueberzaehligeSnapshots, snapshotName,
  SNAPSHOTS_BEHALTEN, SAMMLUNG_IST_OBJEKT, SNAPSHOT_MUSTER,
} from "./backup.ts";
import { COLLECTIONS } from "./store.ts";

let pass = 0, fail = 0;
const ok = (name, cond, info = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "  OK  " : " FAIL "} ${name}${info ? "  — " + info : ""}`);
};
const section = (t) => console.log(`\n=== ${t} ===`);

const huelle = { salt: "s", iv: "i", tag: "t", data: "d" };

section("1) Rechteausweitung über den Import ist zu");
ok("users.json gilt als sensibel", istSensibel("users.json"));
ok("settings.json gilt als sensibel (enthält den KI-Endpunkt)", istSensibel("settings.json"));
ok("legal.json gilt als sensibel (öffentlich, rechtlich bindend)", istSensibel("legal.json"));
ok("Harmlose Sammlungen sind nicht gesperrt", !istSensibel("blog.json") && !istSensibel("inquiries.json"));

const alsRedakteur = verweigerteSammlungen(["blog.json", "users.json", "inquiries.json"], false);
ok("Ein Nicht-Admin darf users.json NICHT einspielen", alsRedakteur.includes("users.json"),
   `verweigert: ${alsRedakteur.join(", ")}`);
ok("… die harmlosen Sammlungen aber schon",
   !alsRedakteur.includes("blog.json") && !alsRedakteur.includes("inquiries.json"));
ok("Ein Admin darf alles einspielen",
   verweigerteSammlungen(["users.json", "settings.json", "legal.json"], true).length === 0);

section("2) Formprüfung — ein kaputtes Backup darf die Seite nicht lahmlegen");
ok("Liste als Liste ist in Ordnung", pruefeForm("blog.json", [{ id: "1" }]) === null);
ok("Leere Liste ist in Ordnung", pruefeForm("blog.json", []) === null);
ok("Objekt statt Liste wird abgelehnt", pruefeForm("blog.json", { a: 1 })?.grund.includes("Liste"),
   pruefeForm("blog.json", { a: 1 })?.grund);
ok("Zeichenkette statt Liste wird abgelehnt", pruefeForm("users.json", "kaputt") !== null);
ok("null wird abgelehnt", pruefeForm("users.json", null) !== null);
ok("Liste mit Nicht-Datensätzen wird abgelehnt",
   pruefeForm("users.json", [{ id: "a" }, "text"])?.grund.includes("Datensätze"));
ok("settings.json muss ein Objekt sein", pruefeForm("settings.json", { ai: {} }) === null);
ok("settings.json als Liste wird abgelehnt", pruefeForm("settings.json", [])?.grund.includes("Objekt"));
ok("Unbekannte Sammlungen werden abgelehnt", pruefeForm("hack.json", [])?.grund === "unbekannte Sammlung");
ok("Jede Sammlung hat eine definierte Erwartung",
   Object.keys(COLLECTIONS).every((f) => pruefeForm(f, SAMMLUNG_IST_OBJEKT[f] ? {} : []) === null),
   `${Object.keys(COLLECTIONS).length} Sammlungen geprüft`);

section("3) Herkunft der Datei wird geprüft");
ok("Gültige Hülle wird erkannt", istHuelleGueltig(huelle));
ok("Fehlendes Feld wird erkannt", !istHuelleGueltig({ salt: "s", data: "d" }));
ok("Leere Felder zählen nicht", !istHuelleGueltig({ salt: "", iv: "i", tag: "t", data: "d" }));
ok("null ist keine Hülle", !istHuelleGueltig(null));
ok("Eigenes Format wird akzeptiert", istBekanntesFormat({ format: BACKUP_FORMAT }));
ok("Altbestand mit collections wird akzeptiert", istBekanntesFormat({ collections: {} }));
ok("Altbestand v1 wird akzeptiert", istBekanntesFormat({ users: [] }));
ok("Fremde JSON-Struktur wird abgelehnt", !istBekanntesFormat({ hallo: "welt" }));
ok("Zeichenkette wird abgelehnt", !istBekanntesFormat("nope"));

section("4) Zusammenführen verliert und überschreibt nichts");
const bestehend = [{ id: "a", t: "alt" }, { id: "b" }];
const eingehend = [{ id: "b", t: "NEU" }, { id: "c" }];
const z = zusammenfuehren(bestehend, eingehend);
ok("Nur wirklich neue Einträge kommen dazu", z.neu === 1, `${z.neu} neu`);
ok("Bestehende Einträge bleiben unverändert",
   z.ergebnis.find((x) => x.id === "b").t === undefined,
   "b wurde NICHT durch die eingehende Fassung ersetzt");
ok("Nichts geht verloren", z.ergebnis.length === 3);
ok("Neue Einträge stehen vorn", z.ergebnis[0].id === "c");
ok("Zweimal dasselbe einspielen ändert nichts (idempotent)",
   zusammenfuehren(z.ergebnis, eingehend).neu === 0);
ok("Schlüssel greift auf id, dann number, dann email",
   eintragSchluessel({ id: "x" }) === "x" &&
   eintragSchluessel({ number: "RG-1" }) === "RG-1" &&
   eintragSchluessel({ email: "a@b.de" }) === "a@b.de");

section("5) Dateinamen — kein Ausbruch aus dem Sicherungsordner");
const gueltig = snapshotName(new Date("2026-08-01T21:00:27.634Z"));
ok("Erzeugter Name passt zum Muster", istGueltigerSnapshotName(gueltig), gueltig);
ok("Muster und Prüfung sind konsistent", SNAPSHOT_MUSTER.test(gueltig));
for (const boes of [
  "../../data/users.json",
  "..",
  ".",
  "snapshot-../../x.slbak",
  "snapshot-\u0000.slbak",
  "/etc/passwd",
  "C:\\Windows\\win.ini",
  "users.json",
  "snapshot-2026.txt",
  "",
]) {
  ok(`abgelehnt: ${JSON.stringify(boes)}`, !istGueltigerSnapshotName(boes));
}
ok("Übermäßig lange Namen werden abgelehnt", !istGueltigerSnapshotName("snapshot-" + "1".repeat(200) + ".slbak"));

section("6) Aufräumen — das Volume läuft nicht voll");
const viele = Array.from({ length: 25 }, (_, i) => ({ name: `s${i}` }));
const weg = ueberzaehligeSnapshots(viele);
ok(`Es bleiben ${SNAPSHOTS_BEHALTEN} Sicherungen übrig`, viele.length - weg.length === SNAPSHOTS_BEHALTEN,
   `${weg.length} von ${viele.length} entfernt`);
ok("Entfernt werden die ÄLTESTEN (Liste ist neu→alt sortiert)", weg[0].name === `s${SNAPSHOTS_BEHALTEN}`);
ok("Bei wenigen Sicherungen wird nichts entfernt", ueberzaehligeSnapshots([{ name: "a" }]).length === 0);
ok("Genau an der Grenze wird nichts entfernt",
   ueberzaehligeSnapshots(viele.slice(0, SNAPSHOTS_BEHALTEN)).length === 0);
ok("behalten=0 lässt alles stehen (Sicherheitsnetz gegen Totallöschung)",
   ueberzaehligeSnapshots(viele, 0).length === 0);

console.log("\n──────────────────────────────");
console.log(`Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
