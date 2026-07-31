"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Save, Loader2, Wifi, Eye, EyeOff, Check, AlertTriangle, X, Plus, Workflow, ExternalLink, ShieldAlert } from "lucide-react";

type AISettings = {
  enabled: boolean; endpoint: string; model: string; systemPrompt: string;
  temperature: number; maxTokens: number; timeoutMs: number; greeting: string; fallback: string;
  requireApiKey: boolean; apiKeyEnabled: boolean; apiKeySet?: boolean;
};

type SmtpSettings = { host: string; port: number; user: string; from: string; passSet?: boolean };
type AutomationSettings = { enabled: boolean; url: string };

type TestResult = { ok: boolean; ms?: number; status?: number; reply?: string; detail?: string; warnung?: string; model?: string };

const PROMPT_EXAMPLE =
  "Du bist der freundliche Support-Assistent von STUDIO//LOKAL — einem Betrieb für Elektrohandwerk und lokale IT (cloud-frei, abofrei, Daten bleiben im Haus). " +
  "Antworte kurz, höflich und auf Deutsch. Hilf bei Fragen zu Smart Home, Sicherheit, eigenem Server, Energie sparen und 3D-Druck. " +
  "Erfinde keine Preise — Preise gibt es nur auf Anfrage. Bei konkreten Aufträgen verweise freundlich auf das Kontaktformular, E-Mail oder Telefon.";

