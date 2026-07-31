import crypto from "crypto";
import type { SupportTicket } from "./store";
import { serverSecret } from "./secret.ts";
import { sign, makeToken, hashToken, verifyToken, istHttps, cookieOptions, originOk } from "./security.ts";

/* ════════════════════════════════════════════════════════════════════════
   TICKET-SICHERHEIT

   Drei getrennte Geheimnisse mit unterschiedlicher Aufgabe:

   1. Ticketnummer (TK-XXXX-XXXX-XXXX) — öffentlich, darf im Betreff einer
      E-Mail stehen. Kryptografisch zufällig, damit sich aus einer bekannten
      Nummer keine weitere ableiten lässt und die Nummer nicht verrät, wie
      viele Tickets es insgesamt gibt.
   2. Zugriffscode — das eigentliche Geheimnis. Wird dem Kunden einmal
      gezeigt und in einem HttpOnly-Cookie gehalten. Auf dem Server liegt
      nur der HMAC, nie der Klartext.
   3. Magic-Link-Token — signiert und zeitlich begrenzt, für den Link in der
      Benachrichtigungs-E-Mail. Wer ihn einlöst, bekommt den Cookie gesetzt.

   Warum Nummer und Code getrennt sind: So kann die Nummer gefahrlos in
   Betreffzeilen, Rechnungen und Telefonaten auftauchen, ohne Zugriff zu
   gewähren. Ein Hochzählen der Nummer in der URL (IDOR) führt zu nichts —
   ohne gültigen Code antwortet der Server mit demselben 404 wie bei einer
   Nummer, die es gar nicht gibt.
   ════════════════════════════════════════════════════════════════════════ */

/* ─────────────────────────── Ticketnummer ─────────────────────────── */

// Crockford-Base32 ohne I, L, O, U — verwechslungsfrei am Telefon und
// unempfindlich gegen Groß-/Kleinschreibung.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function zufallsBlock(laenge: number): string {
  const bytes = crypto.randomBytes(laenge);
  let out = "";
  for (let i = 0; i < laenge; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/**
 * Neue Ticketnummer: TK-XXXX-XXXX-XXXX.
 * 12 Zeichen aus 32 Möglichkeiten ≈ 60 Bit Entropie — Raten ist aussichtslos,
 * und aus einer bekannten Nummer folgt keine andere.
 */
export function newTicketNumber(vorhandene: SupportTicket[] = []): string {
  for (let versuch = 0; versuch < 8; versuch++) {
    const nr = `TK-${zufallsBlock(4)}-${zufallsBlock(4)}-${zufallsBlock(4)}`;
    if (!vorhandene.some((t) => t.number === nr)) return nr;
  }
  // Praktisch unerreichbar; dann eben mit Zeitstempel-Suffix.
  return `TK-${zufallsBlock(4)}-${zufallsBlock(4)}-${Date.now().toString(36).toUpperCase().slice(-4)}`;
}

/** Nummern-Eingaben tolerant normalisieren (Kleinschreibung, fehlende Striche). */
export function normalizeNumber(raw: string): string {
  const roh = raw.toUpperCase().replace(/[^0-9A-Z]/g, "");
  const ohnePrefix = roh.startsWith("TK") ? roh.slice(2) : roh;
  if (ohnePrefix.length !== 12) return raw.trim().toUpperCase();
  return `TK-${ohnePrefix.slice(0, 4)}-${ohnePrefix.slice(4, 8)}-${ohnePrefix.slice(8, 12)}`;
}

/* ─────────────────────────── Zugriffscode ─────────────────────────── */

// makeToken/hashToken/verifyToken kommen jetzt aus security.ts (dort auch
// vom Chat-Modul genutzt) — hier nur noch der ticket-spezifische Rest.

export function hashIp(ip: string): string {
  return crypto.createHmac("sha256", serverSecret()).update(`ip:${ip}`).digest("hex").slice(0, 32);
}

/* ───────────────────── Magic-Link (signiert, befristet) ───────────────────── */

export const MAGIC_GUELTIG_MS = 14 * 24 * 60 * 60 * 1000; // 14 Tage

/**
 * Signierter Link-Token: `<base64url(nummer|code|ablauf)>.<signatur>`.
 *
 * Der Zugriffscode reist mit — anders geht es nicht, denn auf dem Server liegt
 * nur sein HMAC, aus dem er sich nicht zurückrechnen lässt. Das ist kein
 * zusätzliches Risiko: Der Link geht in dasselbe Postfach wie der Code selbst,
 * ist signiert (nicht fälschbar) und läuft nach 14 Tagen ab. Beim Einlösen
 * wandert der Code sofort in einen HttpOnly-Cookie und verschwindet aus der URL.
 */
export function signMagicToken(number: string, code: string, gueltigMs = MAGIC_GUELTIG_MS): string {
  const exp = Date.now() + gueltigMs;
  const nutzlast = `${number}|${code}|${exp}`;
  return `${Buffer.from(nutzlast).toString("base64url")}.${sign(nutzlast)}`;
}

export function verifyMagicToken(token: string): { number: string; code: string } | null {
  const teile = token.split(".");
  if (teile.length !== 2) return null;
  let nutzlast: string;
  try {
    nutzlast = Buffer.from(teile[0], "base64url").toString();
  } catch {
    return null;
  }
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sign(nutzlast)), Buffer.from(teile[1]))) return null;
  } catch {
    return null;
  }
  const [number, code, expRoh] = nutzlast.split("|");
  const exp = Number(expRoh);
  if (!number || !code || !Number.isFinite(exp) || Date.now() > exp) return null;
  return { number, code };
}

/* ─────────────────────── Zugriffs-Cookie (HttpOnly) ─────────────────────── */

export const COOKIE_ZUGRIFF = "sl_ticket_auth";    // Ticketnummern + Codes, signiert
export const COOKIE_SITZUNG = "sl_ticket_session"; // welches Ticket ist offen
export const COOKIE_ZUGRIFF_MAX_ALTER = 60 * 60 * 24 * 90; // 90 Tage
export const COOKIE_SITZUNG_MAX_ALTER = 60 * 60 * 24 * 30; // 30 Tage

export interface Zugriff {
  number: string;
  token: string;
}

/** Zugriffsliste signiert verpacken — Manipulation am Cookie fällt sofort auf. */
export function packZugriffe(zugriffe: Zugriff[]): string {
  const nutzlast = Buffer.from(JSON.stringify(zugriffe.slice(-25))).toString("base64url");
  return `${nutzlast}.${sign(nutzlast)}`;
}

export function entpackZugriffe(cookie: string | undefined): Zugriff[] {
  if (!cookie) return [];
  const [nutzlast, signatur] = cookie.split(".");
  if (!nutzlast || !signatur) return [];
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sign(nutzlast)), Buffer.from(signatur))) return [];
    const daten = JSON.parse(Buffer.from(nutzlast, "base64url").toString());
    if (!Array.isArray(daten)) return [];
    return daten
      .filter((z): z is Zugriff => !!z && typeof z.number === "string" && typeof z.token === "string")
      .slice(-25);
  } catch {
    return [];
  }
}

// Re-Exports unter den bisherigen Namen — beide bestehenden Aufrufer
// (app/api/support/route.ts, app/support/zugang/route.ts) importieren diese
// Namen weiterhin von hier; die eigentliche Umsetzung liegt jetzt in security.ts.
export { istHttps, originOk as herkunftOk, makeToken, hashToken, verifyToken };
export const cookieOptionen = cookieOptions;
