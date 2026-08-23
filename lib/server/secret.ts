import crypto from "crypto";
import { env } from "./env.ts";

/* ════════════════════════════════════════════════════════════════════════
   ZENTRALES SERVER-GEHEIMNIS

   Vorher lag dieselbe Logik dreimal fast wortgleich in auth.ts, support.ts
   und reviews.ts — jede Kopie ein eigenes Risiko, falls beim nächsten Fix nur
   eine Stelle geändert wird. Jetzt gibt es genau eine Quelle, die alle
   HMAC-Signaturen im Haus benutzen: Admin-Sessions, Ticket-Zugriffscodes,
   Bewertungssiegel und die Chat-Verschlüsselung.

   Verhalten:
   - SESSION_SECRET gesetzt → wird verwendet (Pflicht in Produktion).
   - Produktion ohne SESSION_SECRET → zufälliges Prozess-Secret. Signaturen
     sind dadurch NICHT fälschbar, überleben aber keinen Neustart/Container-
     Restart (alle Sessions/Cookies verlieren dann ihre Gültigkeit — besser
     als ein öffentlich bekanntes Fallback-Geheimnis im Quellcode).
   - Entwicklung ohne SESSION_SECRET → fester, klar erkennbarer Platzhalter.
     Dieser Zweig darf NIE in Produktion greifen.
   ════════════════════════════════════════════════════════════════════════ */

const runtimeSecret = crypto.randomBytes(32).toString("hex");
let warned = false;

export function serverSecret(): string {
  if (env.sessionSecret) return env.sessionSecret;
  if (env.isProduction) {
    if (!warned) {
      console.warn(
        "[Sicherheit] SESSION_SECRET ist nicht gesetzt — es wird ein zufälliges Prozess-Secret verwendet. " +
        "Sessions/Cookies enden bei jedem Neustart. Bitte SESSION_SECRET in der Umgebung setzen."
      );
      warned = true;
    }
    return runtimeSecret;
  }
  return "studio-lokal-dev-secret-bitte-aendern";
}
