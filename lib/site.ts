import { env } from "./server/env.ts";

/*
 * Öffentliche Basis-Adresse der Website.
 *
 * Wird gebraucht für Sitemap, robots.txt und die Open-Graph-Vorschaubilder —
 * dort MÜSSEN absolute URLs stehen, relative Pfade funktionieren beim Teilen
 * in WhatsApp, LinkedIn oder Slack nicht.
 *
 * Die eigentliche Auswertung von SITE_URL (inklusive Ergänzen eines fehlenden
 * Schemas und Entfernen des abschließenden Schrägstrichs) liegt seit der
 * Zentralisierung in lib/server/env.ts — dort wird auch gewarnt, wenn in
 * Produktion noch localhost eingetragen ist. Diese Funktion bleibt als
 * benannter Zugang bestehen, damit die drei Aufrufer (layout, sitemap,
 * robots) unverändert weiterlaufen.
 *
 * Nur serverseitig verwendbar: env.ts liest `process.env` und nutzt `path`.
 */
export function siteUrl(): string {
  return env.siteUrl;
}
