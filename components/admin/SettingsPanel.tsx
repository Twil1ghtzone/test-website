"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Save, Loader2, Wifi, Eye, EyeOff, Check, AlertTriangle, X } from "lucide-react";

type AISettings = {
  enabled: boolean; endpoint: string; model: string; systemPrompt: string;
  temperature: number; maxTokens: number; greeting: string; fallback: string; apiKeySet?: boolean;
};

type TestResult = { ok: boolean; ms?: number; status?: number; reply?: string; detail?: string; model?: string };

const PROMPT_EXAMPLE =
  "Du bist der freundliche Support-Assistent von STUDIO//LOKAL — einem Betrieb für Elektrohandwerk und lokale IT (cloud-frei, abofrei, Daten bleiben im Haus). " +
  "Antworte kurz, höflich und auf Deutsch. Hilf bei Fragen zu Smart Home, Sicherheit, eigenem Server, Energie sparen und 3D-Druck. " +
  "Erfinde keine Preise — Preise gibt es nur auf Anfrage. Bei konkreten Aufträgen verweise freundlich auf das Kontaktformular, E-Mail oder Telefon.";

export default function SettingsPanel() {
  const [ai, setAi] = useState<AISettings | null>(null);
  const [siteName, setSiteName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [clearKey, setClearKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);
  const [confirm, setConfirm] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/settings", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setAi(d.settings.ai);
      setSiteName(d.settings.siteName);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function doSave() {
    if (!ai) return;
    setConfirm(false);
    setBusy(true); setMsg("");
    // clearKey → Key aktiv leeren; sonst nur bei neuer Eingabe überschreiben.
    const keyField = clearKey ? { apiKey: "" } : apiKey ? { apiKey } : {};
    const r = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteName, ai: { ...ai, ...keyField } }),
    });
    setBusy(false);
    setMsg(r.ok ? "Gespeichert ✓" : "Fehler beim Speichern");
    if (r.ok) { setApiKey(""); setClearKey(false); load(); }
    setTimeout(() => setMsg(""), 2500);
  }

  // Echte Verbindungsabfrage gegen die AKTUELL eingetragenen (auch ungespeicherten) Werte.
  async function runTest() {
    if (!ai) return;
    setTesting(true); setTest(null);
    try {
      const r = await fetch("/api/admin/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: ai.endpoint, model: ai.model, systemPrompt: ai.systemPrompt, ...(apiKey ? { apiKey } : {}) }),
      });
      setTest(await r.json());
    } catch {
      setTest({ ok: false, detail: "Anfrage fehlgeschlagen." });
    } finally {
      setTesting(false);
    }
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
    <form onSubmit={(e) => { e.preventDefault(); setConfirm(true); }} className="space-y-6">
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
            <label className={lbl}>API-Key {ai.apiKeySet && !clearKey && <span className="normal-case text-emerald-600">· gesetzt</span>}</label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); if (e.target.value) setClearKey(false); }}
                disabled={clearKey}
                className={`${field} pr-11 disabled:opacity-50`}
                placeholder={clearKey ? "wird beim Speichern entfernt" : ai.apiKeySet ? "•••• (leer = unverändert)" : "sk-…  (bei Ollama/LM Studio leer lassen)"}
                autoComplete="off"
              />
              <button type="button" onClick={() => setShowKey((v) => !v)} aria-label={showKey ? "Key verbergen" : "Key anzeigen"} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer">
                {showKey ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {ai.apiKeySet && (
              <label className="mt-1.5 inline-flex cursor-pointer items-center gap-2 text-xs text-muted">
                <input type="checkbox" checked={clearKey} onChange={(e) => { setClearKey(e.target.checked); if (e.target.checked) setApiKey(""); }} className="h-3.5 w-3.5 accent-[var(--color-accent)]" />
                gespeicherten Key entfernen (für lokale LLMs)
              </label>
            )}
          </div>
          <div><label className={lbl}>Temperatur ({ai.temperature.toFixed(1)})</label><input type="range" min={0} max={2} step={0.1} value={ai.temperature} onChange={(e) => setAi({ ...ai, temperature: +e.target.value })} className="mt-3 w-full accent-[var(--color-accent)]" /></div>
          <div><label className={lbl}>Max. Tokens</label><input type="number" min={50} max={4000} value={ai.maxTokens} onChange={(e) => setAi({ ...ai, maxTokens: +e.target.value })} className={field} /></div>
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label className={lbl.replace("mb-1.5 ", "")}>System-Prompt (Persönlichkeit / Anweisungen)</label>
              <button type="button" onClick={() => setAi({ ...ai, systemPrompt: PROMPT_EXAMPLE })} className="rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft cursor-pointer">Beispiel einfügen</button>
            </div>
            <textarea rows={6} value={ai.systemPrompt} onChange={(e) => setAi({ ...ai, systemPrompt: e.target.value })} className={`${field} resize-none`} placeholder={PROMPT_EXAMPLE} />
            <p className="mt-1 text-xs text-muted">Legt fest, wie der Assistent im Support-Chat antwortet. Wird bei jeder Nachricht als Kontext mitgeschickt.</p>
          </div>
          <div className="sm:col-span-2"><label className={lbl}>Begrüßung im Chat</label><input value={ai.greeting} onChange={(e) => setAi({ ...ai, greeting: e.target.value })} className={field} /></div>
          <div className="sm:col-span-2"><label className={lbl}>Fallback (KI aus/Fehler)</label><input value={ai.fallback} onChange={(e) => setAi({ ...ai, fallback: e.target.value })} className={field} /></div>
        </div>

        <div className="mt-5">
          <button type="button" onClick={runTest} disabled={testing} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink disabled:opacity-60 cursor-pointer">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />} Verbindung testen
          </button>
          <p className="mt-1.5 text-xs text-muted">Sendet eine echte Test-Anfrage an den oben eingetragenen Endpunkt (auch ungespeichert).</p>

          {test && (
            <div className={`mt-3 rounded-2xl border p-4 text-sm ${test.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
              <div className={`flex items-center gap-2 font-medium ${test.ok ? "text-emerald-700" : "text-red-700"}`}>
                {test.ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                {test.ok ? "Verbindung erfolgreich" : "Verbindung fehlgeschlagen"}
                {typeof test.ms === "number" && <span className="font-normal text-muted">· {test.ms} ms{test.status ? ` · HTTP ${test.status}` : ""}</span>}
              </div>
              {test.ok && test.reply && <p className="mt-1.5 text-ink-soft">Antwort ({test.model}): „{test.reply}"</p>}
              {!test.ok && test.detail && <p className="mt-1.5 break-words text-red-700/90">{test.detail}</p>}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Speichern
        </button>
        {msg && <span className="text-sm font-medium text-emerald-600">{msg}</span>}
      </div>

      {/* Bestätigung vor dem Speichern */}
      {confirm && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" onClick={() => setConfirm(false)}>
          <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="font-display text-lg font-semibold tracking-tight">Änderungen speichern?</h3>
              <button type="button" onClick={() => setConfirm(false)} aria-label="Abbrechen" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Die Einstellungen des Support-Assistenten werden aktualisiert.{" "}
              {ai.enabled ? "Der KI-Assistent ist danach aktiv." : "Der KI-Assistent bleibt deaktiviert (Fallback-Antworten)."}
              {clearKey && " Der gespeicherte API-Key wird entfernt."}
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirm(false)} className="rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:border-ink cursor-pointer">Abbrechen</button>
              <button type="button" onClick={doSave} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-ink cursor-pointer"><Check className="h-4 w-4" /> Speichern</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
