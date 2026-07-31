import { NextRequest, NextResponse } from "next/server";
import { readSettings } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";
import { callAI, normalizeEndpoint } from "@/lib/server/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Echte Verbindungsabfrage: schickt eine reale Test-Nachricht an den (auch
// noch nicht gespeicherten) Endpunkt und meldet Ergebnis + Details zurück.
export async function POST(req: NextRequest) {
  if (!(await requirePermission("settings"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const cur = readSettings();
  const endpoint = (typeof body.endpoint === "string" ? body.endpoint : cur.ai.endpoint).trim();
  const model = (typeof body.model === "string" ? body.model : cur.ai.model).trim();
  const systemPrompt = typeof body.systemPrompt === "string" && body.systemPrompt ? body.systemPrompt : cur.ai.systemPrompt;
  // Neu getippten Key nehmen, sonst gespeicherten — Key-Knopf berücksichtigen.
  const storedKey = cur.ai.apiKeyEnabled ? cur.ai.apiKey : "";
  const apiKey = typeof body.apiKey === "string" && body.apiKey.length > 0 ? body.apiKey : storedKey;

  if (!endpoint) return NextResponse.json({ ok: false, detail: "Kein Endpunkt angegeben." }, { status: 200 });

  /*
   * Zeitlimit: genau das im Admin eingestellte („Zeitlimit (Sekunden)").
   *
   * Vorher stand hier `Math.max(60000, …)` — der Test wartete also immer
   * mindestens 60 s, selbst wenn jemand 10 s eingestellt hatte. Das war gut
   * gemeint (Reasoning-Modelle brauchen Zeit), hat aber die Einstellung
   * ausgehebelt: Der Test bestand mit Werten, unter denen der echte Chat
   * anschließend scheiterte — also genau die falsche Aussage.
   *
   * Jetzt misst der Test unter denselben Bedingungen wie der Betrieb. Ist das
   * Limit zu knapp, schlägt der Test fehl — und das ist die richtige, ehrliche
   * Rückmeldung. Der Boden von 5 s entspricht der Untergrenze des Feldes im
   * Admin und verhindert nur einen Wert von 0.
   */
  const eingestellt = typeof body.timeoutMs === "number" ? body.timeoutMs : cur.ai.timeoutMs;
  const timeoutMs = Math.max(5000, eingestellt);
  // Großzügiges Budget, damit ein Reasoning-Modell nach dem Nachdenken noch
  // Platz für die eigentliche Antwort hat.
  const maxTokens = Math.max(1200, cur.ai.maxTokens);

  const result = await callAI(
    { endpoint, apiKey, model, temperature: 0, maxTokens },
    [
      { role: "system", content: systemPrompt },
      // Bewusst eine echte, harmlose Frage statt „Antworte nur mit OK": eine
      // Formatier-Anweisung verleitet Reasoning-Modelle dazu, minutenlang über
      // die Anweisung selbst nachzudenken, statt einfach zu antworten.
      { role: "user", content: "Sag bitte in einem kurzen Satz Hallo." },
    ],
    timeoutMs
  );

  const gemeinsam = { status: result.status, ms: result.ms, endpoint: normalizeEndpoint(endpoint), model };

  if (!result.ok) {
    // Sonderfall: Der Server ANTWORTET, das Modell hat aber sein ganzes Budget
    // ins Nachdenken gesteckt. Die Verbindung steht damit — nur das Modell
    // passt nicht zur Einstellung. Das ist ein Hinweis, kein Verbindungsfehler.
    if (result.reasoningOnly) {
      return NextResponse.json({
        ...gemeinsam,
        ok: true,
        warnung:
          `Verbindung und Modell antworten — aber „${model}“ ist ein Reasoning-Modell und hat ` +
          `sein Token-Budget (${result.usedMaxTokens ?? maxTokens}) komplett fürs Nachdenken verbraucht. ` +
          "Für den Kundenchat bitte „Max. Tokens“ höher setzen oder ein Modell ohne Reasoning wählen.",
      });
    }
    return NextResponse.json({ ...gemeinsam, ok: false, detail: result.detail });
  }

  return NextResponse.json({ ...gemeinsam, ok: true, reply: result.reply.slice(0, 160) });
}
