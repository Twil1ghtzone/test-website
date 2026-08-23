import { NextResponse } from "next/server";
import fs from "fs";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Lebenszeichen für Docker, Reverse-Proxies und Uptime-Überwachung.
 *
 * Warum es das braucht: Ohne Healthcheck meldet `docker compose ps` den
 * Container als "läuft", auch wenn der Node-Prozess innerlich klemmt (volle
 * Platte, Deadlock, hängender Dateizugriff) und längst keine Anfrage mehr
 * beantwortet. Ein Neustart passiert dann nie automatisch — der Ausfall
 * fällt erst auf, wenn jemand die Seite besucht.
 *
 * Geprüft wird bewusst mehr als "der Server antwortet": Der Datenordner muss
 * les- und beschreibbar sein. Genau das ist der Fehlerfall, der die Seite
 * praktisch tot macht, während HTTP noch fröhlich 200 liefert — die
 * JSON-Datenbank ist die einzige Schreibquelle des ganzen Systems.
 *
 * ÖFFENTLICH OHNE AUTHENTIFIZIERUNG, deshalb strikt sparsam: keine Version,
 * keine Pfade, keine Fehlermeldungen des Dateisystems, keine Zählwerte. Ein
 * Angreifer erfährt hier nichts, was er nicht ohnehin sieht. Der Grund für
 * "öffentlich": Docker führt den Healthcheck ohne Sitzung aus.
 */
export async function GET() {
  let datenspeicherOk = false;
  try {
    // R_OK | W_OK: Lesen allein genügt nicht — ein Nur-Lese-Dateisystem
    // (etwa nach einem vollgelaufenen Volume) ist bereits ein Ausfall.
    fs.accessSync(env.dataDir, fs.constants.R_OK | fs.constants.W_OK);
    datenspeicherOk = true;
  } catch {
    datenspeicherOk = false;
  }

  return NextResponse.json(
    { status: datenspeicherOk ? "ok" : "degraded" },
    {
      status: datenspeicherOk ? 200 : 503,
      // Niemals zwischenspeichern — ein gecachtes "ok" würde einen laufenden
      // Ausfall verdecken, also genau das Gegenteil des Zwecks bewirken.
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