export default function SettingsPanel() {
  const [ai, setAi] = useState<AISettings | null>(null);
  const [smtp, setSmtp] = useState<SmtpSettings | null>(null);
  const [automation, setAutomation] = useState<AutomationSettings | null>(null);
  const [smtpPass, setSmtpPass] = useState("");
  const [savedEndpoint, setSavedEndpoint] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [siteName, setSiteName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [clearKey, setClearKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<TestResult | null>(null);
  const [confirm, setConfirm] = useState(false);
  const endpointInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/settings", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setAi(d.settings.ai);
      setSmtp(d.settings.smtp);
      setAutomation(d.settings.automation);
      setSavedEndpoint(d.settings.ai.endpoint);
      setSiteName(d.settings.siteName);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const endpointChanged = !!ai && ai.endpoint.trim() !== savedEndpoint;

  async function doSave() {
    if (!ai) return;
    setBusy(true); setMsg("");
    // clearKey → Key aktiv leeren; sonst nur bei neuer Eingabe überschreiben.
    const keyField = clearKey ? { apiKey: "" } : apiKey ? { apiKey } : {};
    const smtpField = smtp ? { smtp: { ...smtp, ...(smtpPass ? { pass: smtpPass } : {}) } } : {};
    const r = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        siteName,
        ai: { ...ai, ...keyField },
        ...smtpField,
        ...(automation ? { automation } : {}),
        // Endpunkt-Änderung erfordert das Admin-Passwort (Sicherheitsstufe).
        ...(endpointChanged ? { adminPassword } : {}),
      }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setMsg(d.error || "Fehler beim Speichern");
      setTimeout(() => setMsg(""), 4000);
      return;
    }
    setConfirm(false);
    setMsg("Gespeichert ✓");
    setApiKey(""); setClearKey(false); setSmtpPass(""); setAdminPassword("");
    load();
    setTimeout(() => setMsg(""), 2500);
  }

  // Echte Verbindungsabfrage gegen die AKTUELL eingetragenen (auch ungespeicherten) Werte.
  async function runTest() {
    if (!ai) return;
    setTesting(true); setTest(null);

    // Dieselbe Grenze wie der Server (das eingestellte Zeitlimit), plus
    // Zuschlag, damit die erklärende Server-Antwort Vorrang hat. Ohne diese
    // Grenze drehte der Knopf bei einem hängenden Endpunkt endlos weiter.
    const grenzeMs = Math.max(5000, ai.timeoutMs) + 5000;
    const controller = new AbortController();
    let zeitlimitErreicht = false;
    const notbremse = window.setTimeout(() => { zeitlimitErreicht = true; controller.abort(); }, grenzeMs);

    try {
      const r = await fetch("/api/admin/settings/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: ai.endpoint, model: ai.model, systemPrompt: ai.systemPrompt, ...(apiKey ? { apiKey } : {}) }),
        signal: controller.signal,
      });
      setTest(await r.json());
    } catch {
      setTest({
        ok: false,
        detail: zeitlimitErreicht
          ? `Keine Antwort innerhalb von ${Math.round(grenzeMs / 1000)} s. Der Endpunkt ist erreichbar, antwortet aber nicht rechtzeitig — „Zeitlimit" erhöhen oder ein schnelleres Modell wählen.`
          : "Anfrage fehlgeschlagen.",
      });
    } finally {
      window.clearTimeout(notbremse);
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

  // Eigener Endpunkt: aktiv, wenn keins der Presets zum aktuellen Endpunkt passt.
  const isCustomEndpoint = !presets.some((p) => p.endpoint === ai.endpoint);

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

        {/* Unmissverständlicher Hinweis, wenn die KI aus ist — sonst denkt man,
            der Chat sei „kaputt", obwohl er nur den Fallback-Text ausgibt. */}
        {!ai.enabled && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <p className="min-w-0 flex-1 text-sm text-amber-900">
              <b>KI ist derzeit AUS.</b> Support-Chat und Assistent senden <b>keine</b> echte Anfrage und
              antworten nur mit dem Fallback-Text. Zum Verbinden mit Ollama/LM Studio hier aktivieren, Endpunkt prüfen und speichern.
            </p>
            <button type="button" onClick={() => setAi({ ...ai, enabled: true })}
              className="shrink-0 rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 cursor-pointer">
              KI aktivieren
            </button>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {presets.map((p) => {
            const active = ai.endpoint === p.endpoint;
            return (
              <button key={p.name} type="button" onClick={() => setAi({ ...ai, endpoint: p.endpoint, model: p.model })}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                  active ? "border-accent bg-accent-soft text-accent-ink" : "border-line-strong bg-canvas text-ink hover:border-accent hover:text-accent-ink"
                }`}>
                {p.name}
              </button>
            );
          })}
          {/* Eigener Endpunkt: leert die Felder für eine freie, individuelle Adresse. */}
          <button
            type="button"
            onClick={() => { setAi({ ...ai, endpoint: "", model: "" }); endpointInputRef.current?.focus(); }}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              isCustomEndpoint ? "border-accent bg-accent-soft text-accent-ink" : "border-dashed border-line-strong bg-canvas text-ink hover:border-accent hover:text-accent-ink"
            }`}
          >
            <Plus className="h-3 w-3" /> Eigener Endpunkt
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={lbl}>Endpunkt (Chat-Completions-URL) {isCustomEndpoint && ai.endpoint && <span className="normal-case text-accent-ink">· eigener Endpunkt</span>}</label>
            <input ref={endpointInputRef} value={ai.endpoint} onChange={(e) => setAi({ ...ai, endpoint: e.target.value })} className={field} placeholder="http://192.168.1.50:1234/v1/chat/completions oder https://api.ihr-anbieter.de/v1/chat/completions" />
            <p className="mt-1 text-xs text-muted">Beliebiger OpenAI- oder Anthropic-kompatibler Endpunkt — auch ein anderer PC im Netzwerk oder ein eigener Cloud-Anbieter. Ollama: Port 11434 · LM Studio: Port 1234. Im Docker statt <span className="font-mono">localhost</span> ggf. <span className="font-mono">host.docker.internal</span>. Bei lokalen LLMs API-Key leer lassen.</p>
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
            <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={ai.requireApiKey} onChange={(e) => setAi({ ...ai, requireApiKey: e.target.checked })} className="h-3.5 w-3.5 accent-[var(--color-accent)]" />
              API-Key erforderlich (an: Cloud-APIs wie OpenAI · aus: Ollama/LM Studio ohne Key)
            </label>
            {/* Key aktivieren/deaktivieren ohne ihn zu löschen (wie novum) */}
            <button
              type="button"
              onClick={() => setAi({ ...ai, apiKeyEnabled: !ai.apiKeyEnabled })}
              className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                ai.apiKeyEnabled
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "border-line-strong bg-canvas text-ink-soft hover:border-ink"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${ai.apiKeyEnabled ? "bg-emerald-500" : "bg-line-strong"}`} />
              API-Key {ai.apiKeyEnabled ? "aktiv — Klick zum Deaktivieren" : "deaktiviert — Klick zum Aktivieren"}
            </button>
          </div>
          <div><label className={lbl}>Temperatur ({ai.temperature.toFixed(1)})</label><input type="range" min={0} max={2} step={0.1} value={ai.temperature} onChange={(e) => setAi({ ...ai, temperature: +e.target.value })} className="mt-3 w-full accent-[var(--color-accent)]" /></div>
          <div>
            <label className={lbl}>Max. Tokens</label>
            <input type="number" min={50} max={4000} value={ai.maxTokens} onChange={(e) => setAi({ ...ai, maxTokens: +e.target.value })} className={field} />
            <p className="mt-1 text-xs text-muted">Reasoning-Modelle (DeepSeek-R1, Qwen-Thinking, Nemotron …) brauchen mehr Budget fürs „Nachdenken" — bei leeren Antworten hier erhöhen. Ein zweiter Versuch mit vierfachem Budget läuft automatisch.</p>
          </div>
          <div>
            <label className={lbl}>Zeitlimit (Sekunden)</label>
            <input
              type="number" min={5} max={600}
              value={Math.round(ai.timeoutMs / 1000)}
              onChange={(e) => setAi({ ...ai, timeoutMs: Math.max(5, Math.min(600, +e.target.value)) * 1000 })}
              className={field}
            />
            <p className="mt-1 text-xs text-muted">
              So lange darf das Modell rechnen. Lokale Modelle auf CPU brauchen leicht 60–120 s — ist der Wert zu
              klein, kappt der Server die Leitung mitten in der Antwort. Dieses Limit gilt überall gleich:
              Kundenchat, Assistent, Verbindungstest — und auch im Browser, der die Anfrage danach
              selbst abbricht statt endlos zu warten.
            </p>
          </div>
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
          <p className="mt-1.5 text-xs text-muted">
            Sendet eine echte Test-Anfrage an den oben eingetragenen Endpunkt (auch ungespeichert) —
            unter demselben Zeitlimit, das auch im Betrieb gilt. Schlägt der Test wegen Zeitüberschreitung
            fehl, ist das Limit für dieses Modell zu knapp.
          </p>

          {test && (() => {
            // Drei Zustände: erfolgreich · erreichbar mit Hinweis · fehlgeschlagen.
            const hinweis = test.ok && !!test.warnung;
            const ton = hinweis
              ? { rahmen: "border-amber-300 bg-amber-50", text: "text-amber-800", titel: "Verbindung steht — mit Einschränkung" }
              : test.ok
                ? { rahmen: "border-emerald-200 bg-emerald-50", text: "text-emerald-700", titel: "Verbindung erfolgreich" }
                : { rahmen: "border-red-200 bg-red-50", text: "text-red-700", titel: "Verbindung fehlgeschlagen" };
            return (
              <div className={`mt-3 rounded-2xl border p-4 text-sm ${ton.rahmen}`}>
                <div className={`flex items-center gap-2 font-medium ${ton.text}`}>
                  {test.ok && !hinweis ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {ton.titel}
                  {typeof test.ms === "number" && <span className="font-normal text-muted">· {(test.ms / 1000).toFixed(1)} s{test.status ? ` · HTTP ${test.status}` : ""}</span>}
                </div>
                {test.reply && <p className="mt-1.5 text-ink-soft">Antwort ({test.model}): „{test.reply}"</p>}
                {test.warnung && <p className={`mt-1.5 break-words ${ton.text}`}>{test.warnung}</p>}
                {!test.ok && test.detail && <p className="mt-1.5 break-words text-red-700/90">{test.detail}</p>}
              </div>
            );
          })()}
        </div>
      </div>

      {smtp && (
        <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
          <h2 className="font-display text-xl font-semibold tracking-tight">E-Mail-Versand (SMTP)</h2>
          <p className="mt-1 text-sm text-muted">Für Blog-Abo-Bestätigungen und Newsletter. Leer lassen = Abos funktionieren ohne E-Mail-Bestätigung.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className={lbl}>SMTP-Host</label><input value={smtp.host} onChange={(e) => setSmtp({ ...smtp, host: e.target.value })} className={field} placeholder="smtp.example.de" /></div>
            <div><label className={lbl}>Port</label><input type="number" min={1} max={65535} value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: +e.target.value })} className={field} /></div>
            <div><label className={lbl}>Benutzer</label><input value={smtp.user} onChange={(e) => setSmtp({ ...smtp, user: e.target.value })} className={field} placeholder="mail@example.de" autoComplete="off" /></div>
            <div>
              <label className={lbl}>Passwort {smtp.passSet && <span className="normal-case text-emerald-600">· gesetzt</span>}</label>
              <input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} className={field} placeholder={smtp.passSet ? "•••• (leer = unverändert)" : "SMTP-Passwort"} autoComplete="off" />
            </div>
            <div className="sm:col-span-2"><label className={lbl}>Absender (From)</label><input value={smtp.from} onChange={(e) => setSmtp({ ...smtp, from: e.target.value })} className={field} placeholder='STUDIO//LOKAL <mail@example.de>' /></div>
          </div>
        </div>
      )}

      {automation && (
        <div className="rounded-3xl border border-line bg-surface p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><Workflow className="h-5 w-5" /></span>
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">Automatisierung (Activepieces)</h2>
              <p className="mt-0.5 text-sm text-muted">Kostenloser, selbst gehosteter Workflow-Baukasten — läuft als eigener Dienst neben dieser Website.</p>
            </div>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={automation.enabled}
              onChange={(e) => setAutomation({ ...automation, enabled: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Link im Admin-Bereich anzeigen
          </label>

          <div className="mt-3">
            <label className={lbl}>Adresse von Activepieces</label>
            <input
              value={automation.url}
              onChange={(e) => setAutomation({ ...automation, url: e.target.value })}
              className={field}
              placeholder="http://localhost:8080"
            />
          </div>

          {automation.enabled && automation.url && (
            <a
              href={automation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-line-strong bg-canvas px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-accent cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" /> Activepieces öffnen
            </a>
          )}

          <div className="mt-4 flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3.5 text-sm text-amber-900">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="leading-relaxed">
              Dieser Schalter zeigt oder versteckt nur den Link hier — er startet und stoppt Activepieces NICHT.
              Das geschieht bewusst getrennt über die Kommandozeile auf dem Server:{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">docker compose --profile automation up -d</code>{" "}
              zum Einschalten, <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">--profile automation down</code> zum
              Ausschalten. Ein Web-Knopf mit echter Docker-Kontrolle würde dieser Website Zugriff auf den Docker-Socket
              geben — das entspricht faktisch Root-Rechten auf dem ganzen Server.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Speichern
        </button>
        {msg && <span className="text-sm font-medium text-emerald-600">{msg}</span>}
      </div>

      {/* Bestätigung vor dem Speichern */}
      {confirm && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" onClick={() => setConfirm(false)}>
          <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="font-display text-lg font-semibold tracking-tight">Änderungen speichern?</h3>
              <button type="button" onClick={() => setConfirm(false)} aria-label="Abbrechen" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Die Einstellungen des Support-Assistenten werden aktualisiert.{" "}
              {ai.enabled ? "Der KI-Assistent ist danach aktiv." : "Der KI-Assistent bleibt deaktiviert (Fallback-Antworten)."}
              {clearKey && " Der gespeicherte API-Key wird entfernt."}
              {!ai.apiKeyEnabled && " Der API-Key ist deaktiviert und wird nicht mitgesendet."}
            </p>
            {endpointChanged && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
                <p className="text-sm font-medium text-amber-800">Der KI-Endpunkt wurde geändert — bitte mit Ihrem Admin-Passwort bestätigen:</p>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-ink outline-none focus:border-accent"
                  placeholder="Ihr Passwort"
                  autoComplete="current-password"
                />
              </div>
            )}
            {msg && msg !== "Gespeichert ✓" && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirm(false)} className="rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:border-ink cursor-pointer">Abbrechen</button>
              <button type="button" onClick={doSave} disabled={busy || (endpointChanged && adminPassword.length === 0)} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-ink disabled:opacity-50 cursor-pointer"><Check className="h-4 w-4" /> Speichern</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
