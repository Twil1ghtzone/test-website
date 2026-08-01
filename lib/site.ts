/*
 * Öffentliche Basis-Adresse der Website.
 *
 * Wird gebraucht für Sitemap, robots.txt und die Open-Graph-Vorschaubilder —
 * dort MÜSSEN absolute URLs stehen, relative Pfade funktionieren beim Teilen
 * in WhatsApp, LinkedIn oder Slack nicht.
 *
 * Wird über SITE_URL gesetzt (in docker-compose.yml eintragen, sobald die
 * echte Domain feststeht). Ohne Angabe bleibt localhost — dann funktioniert
 * alles lokal, die Vorschau beim Teilen aber erst nach dem Setzen der Variable.
 */
const FALLBACK = "http://localhost:3000";

export function siteUrl(): string {
  const roh = (process.env.SITE_URL || FALLBACK).trim();
  // Ohne Schema ergänzen (häufiger Konfigurationsfehler: "example.de"),
  // abschließenden Schrägstrich entfernen — sonst entstehen doppelte "//".
  const mitSchema = /^https?:\/\//i.test(roh) ? roh : `https://${roh}`;
  return mitSchema.replace(/\/+$/, "");
}
