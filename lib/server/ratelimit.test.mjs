/* Prüft den Rate-Limiter und — wichtiger — dass sein Speicher wirklich
   austauschbar ist. Genau das ist der Zweck der Schnittstelle: ein späterer
   Wechsel auf Redis/Upstash darf KEINE Routendatei anfassen müssen.
   Lauf: node --experimental-strip-types --no-warnings lib/server/ratelimit.test.mjs */

import { rateLimit, setRateLimitStore, MemoryRateLimitStore } from "./ratelimit.ts";

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

/* ─────────────────────────────────────────────────────────── */
section("1) Standardspeicher — Zählen und Sperren");

const schluessel = `test:${Math.random()}`;
const ersteDrei = [
  await rateLimit(schluessel, 3, 60_000),
  await rateLimit(schluessel, 3, 60_000),
  await rateLimit(schluessel, 3, 60_000),
];
ok("Die ersten drei Anfragen kommen durch", ersteDrei.every((r) => r.ok));

const vierte = await rateLimit(schluessel, 3, 60_000);
ok("Die vierte wird abgewiesen", !vierte.ok);
ok("retryAfterSec ist gesetzt und plausibel", vierte.retryAfterSec > 0 && vierte.retryAfterSec <= 60,
   `${vierte.retryAfterSec}s`);

const andererSchluessel = await rateLimit(`test:anderer:${Math.random()}`, 3, 60_000);
ok("Ein anderer Schlüssel ist davon unberührt", andererSchluessel.ok);

section("2) Fenster läuft ab");
const kurz = `test:kurz:${Math.random()}`;
await rateLimit(kurz, 1, 50);
const sofort = await rateLimit(kurz, 1, 50);
ok("Innerhalb des Fensters gesperrt", !sofort.ok);
await new Promise((r) => setTimeout(r, 70));
const danach = await rateLimit(kurz, 1, 50);
ok("Nach Ablauf des Fensters wieder frei", danach.ok);

/* ─────────────────────────────────────────────────────────── */
section("3) Speicher austauschbar — die eigentliche Skalierungs-Naht");

// Ein Ersatzspeicher, wie ihn eine Redis-Anbindung darstellen würde:
// asynchron, außerhalb des Prozessspeichers, mit eigener Zählweise.
const aufrufe = [];
setRateLimitStore({
  async hit(key, max, windowMs) {
    aufrufe.push({ key, max, windowMs });
    // Simuliert Netzwerklatenz — der Aufrufer muss damit umgehen können.
    await new Promise((r) => setTimeout(r, 1));
    return { ok: false, retryAfterSec: 42 };
  },
});

const ausErsatz = await rateLimit("egal", 99, 1000);
ok("Der Ersatzspeicher wird tatsächlich befragt", aufrufe.length === 1);
ok("Schlüssel und Grenzwerte kommen unverändert an",
   aufrufe[0].key === "egal" && aufrufe[0].max === 99 && aufrufe[0].windowMs === 1000);
ok("Seine Antwort wird unverändert durchgereicht",
   ausErsatz.ok === false && ausErsatz.retryAfterSec === 42);

// Zurücksetzen, damit nachfolgende Läufe wieder den Standard verwenden.
setRateLimitStore(new MemoryRateLimitStore());
const wiederStandard = await rateLimit(`test:zurueck:${Math.random()}`, 5, 60_000);
ok("Nach dem Zurücksetzen greift wieder der Standardspeicher", wiederStandard.ok);

/* ─────────────────────────────────────────────────────────── */
console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen.`);
if (fehlgeschlagen > 0) process.exit(1);
