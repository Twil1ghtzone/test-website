import { NextRequest, NextResponse } from "next/server";
import { readSettings } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";

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
  // Neu getippten Key nehmen, sonst gespeicherten.
  const apiKey = typeof body.apiKey === "string" && body.apiKey.length > 0 ? body.apiKey : cur.ai.apiKey;

  if (!endpoint) return NextResponse.json({ ok: false, detail: "Kein Endpunkt angegeben." }, { status: 200 });

  const started = Date.now();
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 20000);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        max_tokens: 32,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Antworte nur mit dem Wort: OK" },
        ],
      }),
    });
    clearTimeout(t);
    const ms = Date.now() - started;

    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return NextResponse.json({ ok: false, status: res.status, ms, detail: `HTTP ${res.status} — ${detail || "keine Antwort"}` });
    }
    const data = await res.json().catch(() => null);
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ ok: false, status: res.status, ms, detail: "Antwort ohne verwertbaren Inhalt (choices[0].message.content leer)." });
    }
    return NextResponse.json({ ok: true, status: res.status, ms, model, reply: reply.slice(0, 120) });
  } catch (e) {
    let detail = "Verbindung fehlgeschlagen";
    if (e instanceof Error) {
      if (e.name === "AbortError") {
        detail = "Zeitüberschreitung (20 s) — läuft der Server?";
      } else {
        // Node/undici versteckt den Grund in `cause` (z. B. ECONNREFUSED).
        const cause = (e as { cause?: { code?: string; message?: string } }).cause;
        const code = cause?.code;
        detail = code === "ECONNREFUSED"
          ? "Verbindung abgelehnt — kein Server unter dieser Adresse/Port erreichbar. Läuft Ollama/LM Studio? Im Docker host.docker.internal statt localhost nutzen."
          : `${e.message}${code ? ` (${code})` : ""}`;
      }
    }
    return NextResponse.json({ ok: false, detail });
  }
}
