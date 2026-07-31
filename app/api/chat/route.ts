import { NextRequest, NextResponse } from "next/server";
import { readSettings } from "@/lib/server/store.ts";
import { callAI } from "@/lib/server/ai.ts";
import { rateLimit } from "@/lib/server/ratelimit.ts";
import { originOk } from "@/lib/server/security.ts";
import {
  CHAT_COOKIE, MAX_CONTEXT_MESSAGES,
  loadSession, createSession, appendMessage, deleteSession, decryptedHistory, chatCookieOptions,
} from "@/lib/server/aiChat.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TEXT_LEN = 2000;

function clientIp(req: NextRequest): string {
  return (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
}

/**
 * Status + Verlauf. Läuft NUR über den HttpOnly-Cookie — der Klartext-Zugriffs-
 * Token liegt nie in JavaScript, ein Besucher bekommt seinen Chat also automatisch
 * zurück, wenn er die Seite neu lädt oder später wiederkommt (innerhalb des
 * 7-Tage-Fensters), ohne dass irgendetwas dafür im Frontend gespeichert wird.
 */
export async function GET(req: NextRequest) {
  const { ai } = readSettings();
  const effectiveKey = ai.apiKeyEnabled ? ai.apiKey : "";
  const enabled = ai.enabled && !!ai.endpoint && !(ai.requireApiKey && !effectiveKey);

  const session = loadSession(req.cookies.get(CHAT_COOKIE)?.value);
  const messages = session ? decryptedHistory(session).map((m) => ({ from: m.from, text: m.text })) : [];

  return NextResponse.json({ enabled, greeting: ai.greeting, messages, hasSession: !!session });
}

export async function POST(req: NextRequest) {
  if (!originOk(req)) return NextResponse.json({ error: "Ungültige Herkunft." }, { status: 403 });

  // Öffentlicher Endpunkt → Missbrauchs-Bremse (LLM-Kosten/-Last).
  const ip = clientIp(req);
  const rl = rateLimit(`chat:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { reply: "Einen Moment bitte — zu viele Anfragen hintereinander.", source: "ratelimit" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const body = await req.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT_LEN) : "";
  if (!text) return NextResponse.json({ error: "Leere Nachricht." }, { status: 400 });

  // Vorhandene Sitzung übernehmen oder neu anlegen — der Server ist die
  // einzige Quelle für den bisherigen Verlauf. Der Client schickt nur die
  // NEUE Nachricht, nie die ganze Historie: so kann niemand über die
  // Browser-Konsole erfundene "assistant"-Nachrichten in den Kontext
  // einschleusen, um das System-Prompt zu umgehen.
  const incomingCookie = req.cookies.get(CHAT_COOKIE)?.value;
  let session = loadSession(incomingCookie);
  // Cookie-Wert, der am Ende der Antwort (neu, mit verlängertem Ablauf)
  // gesetzt wird — bei einer bestehenden Sitzung bleibt der Inhalt gleich,
  // bei einer neuen kommt der frisch erzeugte Wert zum Einsatz.
  let cookieValue = incomingCookie ?? "";
  if (!session) {
    const created = createSession();
    session = created.session;
    cookieValue = created.cookieValue;
  }

  const vorherigerVerlauf = decryptedHistory(session).slice(-MAX_CONTEXT_MESSAGES);
  appendMessage(session.id, "user", text);

  const { ai: aiRaw } = readSettings();
  const ai = { ...aiRaw, apiKey: aiRaw.apiKeyEnabled ? aiRaw.apiKey : "" };

  let reply: string;
  let source: "ai" | "fallback" | "error";

  if (!ai.enabled || !ai.endpoint || (ai.requireApiKey && !ai.apiKey)) {
    reply = ai.fallback;
    source = "fallback";
  } else {
    const result = await callAI(ai, [
      { role: "system", content: ai.systemPrompt },
      ...vorherigerVerlauf.map((m) => ({ role: m.from === "user" ? ("user" as const) : ("assistant" as const), content: m.text })),
      { role: "user", content: text },
    ]);
    if (result.ok) {
      reply = result.reply;
      source = "ai";
    } else {
      reply = ai.fallback;
      source = "error";
    }
  }

  appendMessage(session.id, "assistant", reply);

  const res = NextResponse.json({ reply, source });
  // Cookie bei jeder Nachricht (neu) setzen — verlängert das rollierende
  // Aufbewahrungsfenster, solange das Gespräch aktiv ist.
  res.cookies.set(CHAT_COOKIE, cookieValue, chatCookieOptions(req));
  return res;
}

/** "Neuer Chat": löscht den Verlauf serverseitig vollständig (Recht auf Löschung, selbstbedient). */
export async function DELETE(req: NextRequest) {
  if (!originOk(req)) return NextResponse.json({ error: "Ungültige Herkunft." }, { status: 403 });

  const session = loadSession(req.cookies.get(CHAT_COOKIE)?.value);
  if (session) deleteSession(session.id);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CHAT_COOKIE, "", { ...chatCookieOptions(req), maxAge: 0 });
  return res;
}
