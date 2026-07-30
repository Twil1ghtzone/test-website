import type { AISettings } from "./store";

// ── Gemeinsame KI-Schicht ──
// OpenAI-kompatibel (OpenAI, Ollama, LM Studio, vLLM, llama.cpp …) + Anthropic-Format.

export type AIMessage = { role: "system" | "user" | "assistant"; content: string };
export type AIUsage = { prompt?: number; completion?: number; total?: number };
/** Modell hat nur interne Denkschritte geliefert, keine verwertbare Antwort. */
export type AIMeta = { finish?: string; usage?: AIUsage; reasoningOnly?: boolean; usedMaxTokens?: number };
export type AIResult =
  | ({ ok: true; reply: string; ms: number; status: number } & AIMeta)
  | ({ ok: false; detail: string; ms: number; status?: number } & AIMeta);

// Endpunkt normalisieren: Basis-URLs automatisch auf /v1/chat/completions ergänzen —
// "http://localhost:11434" funktioniert damit genauso wie die volle URL.
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

// Läuft der Server im eigenen Netz? Nur dort schicken wir zusätzliche Felder
// mit, die nicht zum OpenAI-Standard gehören — strenge Cloud-APIs antworten
// darauf mit HTTP 400.
export function isLocalEndpoint(endpoint: string): boolean {
  try {
    const h = new URL(endpoint).hostname.toLowerCase();
    return (
      h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0" ||
      h === "host.docker.internal" || h.endsWith(".local") || h.endsWith(".lan") ||
      /^192\.168\./.test(h) || /^10\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)
    );
  } catch {
    return false;
  }
}

// Bitte an lokale Server, das „laute Denken“ abzuschalten. Jeder Anbieter
// nennt das anders; unbekannte Felder ignorieren die gängigen lokalen Server.
// Falls doch einer mit 400 antwortet, wiederholt callAI die Anfrage ohne sie.
const OHNE_DENKEN = {
  chat_template_kwargs: { enable_thinking: false }, // llama.cpp / LM Studio / vLLM (Qwen3 & Co.)
  think: false,                                     // Ollama
  reasoning_effort: "low",                          // neuere LM-Studio-/OpenAI-Versionen
} as const;

// Reasoning-Modelle (DeepSeek-R1, Qwen3-Thinking, gpt-oss, Nemotron …) packen
// ihre Denkschritte in Marker-Tags — die eigentliche Antwort steht danach.
// Ein GEÖFFNETER, nie geschlossener Block heißt: das Token-Budget ist mitten
// im Nachdenken ausgegangen. Dann gibt es keine Antwort, auch wenn Text da ist.
const DENK_TAGS = ["think", "thinking", "reason", "reasoning", "analysis"];
function stripThinking(text: string): string {
  for (const tag of DENK_TAGS) {
    const auf = new RegExp(`<${tag}>`, "i");
    const zu = new RegExp(`</${tag}>`, "i");
    if (auf.test(text) && !zu.test(text)) return "";
    text = text.replace(new RegExp(`<${tag}>[\\s\\S]*?</${tag}>`, "gi"), "");
  }
  return text.trim();
}

type ChatChoice = {
  message?: { content?: unknown; reasoning_content?: unknown; reasoning?: unknown };
  text?: unknown;
  finish_reason?: unknown;
};

// Extrahiert die Antwort aus einer OpenAI-kompatiblen Chat-Completion —
// mit Fallbacks für lokale Server, die vom Standard abweichen.
function extractReply(data: unknown): { reply: string; raw: string; finish: string; usage: AIUsage } {
  const d = data as { choices?: ChatChoice[]; usage?: Record<string, number> };
  const choice = d?.choices?.[0];
  const finish = typeof choice?.finish_reason === "string" ? choice.finish_reason : "";
  const usage: AIUsage = {
    prompt: d?.usage?.prompt_tokens,
    completion: d?.usage?.completion_tokens,
    total: d?.usage?.total_tokens,
  };

  const rawContent = choice?.message?.content;
  const contentStr =
    typeof rawContent === "string"
      ? rawContent
      : Array.isArray(rawContent)
        ? rawContent.map((p) => (typeof p === "string" ? p : p?.text || "")).join("")
        : "";
  const stripped = stripThinking(contentStr);
  if (stripped) return { reply: stripped, raw: contentStr, finish, usage };

  // Fallback: reasoning_content — manche Server legen die Antwort NUR dort ab.
  // ABER: wurde die Ausgabe wegen des Token-Limits abgeschnitten, ist das
  // bloß ein abgebrochener Gedankengang. Den darf der Kunde nie zu sehen
  // bekommen — dann lieber sauber als Fehler melden.
  const reasoning =
    typeof choice?.message?.reasoning_content === "string" ? choice.message.reasoning_content
    : typeof choice?.message?.reasoning === "string" ? choice.message.reasoning
    : "";
  if (finish !== "length") {
    const strippedReasoning = stripThinking(reasoning);
    if (strippedReasoning) return { reply: strippedReasoning, raw: reasoning, finish, usage };
  }

  // Fallback: alte /v1/completions-Form (choices[0].text).
  const legacyText = typeof choice?.text === "string" ? choice.text : "";
  if (legacyText.trim()) return { reply: legacyText.trim(), raw: legacyText, finish, usage };

  return { reply: "", raw: contentStr || reasoning || "", finish, usage };
}

