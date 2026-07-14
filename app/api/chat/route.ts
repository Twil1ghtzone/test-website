import { NextRequest, NextResponse } from "next/server";
import { readSettings } from "@/lib/server/store";
import { callAI } from "@/lib/server/ai";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; text: string };

export async function POST(req: NextRequest) {
  // Öffentlicher Endpunkt → Missbrauchs-Bremse (LLM-Kosten/-Last).
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rl = rateLimit(`chat:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { reply: "Einen Moment bitte — zu viele Anfragen hintereinander.", source: "ratelimit" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const { ai: aiRaw } = readSettings();
  // Key-Knopf: deaktiviert = Key nicht mitsenden (bleibt aber gespeichert).
  const ai = { ...aiRaw, apiKey: aiRaw.apiKeyEnabled ? aiRaw.apiKey : "" };
  const body = await req.json().catch(() => null);
  const messages: Msg[] = Array.isArray(body?.messages) ? body.messages.slice(-20) : [];
  const userText = messages.filter((m) => m.role === "user").slice(-1)[0]?.text || "";

  // KI aus oder kein Endpunkt → Fallback (kein Fehler). API-Key ist optional
  // (Ollama / LM Studio) — außer die Key-Pflicht ist in den Einstellungen aktiv.
  if (!ai.enabled || !ai.endpoint || (ai.requireApiKey && !ai.apiKey)) {
    return NextResponse.json({ reply: ai.fallback, source: "fallback" });
  }
  if (!userText.trim()) {
    return NextResponse.json({ reply: ai.greeting, source: "fallback" });
  }

  const result = await callAI(ai, [
    { role: "system", content: ai.systemPrompt },
    ...messages.map((m) => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), content: m.text })),
  ]);

  if (!result.ok) {
    return NextResponse.json({ reply: ai.fallback, source: "error", detail: result.detail });
  }
  return NextResponse.json({ reply: result.reply, source: "ai" });
}

// Status für den Chat (zeigt ob KI aktiv ist) — verrät keinen Key.
export async function GET() {
  const { ai } = readSettings();
  const effectiveKey = ai.apiKeyEnabled ? ai.apiKey : "";
  return NextResponse.json({ enabled: ai.enabled && !!ai.endpoint && !(ai.requireApiKey && !effectiveKey), greeting: ai.greeting });
}
