import crypto from "crypto";
import type { SupportTicket } from "./store";

// Prozess-/Env-Secret (wie bei Session & Review-Siegel).
const runtimeSecret = crypto.randomBytes(32).toString("hex");
function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  return process.env.NODE_ENV === "production" ? runtimeSecret : "studio-lokal-dev-secret-bitte-aendern";
}

// Fortlaufende Ticketnummer im Format TS-JJJJ-NNN.
export function nextTicketNumber(tickets: SupportTicket[]): string {
  const year = new Date().getFullYear();
  const prefix = `TS-${year}-`;
  const max = tickets
    .filter((t) => t.number.startsWith(prefix))
    .reduce((m, t) => Math.max(m, parseInt(t.number.slice(prefix.length), 10) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

// Geheimes Zugriffs-Token: der Kunde bekommt es EINMAL (im Cookie), gespeichert
// wird nur der HMAC. Ohne Token kein Zugriff — die Ticketnummer allein reicht nicht.
export function makeToken(): string {
  return crypto.randomBytes(18).toString("base64url");
}
export function hashToken(token: string): string {
  return crypto.createHmac("sha256", secret()).update(token).digest("hex");
}
export function verifyToken(token: string, hash: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(hashToken(token), "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function hashIp(ip: string): string {
  return crypto.createHmac("sha256", secret()).update(`ip:${ip}`).digest("hex").slice(0, 32);
}
