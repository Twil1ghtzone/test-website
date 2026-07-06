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
  // Neu getippten Key nehmen, sonst gespeicherten.
  const apiKey = typeof body.apiKey === "string" && body.apiKey.length > 0 ? body.apiKey : cur.ai.apiKey;

  if (!endpoint) return NextResponse.json({ ok: false, detail: "Kein Endpunkt angegeben." }, { status: 200 });

  const result = await callAI(
    { endpoint, apiKey, model, temperature: 0, maxTokens: 32 },
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: "Antworte nur mit dem Wort: OK" },
    ],
    20000
  );

  if (!result.ok) return NextResponse.json({ ok: false, status: result.status, ms: result.ms, detail: result.detail, endpoint: normalizeEndpoint(endpoint) });
  return NextResponse.json({ ok: true, status: result.status, ms: result.ms, model, reply: result.reply.slice(0, 120), endpoint: normalizeEndpoint(endpoint) });
}
