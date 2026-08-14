/* ════════════════════════════════════════════════════════════════════════
   BACKUP — Prüf- und Entscheidungslogik

   Reine Funktionen ohne HTTP und ohne Dateisystem, damit sie unabhängig
   prüfbar sind (lib/server/backup.test.mjs). Die Route ruft sie auf.

   Behebt vier Schwachstellen des Import-/Export-Pfads:

   1. RECHTEAUSWEITUNG ÜBER DEN IMPORT
      Der Import verlangte nur die Berechtigung "backup". Im Modus „merge"
      werden Arrays zusammengeführt — wer eine eigene Sicherungsdatei baute
      (die Passphrase kennt man ja, man erzeugt sie selbst) und dort in
      users.json einen zusätzlichen Admin einträgt, bekam diesen Eintrag
      angefügt und konnte sich danach als Admin anmelden. Aus „darf Backups
      machen" wurde damit „darf alles".

   2. KEINE FORMPRÜFUNG BEIM SCHREIBEN
      `writeJson(file, incoming)` schrieb, was auch immer in der Datei stand.
      Enthielt users.json statt einer Liste eine Zeichenkette, lief danach
      jede Anfrage in `readUsers().map(...)` auf die Nase — die Seite war
      unbrauchbar und ließ sich nur noch von Hand reparieren.

   3. HERKUNFT WURDE NIE GEPRÜFT
      Beim Export wird `format: "studio-lokal-backup"` geschrieben, beim
      Import aber nie gelesen. Jede beliebige, mit derselben Passphrase
      verschlüsselte JSON-Struktur wurde als Sicherung akzeptiert.

   4. UNBEGRENZT WACHSENDE SICHERUNGEN
      Serverseitige Sicherungen enthalten alle Uploads base64-kodiert (rund
      ein Drittel Aufschlag). Ohne Aufräumen füllt sich das Volume, bis der
      Server nichts mehr schreiben kann — auch die Datenbank nicht.
   ════════════════════════════════════════════════════════════════════════ */

import { COLLECTIONS, type CollectionFile } from "./store.ts";

export const BACKUP_FORMAT = "studio-lokal-backup";

/**
 * Welche Sammlungen sind Listen, welche einzelne Objekte?
 *
 * Wird eine Sammlung in der falschen Form zurückgespielt, laufen die
 * Lesefunktionen darauf auf (z. B. `.map` auf einem Objekt). Deshalb wird
 * die Form vor dem Schreiben geprüft.
 */
export const SAMMLUNG_IST_OBJEKT: Partial<Record<CollectionFile, true>> = {
  "settings.json": true,
  "legal.json": true,
};

/**
 * Sammlungen, die über einen Import zur Rechteausweitung taugen.
 *
 * users.json  — enthält Rollen und Passwort-Hashes.
 * settings.json — enthält u. a. den KI-Endpunkt (Datenabfluss nach außen).
 * legal.json  — öffentlich sichtbare, rechtlich bindende Texte.
 *
 * Diese drei darf nur ein Admin einspielen, unabhängig vom Modus.
 */
export const SENSIBLE_SAMMLUNGEN: CollectionFile[] = ["users.json", "settings.json", "legal.json"];

export function istSensibel(file: string): boolean {
  return (SENSIBLE_SAMMLUNGEN as string[]).includes(file);
}

/** Hat die Datei überhaupt die Gestalt einer verschlüsselten Sicherung? */
export function istHuelleGueltig(blob: unknown): boolean {
  if (!blob || typeof blob !== "object") return false;
  const b = blob as Record<string, unknown>;
  return ["salt", "iv", "tag", "data"].every((k) => typeof b[k] === "string" && (b[k] as string).length > 0);
}

/**
 * Stammt der entschlüsselte Inhalt aus dieser Anwendung?
 *
 * Alte Sicherungen (v1/v2) kennen das Feld noch nicht — die werden weiter
 * akzeptiert, wenn sie erkennbar die passende Struktur haben.
 */
export function istBekanntesFormat(json: unknown): boolean {
  if (!json || typeof json !== "object") return false;
  const j = json as Record<string, unknown>;
  if (j.format === BACKUP_FORMAT) return true;
  // Altbestand: entweder ein collections-Objekt oder die flachen v1-Schlüssel.
  if (j.collections && typeof j.collections === "object") return true;
  return ["users", "inquiries", "settings"].some((k) => j[k] !== undefined);
}

