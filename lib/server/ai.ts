import type { AISettings } from "./store";

// ── Gemeinsame KI-Schicht (wie novum) ──
// OpenAI-kompatibel (OpenAI, Ollama, LM Studio, vLLM, …) + Anthropic-Format.

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };
export type AIResult =
  | { ok: true; reply: string; ms: number; status: number }
  | { ok: false; detail: string; ms: number; status?: number };

// Endpunkt normalisieren: Basis-URLs automatisch auf /v1/chat/completions ergänzen
// (novum-Verhalten) — "http://localhost:11434" funktioniert damit genauso wie die volle URL.
export function normalizeEndpoint(raw: string): string {
  const e = raw.trim().replace(/\/+$/, "");
  if (!e) return e;
  if (isAnthropic(e)) {
    return /\/v1\/messages$/.test(e) ? e : `${e.replace(/\/v1$/, "")}/v1/messages`;
  }
  if (/\/v1\/chat\/completions$/.test(e)) return e;
  if (/\/chat\/completions$/.test(e)) return e;
  if (/\/v1$/.test(e)) return `${e}/chat/completions`;
  return `${e}/v1/chat/completions`;
}

export function isAnthropic(endpoint: string): boolean {
  return endpoint.toLowerCase().includes("anthropic");
}

// Manche lokalen "Reasoning"-Modelle (DeepSeek-R1, Qwen3-Thinking, gpt-oss …)
// packen ihre Denkschritte in <think>…</think> — die eigentliche Antwort
// steht danach. Entfernt den Denkblock und liefert den Rest.
// Ein GEÖFFNETER aber nie geschlossener <think>-Block bedeutet: das
// Token-Budget ist mitten im Nachdenken ausgegangen — es gibt keine echte
// Antwort, auch wenn der Text nicht leer ist. Dann bewusst "" liefern.
function stripThinking(text: string): string {
  if (/<think>/i.test(text) && !/<\/think>/i.test(text)) return "";
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

// Extrahiert die Antwort aus einer OpenAI-kompatiblen Chat-Completion —
// mit Fallbacks für lokale Server, die vom Standard abweichen (LM Studio,
// llama.cpp, manche Reasoning-Modelle liefern reasoning_content statt/neben content).
function extractReply(data: unknown): { reply: string; raw: string } {
  const msg = (data as { choices?: { message?: { content?: unknown; reasoning_content?: unknown }; text?: unknown }[] })?.choices?.[0];
  const rawContent = msg?.message?.content;
  const contentStr =
    typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent.map((p) => (typeof p === "string" ? p : p?.text || "")).join("")
        : "";
  const stripped = stripThinking(contentStr);
  if (stripped) return { reply: stripped, raw: contentStr };

  // Fallback: reasoning_content (manche Server legen die Antwort NUR dort ab).
  const reasoning = typeof msg?.message?.reasoning_content === "string" ? msg.message.reasoning_content : "";
  const strippedReasoning = stripThinking(reasoning);
  if (strippedReasoning) return { reply: strippedReasoning, raw: reasoning };

  // Fallback: alte /v1/completions-Form (choices[0].text).
  const legacyText = typeof msg?.text === "string" ? msg.text : "";
  if (legacyText.trim()) return { reply: legacyText.trim(), raw: legacyText };

  return { reply: "", raw: contentStr || reasoning || "" };
}

export async function callAI(
  ai: Pick<AISettings, "endpoint" | "apiKey" | "model" | "temperature" | "maxTokens">,
  messages: AIMessage[],
  timeoutMs = 60000
): Promise<AIResult> {
  const endpoint = normalizeEndpoint(ai.endpoint);
  const started = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res: Response;
    if (isAnthropic(endpoint)) {
      // Anthropic Messages API: system separat, x-api-key-Header.
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
      const rest = messages.filter((m) => m.role !== "system");
      res = await fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
          ...(ai.apiKey ? { "x-api-key": ai.apiKey } : {}),
        },
        body: JSON.stringify({
          model: ai.model,
          max_tokens: ai.maxTokens,
          temperature: ai.temperature,
          ...(system ? { system } : {}),
          messages: rest,
        }),
      });
      clearTimeout(t);
      const ms = Date.now() - started;
      if (!res.ok) {
        const detail = (await res.text().catch(() => "")).slice(0, 300);
        return { ok: false, detail: `HTTP ${res.status} — ${detail || "keine Antwort"}`, ms, status: res.status };
      }
      const data = await res.json().catch(() => null);
      const reply = data?.content?.[0]?.text?.trim();
      if (!reply) return { ok: false, detail: "Antwort ohne verwertbaren Inhalt.", ms, status: res.status };
      return { ok: true, reply, ms, status: res.status };
    }

    // OpenAI-kompatibel (OpenAI, Ollama, LM Studio, …) — Key optional.
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (ai.apiKey) headers.Authorization = `Bearer ${ai.apiKey}`;
    res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers,
      body: JSON.stringify({
        model: ai.model,
        temperature: ai.temperature,
        max_tokens: ai.maxTokens,
        messages,
      }),
    });
    clearTimeout(t);
    const ms = Date.now() - started;
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return { ok: false, detail: `HTTP ${res.status} — ${detail || "keine Antwort"}`, ms, status: res.status };
    }
    const data = await res.json().catch(() => null);
    const { reply, raw } = extractReply(data);
    if (!reply) {
      const hint = raw
        ? " Modell hat vermutlich das Token-Limit mit interner Reasoning verbraucht (Denkschritte) — maxTokens erhöhen oder ein Nicht-Reasoning-Modell wählen."
        : "";
      return {
        ok: false,
        detail: `Antwort ohne verwertbaren Inhalt (choices[0].message.content leer).${hint}`,
        ms,
        status: res.status,
      };
    }
    return { ok: true, reply, ms, status: res.status };
  } catch (e) {
    clearTimeout(t);
    const ms = Date.now() - started;
    let detail = "Verbindung fehlgeschlagen";
    if (e instanceof Error) {
      if (e.name === "AbortError") detail = `Zeitüberschreitung (${Math.round(timeoutMs / 1000)} s) — läuft der Server?`;
      else {
        const cause = (e as { cause?: { code?: string } }).cause;
        detail = cause?.code === "ECONNREFUSED"
          ? "Verbindung abgelehnt — kein Server unter dieser Adresse/Port erreichbar. Läuft Ollama/LM Studio? Im Docker host.docker.internal statt localhost nutzen."
          : `${e.message}${cause?.code ? ` (${cause.code})` : ""}`;
      }
    }
    return { ok: false, detail, ms };
  }
}
