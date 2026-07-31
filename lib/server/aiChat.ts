import crypto from "crypto";
import type { NextRequest } from "next/server";
import { readJson, writeJson } from "./store.ts";
import { serverSecret } from "./secret.ts";
import { makeToken, hashToken, verifyToken, cookieOptions } from "./security.ts";

/* ════════════════════════════════════════════════════════════════════════
   ÖFFENTLICHER KI-CHAT — SITZUNG, VERSCHLÜSSELUNG, AUFBEWAHRUNG

   Ziel: ein Besucher kann den Support-Chat verlassen und später zurückkommen
   ("man soll zurückkehren können"), ohne dass der Verlauf im Klartext auf der
   Platte liegt oder von einer anderen Sitzung gelesen werden kann.

   Was "verschlüsselt" hier konkret bedeutet — bewusst genau benannt, um
   nichts zu versprechen, was technisch nicht stimmt:

   1. ÜBERTRAGUNG: läuft über TLS (HTTPS), sobald der Reverse-Proxy
      (siehe Caddyfile) mit einer Domain betrieben wird. Das ist die einzige
      korrekte Stelle für Transportverschlüsselung — eine zusätzliche
      Verschlüsselung im Browser-JavaScript würde nichts zusätzlich schützen,
      weil der Schlüssel dafür ohnehin im selben JavaScript liegen müsste.
   2. SPEICHERUNG: der Nachrichtentext wird mit AES-256-GCM verschlüsselt auf
      der Platte abgelegt (Schlüssel aus SESSION_SECRET abgeleitet, nie im
      Klartext gespeichert). Wer nur eine Kopie der Datenbankdatei bekommt,
      kann die Inhalte NICHT lesen.
   3. ZUGRIFF: Der Sitzungs-Cookie ist HttpOnly (JavaScript/XSS kommt nicht
      heran) und signiert geprüft (Fälschen/Erraten der Sitzungs-ID bringt
      nichts ohne den passenden Geheim-Token).

   Was das NICHT ist: Ende-zu-Ende-Verschlüsselung im kryptografischen Sinn.
   Der Server muss die Nachrichten lesen können, um sie an die KI
   weiterzugeben und zu antworten — das schließt "nur Sender und Empfänger
   können lesen" per Definition aus. Diese Unterscheidung wird auch im
   Chat-UI so benannt (nicht "Ende-zu-Ende", sondern "verschlüsselt
   übertragen und gespeichert").
   ════════════════════════════════════════════════════════════════════════ */

export const CHAT_COOKIE = "sl_chat_session";
/**
 * Rollierendes Aufbewahrungsfenster: 7 Tage seit der letzten Nachricht.
 * Kurz gehalten aus Datenminimierung (DSGVO Art. 5 Abs. 1 lit. e) — ein
 * Support-Chat ist kein Vertragsdokument wie ein Ticket, das länger
 * nachvollziehbar bleiben muss. Jede neue Nachricht verlängert das Fenster,
 * ein abgebrochenes Gespräch löscht sich von selbst.
 */
export const CHAT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MESSAGES_PER_SESSION = 60;
const MAX_TEXT_LEN = 2000;
/** Kontext, den die KI pro Antwort sieht — begrenzt Kosten/Missbrauch bei sehr langen Verläufen. */
export const MAX_CONTEXT_MESSAGES = 16;

export interface EncBlob {
  iv: string;
  tag: string;
  data: string;
}
export interface AiChatMessage {
  from: "user" | "assistant";
  at: string;
  enc: EncBlob;
}
export interface AiChatSession {
  id: string;
  tokenHash: string;
  messages: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/* ─────────────────────────── Verschlüsselung ─────────────────────────── */

/**
 * Schlüssel deterministisch aus dem Server-Secret ableiten. Anders als beim
 * Backup-Export (dort: Nutzer-Passphrase + zufälliges Salt, weil das Salt
 * gegen Rainbow-Tables bei einem MENSCHLICHEN Passwort schützen muss) reicht
 * hier ein fester Kontext-String: das "Passwort" ist bereits ein
 * hochentropisches Server-Secret, kein von Menschen gewähltes Passwort.
 * Praktischer Vorteil: kein Salt muss pro Nachricht mitgespeichert werden.
 *
 * Konsequenz, offen benannt: Ändert sich SESSION_SECRET (Rotation, neue
 * Umgebung), werden ältere gespeicherte Chats unlesbar. Für einen Verlauf
 * mit 7 Tagen Lebensdauer ist das ein akzeptabler Kompromiss.
 */
function chatKey(): Buffer {
  return crypto.scryptSync(serverSecret(), "studio-lokal-ai-chat-v1", 32);
}

function encrypt(text: string): EncBlob {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", chatKey(), iv);
  const data = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return { iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), data: data.toString("base64") };
}

