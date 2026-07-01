import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings, type Settings } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liefert Einstellungen — API-Key wird NICHT zurückgegeben (nur ob gesetzt).
export async function GET() {
  if (!(await requirePermission("settings"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const s = readSettings();
  const { apiKey, ...aiSafe } = s.ai;
  return NextResponse.json({ settings: { ...s, ai: { ...aiSafe, apiKeySet: !!apiKey } } });
}

export async function POST(req: NextRequest) {
  if (!(await requirePermission("settings"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const cur = readSettings();
  const ai = body.ai || {};
  const next: Settings = {
    siteName: typeof body.siteName === "string" ? body.siteName : cur.siteName,
    ai: {
      enabled: typeof ai.enabled === "boolean" ? ai.enabled : cur.ai.enabled,
      endpoint: typeof ai.endpoint === "string" ? ai.endpoint.trim() : cur.ai.endpoint,
      // Key nur überschreiben, wenn ein neuer (nicht leerer) gesendet wird.
      apiKey: typeof ai.apiKey === "string" && ai.apiKey.length > 0 ? ai.apiKey : cur.ai.apiKey,
      model: typeof ai.model === "string" ? ai.model.trim() : cur.ai.model,
      systemPrompt: typeof ai.systemPrompt === "string" ? ai.systemPrompt : cur.ai.systemPrompt,
      temperature: typeof ai.temperature === "number" ? Math.max(0, Math.min(2, ai.temperature)) : cur.ai.temperature,
      maxTokens: typeof ai.maxTokens === "number" ? Math.max(50, Math.min(4000, Math.round(ai.maxTokens))) : cur.ai.maxTokens,
      greeting: typeof ai.greeting === "string" ? ai.greeting : cur.ai.greeting,
      fallback: typeof ai.fallback === "string" ? ai.fallback : cur.ai.fallback,
    },
  };
  writeSettings(next);
  return NextResponse.json({ ok: true });
}
