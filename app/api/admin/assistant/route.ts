import { NextRequest, NextResponse } from "next/server";
import { readSettings } from "@/lib/server/store";
import { getCurrentUser } from "@/lib/server/auth";
import { callAI } from "@/lib/server/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Interner KI-Assistent für das Admin-Team (wie novum) — nutzt dieselbe
// KI-Konfiguration, aber einen Arbeits-Systemprompt statt des Kunden-Prompts.
const ASSISTANT_PROMPT =
  "Du bist der interne KI-Assistent des Admin-Teams von STUDIO//LOKAL (Elektrohandwerk + lokale IT). " +
  "Hilf beim Formulieren von Texten (Blog, Angebote, E-Mails), beim Beantworten technischer Fragen " +
  "(Smart Home, Netzwerk, Server, 3D-Druck) und bei organisatorischen Aufgaben. Antworte präzise auf Deutsch.";

type Msg = { role: "user" | "assistant"; text: string };

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { ai: aiRaw } = readSettings();
  const ai = { ...aiRaw, apiKey: aiRaw.apiKeyEnabled ? aiRaw.apiKey : "" };
  if (!ai.enabled || !ai.endpoint || (ai.requireApiKey && !ai.apiKey)) {
    return NextResponse.json({ error: "KI ist nicht konfiguriert/aktiv — unter KI & Einstellungen einrichten." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const messages: Msg[] = Array.isArray(body?.messages) ? body.messages.slice(-30) : [];
  if (messages.length === 0) return NextResponse.json({ error: "Keine Nachricht." }, { status: 400 });

  const result = await callAI(ai, [
    { role: "system", content: ASSISTANT_PROMPT },
    ...messages.map((m) => ({ role: m.role === "user" ? ("user" as const) : ("assistant" as const), content: m.text })),
  ]);

  if (!result.ok) return NextResponse.json({ error: result.detail }, { status: 502 });
  return NextResponse.json({ reply: result.reply, model: ai.model, ms: result.ms });
}

// Health-Check für die Statusanzeige im Panel.
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const { ai } = readSettings();
  const effectiveKey = ai.apiKeyEnabled ? ai.apiKey : "";
  return NextResponse.json({
    configured: ai.enabled && !!ai.endpoint && !(ai.requireApiKey && !effectiveKey),
    model: ai.model,
    // Damit sich das Panel an dasselbe Zeitlimit hält wie der Server.
    timeoutMs: ai.timeoutMs,
  });
}
