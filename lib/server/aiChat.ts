import crypto from "crypto";
import type { NextRequest } from "next/server";
import { readJson, writeJson } from "./store.ts";
import { makeToken, hashToken, verifyToken, cookieOptions } from "./security.ts";
import {
  createSessionKeys, sessionCek, rewrapPrivate, encryptMessage, decryptMessage,
  rotateMaster, masterStatus, legacyDecrypt,
  type EncBlob, type SessionKeys,
} from "./chatKeys.ts";

/* ════════════════════════════════════════════════════════════════════════
   ÖFFENTLICHER KI-CHAT — SITZUNG, VERSCHLÜSSELUNG, AUFBEWAHRUNG

   Ein Besucher kann den Chat verlassen und später zurückkommen, ohne dass der
   Verlauf im Klartext auf der Platte liegt oder von einer anderen Sitzung
   gelesen werden kann.

   Was "verschlüsselt" hier konkret bedeutet — bewusst genau benannt:

   1. ÜBERTRAGUNG: TLS (HTTPS) über den Caddy-Proxy. Der einzige richtige Ort
      für Transportverschlüsselung. Eine zusätzliche Verschlüsselung im
      Browser-JavaScript würde nichts schützen, weil ihr Schlüssel im selben
      JavaScript liegen müsste.
   2. SPEICHERUNG: Hüllenverschlüsselung RSA-2048 + AES-256-GCM, siehe
      chatKeys.ts für die vollständige Schlüsselkette. Wer nur eine Kopie der
      Datenbankdatei bekommt, kann die Inhalte NICHT lesen.
   3. ZUGRIFF: Sitzungs-Cookie ist HttpOnly (XSS kommt nicht heran) und wird
      gegen einen HMAC geprüft.

   Was es NICHT ist: Ende-zu-Ende-Verschlüsselung. Der Server MUSS die
   Nachrichten lesen können, um sie der KI vorzulegen und zu antworten — das
   schließt "nur Sender und Empfänger können lesen" per Definition aus.
   Nachgewiesen: Die KI erhält den vollständig entschlüsselten Verlauf
   (siehe decryptedHistory, aufgerufen in app/api/chat/route.ts).
   ════════════════════════════════════════════════════════════════════════ */

export const CHAT_COOKIE = "sl_chat_session";
/**
 * Rollierendes Aufbewahrungsfenster: 7 Tage seit der letzten Nachricht.
 * Kurz gehalten aus Datenminimierung (DSGVO Art. 5 Abs. 1 lit. e) — ein
 * Support-Chat ist kein Vertragsdokument wie ein Ticket. Jede neue Nachricht
 * verlängert das Fenster, ein abgebrochenes Gespräch löscht sich von selbst.
 */
export const CHAT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_MESSAGES_PER_SESSION = 60;
const MAX_TEXT_LEN = 2000;
/** Kontext, den die KI pro Antwort sieht — begrenzt Kosten bei langen Verläufen. */
export const MAX_CONTEXT_MESSAGES = 16;