export interface Formfehler {
  file: string;
  grund: string;
}

/**
 * Prüft, ob der Inhalt einer Sammlung die erwartete Form hat.
 * Gibt `null` zurück, wenn alles passt.
 */
export function pruefeForm(file: string, wert: unknown): Formfehler | null {
  if (!(file in COLLECTIONS)) return { file, grund: "unbekannte Sammlung" };
  const sollObjekt = !!SAMMLUNG_IST_OBJEKT[file as CollectionFile];

  if (sollObjekt) {
    if (wert === null || typeof wert !== "object" || Array.isArray(wert)) {
      return { file, grund: "erwartet ein Objekt, gefunden " + kurzTyp(wert) };
    }
    return null;
  }
  if (!Array.isArray(wert)) {
    return { file, grund: "erwartet eine Liste, gefunden " + kurzTyp(wert) };
  }
  // Listen dürfen nur Objekte enthalten — sonst brechen die Lesefunktionen.
  if (wert.some((x) => x === null || typeof x !== "object" || Array.isArray(x))) {
    return { file, grund: "die Liste enthält Einträge, die keine Datensätze sind" };
  }
  return null;
}

function kurzTyp(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "eine Liste";
  return typeof v === "object" ? "ein Objekt" : `${typeof v}`;
}

/**
 * Darf dieser Benutzer die gewählten Sammlungen einspielen?
 * Gibt die Namen zurück, die verweigert werden (leer = alles erlaubt).
 */
export function verweigerteSammlungen(dateien: string[], istAdmin: boolean): string[] {
  if (istAdmin) return [];
  return dateien.filter(istSensibel);
}

/** Schlüssel, über den beim Zusammenführen Dubletten erkannt werden. */
export function eintragSchluessel(x: unknown): string {
  const o = x as Record<string, unknown>;
  return String(o?.id ?? o?.number ?? o?.email ?? JSON.stringify(x));
}

/**
 * Führt eine eingehende Liste mit der bestehenden zusammen, ohne etwas zu
 * verlieren oder zu überschreiben. Neue Einträge kommen nach vorn.
 */
export function zusammenfuehren<T>(bestehend: T[], eingehend: T[]): { ergebnis: T[]; neu: number } {
  const bekannt = new Set(bestehend.map(eintragSchluessel));
  const neu = eingehend.filter((x) => !bekannt.has(eintragSchluessel(x)));
  return { ergebnis: [...neu, ...bestehend], neu: neu.length };
}

/* ────────────────────────── Serverseitige Sicherungen ────────────────────────── */

/** Nur genau dieses Muster wird als Sicherungsdatei akzeptiert. */
export const SNAPSHOT_MUSTER = /^snapshot-[0-9TZ:.-]+\.slbak$/;

/**
 * Streng geprüfter Dateiname für Download und Löschen.
 *
 * Der Name kommt aus der Adresszeile, ist also Nutzereingabe. Ohne diese
 * Prüfung könnte darüber jede Datei des Servers gelesen werden — auch
 * `users.json` mit den Passwort-Hashes.
 */
export function istGueltigerSnapshotName(name: string): boolean {
  if (typeof name !== "string" || name.length === 0 || name.length > 120) return false;
  if (name.includes("/") || name.includes("\\") || name.includes("\0")) return false;
  if (name === "." || name === ".." || name.includes("..")) return false;
  return SNAPSHOT_MUSTER.test(name);
}

/** Wie viele serverseitige Sicherungen aufgehoben werden. */
export const SNAPSHOTS_BEHALTEN = 10;

/**
 * Welche Sicherungen dürfen weg? Erwartet eine nach Datum absteigend
 * sortierte Liste und gibt die überzähligen (ältesten) zurück.
 */
export function ueberzaehligeSnapshots<T>(sortiertNeuZuAlt: T[], behalten = SNAPSHOTS_BEHALTEN): T[] {
  if (behalten <= 0) return [];
  return sortiertNeuZuAlt.slice(behalten);
}

/** Erzeugt den Dateinamen einer neuen Sicherung. */
export function snapshotName(datum = new Date()): string {
  return `snapshot-${datum.toISOString().replace(/[:.]/g, "-")}.slbak`;
}