function decrypt(blob: EncBlob): string {
  const decipher = crypto.createDecipheriv("aes-256-gcm", chatKey(), Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.tag, "base64"));
  const out = Buffer.concat([decipher.update(Buffer.from(blob.data, "base64")), decipher.final()]);
  return out.toString("utf8");
}

/* ───────────────────────────── Speicherung ─────────────────────────────
   Bewusst NICHT in COLLECTIONS/Backups aufgenommen: Diese Daten sind
   ephemer, laufen automatisch ab und sind zusätzlich verschlüsselt — sie
   gehören nicht in ein Notfall-Backup. Das ist selbst eine
   Datenminimierungs-Entscheidung, nicht nur ein fehlendes Feature. */
const FILE = "ai-chat-sessions.json";
const readAll = (): AiChatSession[] => readJson<AiChatSession[]>(FILE, []);
const writeAll = (s: AiChatSession[]) => writeJson(FILE, s);

/** Abgelaufene Sitzungen entfernen — läuft beiläufig bei jedem Zugriff. */
function prune(sessions: AiChatSession[]): AiChatSession[] {
  const now = Date.now();
  return sessions.filter((s) => new Date(s.expiresAt).getTime() > now);
}

function newExpiry(): string {
  return new Date(Date.now() + CHAT_RETENTION_MS).toISOString();
}

/** Cookie-Wert `sessionId.secretToken` in seine Teile zerlegen. */
function parseCookie(value: string | undefined): { id: string; token: string } | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 1) return null;
  return { id: value.slice(0, dot), token: value.slice(dot + 1) };
}

/** Sitzung aus dem Cookie laden — verifiziert, dass der Token zur ID passt. */
export function loadSession(cookieValue: string | undefined): AiChatSession | null {
  const parsed = parseCookie(cookieValue);
  if (!parsed) return null;
  const sessions = prune(readAll());
  const session = sessions.find((s) => s.id === parsed.id);
  if (!session || !verifyToken(parsed.token, session.tokenHash)) return null;
  return session;
}

/** Entschlüsselter Verlauf, älteste zuerst — für Anzeige und KI-Kontext. */
export function decryptedHistory(session: AiChatSession): { from: "user" | "assistant"; text: string; at: string }[] {
  return session.messages.map((m) => ({ from: m.from, text: decrypt(m.enc), at: m.at }));
}

/**
 * Neue Sitzung anlegen. Gibt die Sitzung UND den Klartext-Token zurück — der
 * Token wird nur hier einmal im Klartext gebraucht, um den Cookie zu setzen;
 * gespeichert wird ausschließlich sein Hash.
 */
export function createSession(): { session: AiChatSession; token: string; cookieValue: string } {
  const token = makeToken();
  const now = new Date().toISOString();
  const session: AiChatSession = {
    id: crypto.randomBytes(12).toString("base64url"),
    tokenHash: hashToken(token),
    messages: [],
    createdAt: now,
    updatedAt: now,
    expiresAt: newExpiry(),
  };
  const sessions = prune(readAll());
  sessions.push(session);
  writeAll(sessions);
  return { session, token, cookieValue: `${session.id}.${token}` };
}

/** Nachricht anhängen (verschlüsselt), Ablauf verlängern, Verlauf kappen. */
export function appendMessage(sessionId: string, from: "user" | "assistant", text: string): void {
  const sessions = prune(readAll());
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;
  const now = new Date().toISOString();
  session.messages.push({ from, at: now, enc: encrypt(text.slice(0, MAX_TEXT_LEN)) });
  if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);
  }
  session.updatedAt = now;
  session.expiresAt = newExpiry(); // rollierendes Fenster: aktive Chats laufen nicht mitten im Gespräch ab
  writeAll(sessions);
}

/** Sitzung vollständig löschen — für den "Neuer Chat"-Knopf (Recht auf Löschung, selbstbedient). */
export function deleteSession(sessionId: string): void {
  writeAll(readAll().filter((s) => s.id !== sessionId));
}

export function chatCookieOptions(req: NextRequest) {
  return cookieOptions(req, Math.floor(CHAT_RETENTION_MS / 1000));
}