function leerAntwortDetail(raw: string, finish: string, maxTokens: number): string {
  if (finish === "length") {
    return (
      `Das Modell hat das Token-Limit (max_tokens = ${maxTokens}) aufgebraucht, bevor eine Antwort fertig war` +
      (raw ? " — die Ausgabe bestand nur aus internen Denkschritten." : ".") +
      " Erhöhen Sie „Max. Tokens“ oder wählen Sie ein Modell ohne Reasoning."
    );
  }
  if (raw) {
    return "Das Modell hat nur interne Denkschritte geliefert, keine Antwort. Erhöhen Sie „Max. Tokens“ oder wählen Sie ein Modell ohne Reasoning.";
  }
  return "Antwort ohne verwertbaren Inhalt (choices[0].message.content leer).";
}

/** Obergrenze für den automatischen zweiten Versuch mit größerem Token-Budget. */
const BUDGET_DECKE = 4000;
/** Unter dieser Restzeit lohnt kein zweiter Versuch mehr. */
const MIN_RESTZEIT_MS = 15000;

export async function callAI(
  ai: Pick<AISettings, "endpoint" | "apiKey" | "model" | "temperature" | "maxTokens"> & { timeoutMs?: number },
  messages: AIMessage[],
  timeoutMs = ai.timeoutMs ?? 120000
): Promise<AIResult> {
  const endpoint = normalizeEndpoint(ai.endpoint);
  const started = Date.now();
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (isAnthropic(endpoint)) {
      // Anthropic Messages API: system separat, x-api-key-Header.
      const system = messages.filter((m) => m.role === "system").map((m) => m.content).join("\n");
      const rest = messages.filter((m) => m.role !== "system");
      const res = await fetch(endpoint, {
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
    const lokal = isLocalEndpoint(endpoint);

    const senden = (maxTokens: number, extras: boolean) =>
      fetch(endpoint, {
        method: "POST",
        signal: controller.signal,
        headers,
        body: JSON.stringify({
          model: ai.model,
          temperature: ai.temperature,
          max_tokens: maxTokens,
          messages,
          ...(extras ? OHNE_DENKEN : {}),
        }),
      });

    type Durchgang =
      | { art: "fehler"; status: number; detail: string }
      | { art: "antwort"; status: number; reply: string; raw: string; finish: string; usage: AIUsage };

    // Ein Durchgang: Anfrage senden, Antwort auswerten.
    const versuch = async (maxTokens: number): Promise<Durchgang> => {
      let res = await senden(maxTokens, lokal);
      // Server, der die Zusatzfelder nicht kennt → sauberer zweiter Versuch ohne sie.
      if (lokal && res.status === 400) res = await senden(maxTokens, false);
      if (!res.ok) {
        const text = (await res.text().catch(() => "")).slice(0, 300);
        return { art: "fehler", status: res.status, detail: `HTTP ${res.status} — ${text || "keine Antwort"}` };
      }
      const data = await res.json().catch(() => null);
      return { art: "antwort", status: res.status, ...extractReply(data) };
    };

    let budget = ai.maxTokens;
    let a = await versuch(budget);
    if (a.art === "fehler") {
      clearTimeout(t);
      return { ok: false, detail: a.detail, ms: Date.now() - started, status: a.status };
    }

    // Reasoning-Modelle (Nemotron, DeepSeek-R1, Qwen3-Thinking …) verbrauchen ihr
    // Budget komplett fürs Nachdenken und liefern dann content: "". Statt den
    // Nutzer zum Schrauben an „Max. Tokens“ zu schicken, versuchen wir es EINMAL
    // automatisch mit dem vierfachen Budget — sofern noch Zeit übrig ist.
    const restzeit = () => timeoutMs - (Date.now() - started);
    const budgetAufgebraucht = !a.reply && (!!a.raw || a.finish === "length");
    if (budgetAufgebraucht && budget < BUDGET_DECKE && restzeit() > MIN_RESTZEIT_MS) {
      budget = Math.min(BUDGET_DECKE, budget * 4);
      const b = await versuch(budget);
      if (b.art === "antwort" && b.reply) a = b;
    }

    clearTimeout(t);
    const ms = Date.now() - started;
    if (!a.reply) {
      return {
        ok: false,
        detail: leerAntwortDetail(a.raw, a.finish, budget),
        ms, status: a.status, finish: a.finish, usage: a.usage,
        reasoningOnly: !!a.raw, usedMaxTokens: budget,
      };
    }
    return { ok: true, reply: a.reply, ms, status: a.status, finish: a.finish, usage: a.usage, usedMaxTokens: budget };
  } catch (e) {
    clearTimeout(t);
    const ms = Date.now() - started;
    let detail = "Verbindung fehlgeschlagen";
    if (e instanceof Error) {
      if (e.name === "AbortError") {
        detail =
          `Zeitüberschreitung nach ${Math.round(timeoutMs / 1000)} s — der Server hat die Anfrage angenommen, ` +
          "war aber noch nicht fertig. Lokale Reasoning-Modelle brauchen oft länger: „Zeitlimit“ erhöhen " +
          "oder ein kleineres/schnelleres Modell wählen.";
      } else {
        const cause = (e as { cause?: { code?: string } }).cause;
        detail = cause?.code === "ECONNREFUSED"
          ? "Verbindung abgelehnt — kein Server unter dieser Adresse/Port erreichbar. Läuft Ollama/LM Studio? Im Docker host.docker.internal statt localhost nutzen."
          : `${e.message}${cause?.code ? ` (${cause.code})` : ""}`;
      }
    }
    return { ok: false, detail, ms };
  }
}
