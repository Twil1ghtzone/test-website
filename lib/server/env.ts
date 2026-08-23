import path from "path";
import { z } from "zod";

/* ════════════════════════════════════════════════════════════════════════
   UMGEBUNGSVARIABLEN — EINMAL GELESEN, EINMAL GEPRÜFT

   Vorher wurde `process.env.X` an mehreren Stellen direkt gelesen
   (secret.ts, store.ts, support/route.ts, blog/subscribe/route.ts …). Ein
   Tippfehler in der Compose-Datei fiel dadurch nicht beim Start auf, sondern
   erst als verwirrender Folgefehler mitten im Betrieb — oder gar nicht, weil
   still ein Rückfallwert griff.

   Diese Datei ist die einzige Stelle, die `process.env` anfasst. Alles
   andere importiert `env`.

   ── Zwei bewusste Entwurfsentscheidungen ──

   1. FELDWEISE Prüfung, nicht `schema.safeParse(process.env)` über alles.
      Ein einziger ungültiger Wert würde sonst ALLE anderen mitverwerfen —
      eine fehlerhafte BASE_URL hätte auch DATA_DIR unbrauchbar gemacht.
      Jedes Feld steht für sich: ungültig → Warnung + Rückfall, der Rest
      bleibt gültig.

   2. KEIN harter Abbruch. Ein `throw` beim Import würde auch `next build`
      abbrechen, der ohne echte Produktionsgeheimnisse läuft. Fehlkonfiguration
      wird stattdessen einmal deutlich ins Log geschrieben.

   SMTP steht bewusst NICHT hier: Die Zugangsdaten werden im Admin gepflegt
   und liegen in settings.json, nicht in der Umgebung (siehe mail.ts).
   ════════════════════════════════════════════════════════════════════════ */

/** Empfohlene Mindestlänge für HMAC-Schlüssel (256 Bit als Hex). */
const SECRET_MINDESTLAENGE = 32;

function warne(variable: string, meldung: string): void {
  console.warn(`[Konfiguration] ${variable}: ${meldung}`);
}

/**
 * Prüft einen einzelnen Wert. Ungültig → `undefined` + Warnung mit
 * Variablennamen, damit die Ursache ohne Stacktrace erkennbar ist.
 */
function pruefe<T>(variable: string, wert: string | undefined, schema: z.ZodType<T>): T | undefined {
  if (wert === undefined || wert === "") return undefined;
  const ergebnis = schema.safeParse(wert);
  if (ergebnis.success) return ergebnis.data;
  warne(variable, ergebnis.error.issues[0]?.message ?? "ungültiger Wert — wird ignoriert.");
  return undefined;
}

const nodeEnv = pruefe("NODE_ENV", process.env.NODE_ENV, z.enum(["development", "test", "production"])) ?? "development";
const isProduction = nodeEnv === "production";

/*
 * SESSION_SECRET wird bei zu geringer Länge NICHT verworfen, sondern nur
 * bemängelt. Ein gesetztes, kurzes Geheimnis stillschweigend zu ignorieren
 * wäre die schlechtere Wahl: Der Server fiele dann auf den Entwicklungs-
 * Platzhalter zurück, und der Betreiber hielte sein System für abgesichert,
 * obwohl ein im Quellcode stehender Wert signiert. Lieber schwach als
 * öffentlich bekannt — plus eine unmissverständliche Warnung.
 */
const sessionSecret = process.env.SESSION_SECRET || undefined;
if (sessionSecret && sessionSecret.length < SECRET_MINDESTLAENGE) {
  warne(
    "SESSION_SECRET",
    `nur ${sessionSecret.length} Zeichen — empfohlen sind mindestens ${SECRET_MINDESTLAENGE}. ` +
    "Erzeugen mit: openssl rand -hex 32"
  );
}
if (!sessionSecret && isProduction) {
  warne(
    "SESSION_SECRET",
    "in Produktion nicht gesetzt — Sessions und Cookies enden bei jedem Neustart (siehe .env.example)."
  );
}

const dataDirRoh = pruefe("DATA_DIR", process.env.DATA_DIR, z.string().min(1));
const baseUrlRoh =
  pruefe("BASE_URL", process.env.BASE_URL, z.string().url("muss eine vollständige URL sein (z. B. https://meine-firma.de).")) ??
  pruefe("NEXT_PUBLIC_BASE_URL", process.env.NEXT_PUBLIC_BASE_URL, z.string().url("muss eine vollständige URL sein."));

/*
 * Öffentliche Adresse der Seite — landet in sitemap.xml, robots.txt und den
 * Open-Graph-Vorschaubildern, die alle ABSOLUTE URLs brauchen.
 *
 * BEWUSST KEINE strikte `.url()`-Prüfung: Die Eingabe "meine-firma.de" ohne
 * Schema ist ein häufiger und hier ausdrücklich unterstützter Fall — sie
 * wird ergänzt statt abgelehnt (dieses Verhalten stand vorher in lib/site.ts
 * und bleibt unverändert). Eine strikte Prüfung hätte solche Werte verworfen
 * und wäre still auf localhost zurückgefallen: schlimmer als das Problem.
 *
 * Ein in Produktion stehengebliebenes "localhost" ist dagegen der klassische
 * Fehler nach dem ersten Deployment — geteilte Links zeigen dann ins Leere.
 * Das ist eine Warnung wert.
 */
const SITE_URL_FALLBACK = "http://localhost:3000";
function normalisiereSiteUrl(roh: string): string {
  const getrimmt = roh.trim();
  const mitSchema = /^https?:\/\//i.test(getrimmt) ? getrimmt : `https://${getrimmt}`;
  return mitSchema.replace(/\/+$/, "");
}
const siteUrl = normalisiereSiteUrl(process.env.SITE_URL || SITE_URL_FALLBACK);
if (isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)/i.test(siteUrl)) {
  warne("SITE_URL", "zeigt in Produktion auf localhost — geteilte Links, Sitemap und Vorschaubilder sind dadurch unbrauchbar.");
}

/** Zweiter Ablageort für verschlüsselte Backups ("RAID-Schutz" im Admin). */
const backupMirrorRoh = pruefe("BACKUP_MIRROR_DIR", process.env.BACKUP_MIRROR_DIR, z.string().min(1));

export const env = {
  nodeEnv,
  isProduction,
  /** Kann fehlen — secret.ts hat einen bewussten, dokumentierten Rückfall. */
  sessionSecret,
  /*
   * Immer ein absoluter Pfad — Aufrufer müssen nicht mehr selbst joinen.
   *
   * `turbopackIgnore`: Der Wert steht erst zur Laufzeit fest (er kommt aus
   * der Umgebung). Turbopack verfolgt daraufhin vorsichtshalber das GANZE
   * Projekt in die Standalone-Ausgabe — dadurch landeten dort früher u. a.
   * `data/` mit den Passwort-Hashes. Seit der Zentralisierung gibt es dafür
   * genau DIESE eine Stelle statt vorher mehrerer verstreuter Zugriffe.
   */
  dataDir: dataDirRoh ? path.resolve(/* turbopackIgnore: true */ dataDirRoh) : path.join(process.cwd(), "data"),
  /** Ohne abschließenden Schrägstrich, damit `${baseUrl}/pfad` immer stimmt. */
  baseUrl: baseUrlRoh?.replace(/\/$/, ""),
  /** Immer absolut und ohne Schrägstrich am Ende — nie undefined. */
  siteUrl,
  /** Leerer String = Spiegelung aus (so war das Verhalten vorher auch). */
  backupMirrorDir: backupMirrorRoh ?? "",
} as const;
