import crypto from "crypto";
import type { NextRequest } from "next/server";
import { serverSecret } from "./secret.ts";

/* ════════════════════════════════════════════════════════════════════════
   WIEDERVERWENDBARE SICHERHEITS-BAUSTEINE

   Vorher lagen sign()/cookieOptionen()/istHttps()/herkunftOk() nur in
   support.ts. Der neue verschlüsselte KI-Chat braucht exakt dieselben
   Bausteine (signierte, HttpOnly-Cookies + CSRF-Schutz) — deshalb liegen sie
   jetzt hier, und support.ts importiert sie zurück statt sie zu duplizieren.
   ════════════════════════════════════════════════════════════════════════ */

export function sign(data: string): string {
  return crypto.createHmac("sha256", serverSecret()).update(data).digest("base64url");
}

/** Zufälliges Geheimnis für Zugriffscodes/Tokens: base64url, Länge frei wählbar. */
export function makeToken(bytes = 24): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
export function hashToken(token: string): string {
  return crypto.createHmac("sha256", serverSecret()).update(token).digest("hex");
}
export function verifyToken(token: string, hash: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(hashToken(token), "hex"), Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

export function istHttps(req: NextRequest): boolean {
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Cookie-Optionen mit maximalen Schutzflags.
 *
 * `secure` wird nur gesetzt, wenn die Anfrage wirklich über HTTPS kam — sonst
 * würde der Browser den Cookie auf einer HTTP-Installation (lokal, Docker
 * ohne vorgeschalteten TLS-Proxy) stillschweigend verwerfen und die Funktion
 * wäre komplett tot.
 *
 * `sameSite: "strict"` blockt CSRF vollständig, kostet aber: ein Link aus
 * einer E-Mail (z. B. ein Magic-Link) schickt den Cookie beim ersten Klick
 * noch nicht mit. Wo das relevant ist, wird es am Aufrufort dokumentiert.
 */
export function cookieOptions(req: NextRequest, maxAge: number) {
  return {
    httpOnly: true,
    secure: istHttps(req),
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}

/**
 * Herkunftsprüfung als zweite CSRF-Verteidigungslinie — greift auch dann,
 * wenn ein Browser SameSite nicht durchsetzt (ältere Browser, manche Apps).
 * Fehlt jeder Header (z. B. ein reiner API-Client ohne Cookie), wird nicht
 * blockiert: ohne gültigen Cookie kommt so eine Anfrage ohnehin nicht weit.
 */
export function originOk(req: NextRequest): boolean {
  const host = req.headers.get("host");
  if (!host) return false;
  const source = req.headers.get("origin") || req.headers.get("referer");
  if (!source) return true;
  try {
    return new URL(source).host === host;
  } catch {
    return false;
  }
}
