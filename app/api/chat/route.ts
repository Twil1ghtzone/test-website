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

  // KI aus oder kein Endpunkt → Fallback (kein Fehler). API-Key ist OPTIONAL
  // (Ollama / LM Studio brauchen keinen Key).
  if (!ai.enabled || !ai.endpoint) {
    return NextResponse.json({ reply: ai.fallback, source: "fallback" });
  }
  if (!userText.trim()) {
    return NextResponse.json({ reply: ai.greeting, source: "fallback" });
  }

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 60000);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ai.apiKey) headers.Authorization = `Bearer ${ai.apiKey}`;
    const res = await fetch(ai.endpoint, {
      method: "POST",
      headers,
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
      const detail = (await res.text().catch(() => "")).slice(0, 200);
      return NextResponse.json({ reply: ai.fallback, source: "error", detail: `HTTP ${res.status} ${detail}` });
    }
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    return NextResponse.json({ reply: reply || ai.fallback, source: reply ? "ai" : "fallback" });
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Verbindung fehlgeschlagen";
    return NextResponse.json({ reply: ai.fallback, source: "error", detail });
  }
}

// Status für den Chat (zeigt ob KI aktiv ist) — verrät keinen Key.
export async function GET() {
  const { ai } = readSettings();
  return NextResponse.json({ enabled: ai.enabled && !!ai.endpoint, greeting: ai.greeting });
}
