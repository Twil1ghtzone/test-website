import { NextRequest, NextResponse } from "next/server";
import { readSettings } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; text: string };

export async function POST(req: NextRequest) {
  const { ai } = readSettings();
  const body = await req.json().catch(() => null);
  const messages: Msg[] = Array.isArray(body?.messages) ? body.messages.slice(-20) : [];
  const userText = messages.filter((m) => m.role === "user").slice(-1)[0]?.text || "";

  // KI aus oder nicht konfiguriert → Fallback (kein Fehler).
  if (!ai.enabled || !ai.endpoint || !ai.apiKey) {
    return NextResponse.json({ reply: ai.fallback, source: "fallback" });
  }
  if (!userText.trim()) {
    return NextResponse.json({ reply: ai.greeting, source: "fallback" });
  }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 25000);
    const res = await fetch(ai.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ai.apiKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: ai.model,
        temperature: ai.temperature,
        max_tokens: ai.maxTokens,
        messages: [
          { role: "system", content: ai.systemPrompt },
          ...messages.map((m) => ({ role: m.role === "user" ? "user" : "assistant", content: m.text })),
        ],
      }),
    });
    clearTimeout(t);
    if (!res.ok) {
      return NextResponse.json({ reply: ai.fallback, source: "error" });
    }
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ reply: reply || ai.fallback, source: reply ? "ai" : "fallback" });
  } catch {
    return NextResponse.json({ reply: ai.fallback, source: "error" });
  }
}

// Status für den Chat (zeigt ob KI aktiv ist) — verrät keinen Key.
export async function GET() {
  const { ai } = readSettings();
  return NextResponse.json({ enabled: ai.enabled && !!ai.apiKey && !!ai.endpoint, greeting: ai.greeting });
}
