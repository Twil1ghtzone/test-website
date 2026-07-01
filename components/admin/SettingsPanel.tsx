"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Save, Loader2, Wifi } from "lucide-react";

type AISettings = {
  enabled: boolean; endpoint: string; model: string; systemPrompt: string;
  temperature: number; maxTokens: number; greeting: string; fallback: string; apiKeySet?: boolean;
};

export default function SettingsPanel() {
  const [ai, setAi] = useState<AISettings | null>(null);
  const [siteName, setSiteName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [test, setTest] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/settings", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setAi(d.settings.ai);
      setSiteName(d.settings.siteName);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!ai) return;
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteName, ai: { ...ai, ...(apiKey ? { apiKey } : {}) } }),
    });
    setBusy(false);
    setMsg(r.ok ? "Gespeichert ✓" : "Fehler beim Speichern");
    if (r.ok) { setApiKey(""); load(); }
    setTimeout(() => setMsg(""), 2500);
  }

  async function runTest() {
    setTest("…");
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", text: "Kurzer Verbindungstest." }] }),
    });
    const d = await r.json();
    if (d.source === "ai") setTest(`KI antwortet ✓ — „${(d.reply || "").slice(0, 80)}…"`);
    else setTest(`Keine KI-Antwort (${d.source}).${d.detail ? " " + d.detail : " Endpunkt/Modell prüfen, vorher speichern."}`);
  }

  const presets = [
    { name: "Ollama", endpoint: "http://localhost:11434/v1/chat/completions", model: "llama3.1" },
    { name: "LM Studio", endpoint: "http://localhost:1234/v1/chat/completions", model: "local-model" },
    { name: "OpenAI", endpoint: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
  ];

  if (!ai) {
    return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;
  }

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";
  const lbl = "mb-1.5 block eyebrow text-muted";

  return (
    <form onSubmit={save} className="space-y-6">
      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
        <h2 className="font-display text-xl font-semibold tracking-tight">Allgemein</h2>
        <div className="mt-4"><label className={lbl}>Seitenname</label><input value={siteName} onChange={(e) => setSiteName(e.target.value)} className={field} /></div>
      </div>

      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"><Sparkles className="h-5 w-5 text-accent" /> KI-Assistent</h2>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={ai.enabled} onChange={(e) => setAi({ ...ai, enabled: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" /> Aktiv
          </label>
        </div>
        <p className="mt-1 text-sm text-muted">OpenAI-kompatibler Endpunkt. Der API-Key bleibt serverseitig und wird nie angezeigt.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button key={p.name} type="button" onClick={() => setAi({ ...ai, endpoint: p.endpoint, model: p.model })}
              className="rounded-full border border-line-strong bg-canvas px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-accent hover:text-accent-ink cursor-pointer">
              {p.name}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={lbl}>Endpunkt (Chat-Completions-URL)</label>
            <input value={ai.endpoint} onChange={(e) => setAi({ ...ai, endpoint: e.target.value })} className={field} placeholder="http://localhost:11434/v1/chat/completions" />
            <p className="mt-1 text-xs text-muted">Ollama: Port 11434 · LM Studio: Port 1234. Im Docker statt <span className="font-mono">localhost</span> ggf. <span className="font-mono">host.docker.internal</span>. Bei lokalen LLMs API-Key leer lassen.</p>
          </div>
          <div><label className={lbl}>Modell</label><input value={ai.model} onChange={(e) => setAi({ ...ai, model: e.target.value })} className={field} placeholder="gpt-4o-mini" /></div>
          <div>
            <label className={lbl}>API-Key {ai.apiKeySet && <span className="normal-case text-emerald-600">· gesetzt</span>}</label>
            <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} className={field} placeholder={ai.apiKeySet ? "•••• (leer = unverändert)" : "sk-…"} autoComplete="off" />
          </div>
          <div><label className={lbl}>Temperatur ({ai.temperature.toFixed(1)})</label><input type="range" min={0} max={2} step={0.1} value={ai.temperature} onChange={(e) => setAi({ ...ai, temperature: +e.target.value })} className="mt-3 w-full accent-[var(--color-accent)]" /></div>
          <div><label className={lbl}>Max. Tokens</label><input type="number" min={50} max={4000} value={ai.maxTokens} onChange={(e) => setAi({ ...ai, maxTokens: +e.target.value })} className={field} /></div>
          <div className="sm:col-span-2"><label className={lbl}>Core-Prompt (Persönlichkeit / Anweisungen)</label><textarea rows={5} value={ai.systemPrompt} onChange={(e) => setAi({ ...ai, systemPrompt: e.target.value })} className={`${field} resize-none`} /></div>
          <div className="sm:col-span-2"><label className={lbl}>Begrüßung im Chat</label><input value={ai.greeting} onChange={(e) => setAi({ ...ai, greeting: e.target.value })} className={field} /></div>
          <div className="sm:col-span-2"><label className={lbl}>Fallback (KI aus/Fehler)</label><input value={ai.fallback} onChange={(e) => setAi({ ...ai, fallback: e.target.value })} className={field} /></div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={runTest} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink cursor-pointer"><Wifi className="h-4 w-4" /> Verbindung testen</button>
          {test && <span className="text-sm text-ink-soft">{test}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Speichern
        </button>
        {msg && <span className="text-sm font-medium text-emerald-600">{msg}</span>}
      </div>
    </form>
  );
}