export interface AiChatMessage {
  from: "user" | "assistant";
  at: string;
  enc: EncBlob;
}
export interface AiChatSession {
  id: string;
  tokenHash: string;
  /**
   * Schlüsselmaterial der Sitzung. Optional, weil Sitzungen aus der ersten
   * Fassung (ohne RSA-Hülle) weiterhin gelesen werden können.
   */
  keys?: SessionKeys;
  messages: AiChatMessage[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

/* ───────────────────────────── Speicherung ─────────────────────────────
   Bewusst NICHT in COLLECTIONS/Backups aufgenommen: Diese Daten sind
   ephemer, laufen automatisch ab und sind verschlüsselt — sie gehören nicht
   in ein Notfall-Backup. Das ist selbst eine Datenminimierungs-Entscheidung. */
const FILE = "ai-chat-sessions.json";
const readAll = (): AiChatSession[] => readJson<AiChatSession[]>(FILE, []);
const writeAll = (s: AiChatSession[]) => writeJson(FILE, s);

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
  const session = prune(readAll()).find((s) => s.id === parsed.id);
  if (!session || !verifyToken(parsed.token, session.tokenHash)) return null;
  return session;
}

/**
 * Entschlüsselter Verlauf, älteste zuerst — Grundlage für Anzeige UND für den
 * KI-Kontext. Der Inhalts-Schlüssel wird EINMAL ausgepackt (zwei RSA-/AES-
 * Schritte) und dann für alle Nachrichten der Sitzung verwendet; pro Nachricht
 * erneut RSA zu rechnen wäre unnötig langsam.
 *
 * Eine Nachricht, die sich nicht entschlüsseln lässt (etwa nach einem Wechsel
 * von SESSION_SECRET), wird übersprungen statt die ganze Anfrage abzubrechen —
 * ein unlesbarer Rest darf den Chat nicht unbenutzbar machen.
 */
export function decryptedHistory(session: AiChatSession): { from: "user" | "assistant"; text: string; at: string }[] {
  const cek = session.keys ? safeCek(session.keys) : null;
  const out: { from: "user" | "assistant"; text: string; at: string }[] = [];
  for (const m of session.messages) {
    try {
      const text = cek ? decryptMessage(cek, m.enc) : legacyDecrypt(m.enc);
      out.push({ from: m.from, text, at: m.at });
    } catch {
      // Unlesbar → auslassen (siehe Kommentar oben).
    }
  }
  return out;
}

function safeCek(keys: SessionKeys): Buffer | null {
  try {
    return sessionCek(keys);
  } catch {
    return null;
  }
}

/**
 * Neue Sitzung anlegen — inklusive frischem RSA-Schlüsselpaar. Gibt den
 * Klartext-Token zurück (nur hier einmal nötig, um den Cookie zu setzen);
 * gespeichert wird ausschließlich sein Hash.
 */
export function createSession(): { session: AiChatSession; token: string; cookieValue: string } {
  const token = makeToken();
  const now = new Date().toISOString();
  const session: AiChatSession = {
    id: crypto.randomBytes(12).toString("base64url"),
    tokenHash: hashToken(token),
    keys: createSessionKeys(),
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

  // Sitzungen aus der ersten Fassung haben kein Schlüsselpaar — beim ersten
  // Schreiben eines bekommen, damit alles Neue im neuen Format landet.
  if (!session.keys) session.keys = createSessionKeys();

  let cek = safeCek(session.keys);
  if (!cek) {
    // Schlüssel unbrauchbar (typischer Fall: SESSION_SECRET wurde gewechselt,
    // der Master ist neu). Frisches Schlüsselpaar geben, damit das Gespräch
    // weitergehen kann. Die alten Nachrichten sind endgültig unlesbar und
    // werden entfernt — sie zu behalten würde nur Platz belegen und die
    // Zählungen im Admin verfälschen.
    session.keys = createSessionKeys();
    session.messages = [];
    cek = safeCek(session.keys);
    if (!cek) return; // Sollte nie passieren; dann lieber nichts schreiben als Müll.
  }

  const now = new Date().toISOString();
  session.messages.push({ from, at: now, enc: encryptMessage(cek, text.slice(0, MAX_TEXT_LEN)) });
  if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
    session.messages = session.messages.slice(-MAX_MESSAGES_PER_SESSION);
  }
  session.updatedAt = now;
  session.expiresAt = newExpiry(); // rollierend: aktive Chats laufen nicht mitten im Gespräch ab
  writeAll(sessions);
}

/**
 * Sitzung vollständig löschen — für den "Neuer Chat"-Knopf.
 * Das ist gleichzeitig Krypto-Schreddern: mit dem privaten Schlüssel
 * verschwindet die einzige Möglichkeit, diese Nachrichten je zu lesen.
 */
export function deleteSession(sessionId: string): void {
  writeAll(readAll().filter((s) => s.id !== sessionId));
}

export function chatCookieOptions(req: NextRequest) {
  return cookieOptions(req, Math.floor(CHAT_RETENTION_MS / 1000));
}

/* ─────────────────────── Master-Rotation (Admin) ─────────────────────── */

export { masterStatus };

/**
 * Master-Schlüssel neu erzeugen. Alle privaten Sitzungsschlüssel werden mit
 * dem neuen Master neu eingehüllt — laufende Gespräche bleiben also lesbar.
 * Genau hierfür ist die RSA-Zwischenschicht da: Es werden nur die kurzen
 * Schlüssel angefasst, nicht jede einzelne Nachricht.
 */
export function rotateChatMaster(): { id: string; rotations: number; sessions: number; skipped: number } {
  let sessions = 0;
  let skipped = 0;

  const result = rotateMaster((alt, neu) => {
    const all = prune(readAll());
    const neuId = "pending";
    for (const s of all) {
      if (!s.keys) continue;
      try {
        s.keys = rewrapPrivate(s.keys, alt, neu, neuId);
        sessions++;
      } catch {
        // Lässt sich nicht auspacken (z. B. mit anderem Master eingehüllt) →
        // Sitzung unangetastet lassen. Sie wird beim Ablauf ohnehin entfernt.
        skipped++;
      }
    }
    writeAll(all);
  });

  // Die endgültige Master-Kennung steht erst nach rotateMaster fest.
  const all = readAll();
  for (const s of all) {
    if (s.keys?.masterId === "pending") s.keys.masterId = result.id;
  }
  writeAll(all);

  return { ...result, sessions, skipped };
}

/** Alle Chats löschen — Notbremse im Admin (Krypto-Schreddern für alles). */
export function deleteAllSessions(): number {
  const n = readAll().length;
  writeAll([]);
  return n;
}

/** Kennzahlen für die Admin-Anzeige — nie Inhalte, nie Schlüsselmaterial. */
export function chatStats(): { sessions: number; messages: number; oldest: string | null } {
  const all = prune(readAll());
  return {
    sessions: all.length,
    messages: all.reduce((n, s) => n + s.messages.length, 0),
    oldest: all.length ? all.reduce((a, s) => (s.createdAt < a ? s.createdAt : a), all[0].createdAt) : null,
  };
}
