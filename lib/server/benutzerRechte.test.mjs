/* Prüft die Zugriffsregeln der Benutzerverwaltung.
   Jeder Test hier steht für eine Rechteausweitung, die vorher möglich war.
   Lauf: node --experimental-strip-types --no-warnings lib/server/benutzerRechte.test.mjs */

import {
  darfKontoBearbeiten, darfRolleAendern, darfAktivAendern,
  darfRechteSetzen, darfPasswortSetzen, darfLoeschen,
  rechteBeimAnlegen, rolleBeimAnlegen,
} from "./benutzerRechte.ts";
import { ALL_PERMISSIONS, fullPermissions } from "./store.ts";

let pass = 0, fail = 0;
const ok = (name, cond, info = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "  OK  " : " FAIL "} ${name}${info ? "  — " + info : ""}`);
};
const section = (t) => console.log(`\n=== ${t} ===`);

const admin = { id: "a1", role: "admin" };
const admin2 = { id: "a2", role: "admin" };
const redakteur = { id: "r1", role: "editor" };
const redakteur2 = { id: "r2", role: "editor" };

const alleRechte = () => {
  const p = fullPermissions();
  return p;
};

section("1) Admin-Konten sind vor Redakteuren geschützt");
ok("Redakteur darf ein Admin-Konto NICHT bearbeiten", !darfKontoBearbeiten(redakteur, admin));
ok("Redakteur darf ein Admin-Konto NICHT löschen", !darfLoeschen(redakteur, admin));
ok("Redakteur darf das Passwort eines Admins NICHT setzen", !darfPasswortSetzen(redakteur, admin));
ok("Admin darf ein anderes Admin-Konto bearbeiten", darfKontoBearbeiten(admin, admin2));
ok("Admin darf ein anderes Admin-Konto löschen", darfLoeschen(admin, admin2));

section("2) Niemand hebt seine eigenen Rechte an");
ok("Admin darf sich selbst KEINE Rechte setzen", !darfRechteSetzen(admin, admin));
ok("Redakteur darf sich selbst KEINE Rechte setzen", !darfRechteSetzen(redakteur, redakteur));
ok("Redakteur darf auch fremden Konten keine Rechte setzen", !darfRechteSetzen(redakteur, redakteur2));
ok("Nur der Admin setzt Rechte — und nur bei anderen", darfRechteSetzen(admin, redakteur));

section("3) Selbst-Aussperren ist ausgeschlossen");
ok("Niemand löscht sich selbst", !darfLoeschen(admin, admin) && !darfLoeschen(redakteur, redakteur));
ok("Niemand deaktiviert sich selbst", !darfAktivAendern(admin, admin));
ok("Niemand ändert die eigene Rolle", !darfRolleAendern(admin, admin));
ok("Admin darf andere deaktivieren", darfAktivAendern(admin, redakteur));

section("4) Die Admin-Rolle vergibt nur ein Admin");
ok("Redakteur kann keine Admin-Rolle vergeben", !darfRolleAendern(redakteur, redakteur2));
ok("Admin kann die Rolle anderer ändern", darfRolleAendern(admin, redakteur));
ok("Beim Anlegen: Redakteur erzeugt nie einen Admin",
   rolleBeimAnlegen(redakteur, "admin") === "editor");
ok("Beim Anlegen: Admin darf einen Admin erzeugen",
   rolleBeimAnlegen(admin, "admin") === "admin");
ok("Ohne Angabe wird es ein Redakteur", rolleBeimAnlegen(admin, undefined) === "editor");

section("5) Rechte beim Anlegen — der Umweg über ein neues Konto ist zu");
const gewuenscht = alleRechte();
const vomRedakteur = rechteBeimAnlegen(redakteur, "editor", gewuenscht);
ok("Ein Redakteur kann kein Konto mit Rechten anlegen",
   ALL_PERMISSIONS.every((p) => vomRedakteur[p] === false),
   "alle Berechtigungen auf false");
const vomAdmin = rechteBeimAnlegen(admin, "editor", gewuenscht);
ok("Ein Admin darf Rechte mitgeben", ALL_PERMISSIONS.every((p) => vomAdmin[p] === true));
ok("Ein neues Admin-Konto bekommt immer alle Rechte",
   ALL_PERMISSIONS.every((p) => rechteBeimAnlegen(admin, "admin", undefined)[p] === true));
ok("Ohne gewünschte Rechte startet das Konto leer",
   ALL_PERMISSIONS.every((p) => rechteBeimAnlegen(admin, "editor", undefined)[p] === false));

section("6) Der Normalfall bleibt möglich");
ok("Admin bearbeitet ein Redakteurs-Konto", darfKontoBearbeiten(admin, redakteur));
ok("Admin setzt ein fremdes Passwort zurück", darfPasswortSetzen(admin, redakteur));
ok("Redakteur mit users-Recht darf andere Redakteure bearbeiten",
   darfKontoBearbeiten(redakteur, redakteur2),
   "Namen/E-Mail pflegen bleibt erlaubt");
ok("… aber ohne Passwortzugriff", !darfPasswortSetzen(redakteur, redakteur2));

section("7) Berechtigungsliste existiert nur EINMAL");
// Der Store reicht die Liste aus lib/permissions.ts nur weiter. Kämen die
// Definitionen wieder doppelt vor (Server + Admin-Panel), könnte eine neue
// Berechtigung an einer Stelle fehlen — und wäre in der Oberfläche unsichtbar,
// also weder vergebbar noch entziehbar.
const Store = await import("./store.ts");
const Perms = await import("../permissions.ts");
ok("Store und Modul liefern dieselbe Liste (identische Referenz)",
   Store.ALL_PERMISSIONS === Perms.ALL_PERMISSIONS);
ok("Auch die Beschriftungen sind dieselbe Referenz",
   Store.PERMISSION_LABELS === Perms.PERMISSION_LABELS);
ok("Jede Berechtigung hat eine Beschriftung",
   Perms.ALL_PERMISSIONS.every((p) => typeof Perms.PERMISSION_LABELS[p] === "string" && Perms.PERMISSION_LABELS[p].length > 0));
ok("Keine Beschriftung ohne Berechtigung (keine Karteileiche)",
   Object.keys(Perms.PERMISSION_LABELS).length === Perms.ALL_PERMISSIONS.length,
   `${Object.keys(Perms.PERMISSION_LABELS).length} Beschriftungen / ${Perms.ALL_PERMISSIONS.length} Rechte`);
ok("Keine doppelten Einträge in der Liste",
   new Set(Perms.ALL_PERMISSIONS).size === Perms.ALL_PERMISSIONS.length);

console.log("\n──────────────────────────────");
console.log(`Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
