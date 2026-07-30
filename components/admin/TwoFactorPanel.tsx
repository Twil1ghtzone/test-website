"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Loader2, Copy, Check, KeyRound, RefreshCw, AlertTriangle } from "lucide-react";

type Status = { enabled: boolean; pending: boolean; recoveryLeft: number };

export default function TwoFactorPanel() {
  const [st, setSt] = useState<Status | null>(null);
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"idle" | "disable">("idle");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/2fa", { cache: "no-store" });
    if (r.ok) setSt(await r.json());
  }, []);
  useEffect(() => { load(); }, [load]);

  async function call(action: string, extra: Record<string, unknown> = {}) {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/2fa", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: d.error || "Fehler" }); return null; }
    return d;
  }

  async function startSetup() {
    const d = await call("setup");
    if (d) { setSetup({ secret: d.secret, uri: d.uri }); setCodes(null); setCode(""); }
  }
  async function activate() {
    const d = await call("activate", { code });
    if (d) { setCodes(d.recoveryCodes); setSetup(null); setCode(""); setMsg({ ok: true, text: "2FA ist aktiv ✓" }); load(); }
  }
  async function disable() {
    const d = await call("disable", { password: pw, code });
    if (d) { setPw(""); setCode(""); setMode("idle"); setMsg({ ok: true, text: "2FA deaktiviert." }); load(); }
  }
  async function regenerate() {
    const d = await call("regenerate", { code });
    if (d) { setCodes(d.recoveryCodes); setCode(""); setMsg({ ok: true, text: "Neue Codes erzeugt — alte sind ungültig." }); load(); }
  }

  if (!st) return <div className="rounded-3xl border border-line bg-surface p-6 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-accent" /></div>;

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";
  // QR ohne externe Library/Netzwerk: Secret zum Abtippen + otpauth-Link.
  return (
    <div className="rounded-3xl border border-line bg-surface p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          {st.enabled ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldOff className="h-5 w-5 text-muted" />}
          Zwei-Faktor-Authentifizierung
        </h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${st.enabled ? "bg-emerald-100 text-emerald-700" : "bg-surface-2 text-ink-soft"}`}>
          {st.enabled ? "aktiv" : "inaktiv"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Zusätzlicher Schutz beim Login mit einer Authenticator-App (Google Authenticator, Aegis, 1Password …).
        {st.enabled && st.recoveryLeft > 0 && <> Noch <b>{st.recoveryLeft}</b> Wiederherstellungs-Codes übrig.</>}
      </p>

      {/* Einmalige Anzeige der Wiederherstellungs-Codes */}
      {codes && (
        <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900"><AlertTriangle className="h-4 w-4" /> Wiederherstellungs-Codes — jetzt sichern!</p>
          <p className="mt-1 text-xs text-amber-800">Jeder Code funktioniert genau einmal, falls Sie Ihr Handy verlieren. Sie werden <b>nur jetzt</b> angezeigt.</p>
          <div className="mt-3 grid grid-cols-2 gap-1.5 font-mono text-sm text-ink">
            {codes.map((c) => <span key={c} className="rounded bg-surface px-2 py-1">{c}</span>)}
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(codes.join("\n")); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-white/60 px-3.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-white cursor-pointer">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Kopiert" : "Alle kopieren"}
          </button>
        </div>
      )}

      {/* Einrichtung */}
      {setup && (
        <div className="mt-4 rounded-2xl border border-line bg-canvas p-4">
          <p className="eyebrow text-muted">Schritt 1 — In der App hinzufügen</p>
          <p className="mt-2 text-sm text-ink-soft">Secret manuell eintragen (Typ: zeitbasiert / TOTP):</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="select-all break-all rounded-lg bg-surface px-3 py-2 font-mono text-sm text-ink">{setup.secret}</code>
            <button onClick={() => { navigator.clipboard?.writeText(setup.secret); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs font-medium text-ink hover:border-ink cursor-pointer">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Kopieren
            </button>
            <a href={setup.uri} className="text-xs font-medium text-accent hover:text-accent-ink cursor-pointer">Mit App öffnen →</a>
          </div>

          <p className="mt-4 eyebrow text-muted">Schritt 2 — Code bestätigen</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="123456"
              onKeyDown={(e) => { if (e.key === "Enter" && code.length === 6) activate(); }}
              className={`${field} w-36 text-center font-mono text-lg tracking-widest`} />
            <button onClick={activate} disabled={busy || code.length !== 6}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-ink disabled:opacity-50 cursor-pointer">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Aktivieren
            </button>
          </div>
        </div>
      )}

      {/* Deaktivieren */}
      {mode === "disable" && (
        <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">2FA deaktivieren</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Ihr Passwort" autoComplete="current-password" className={field} />
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="2FA-Code" className={`${field} font-mono tracking-widest`} />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => { setMode("idle"); setPw(""); setCode(""); }} className="rounded-full border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink hover:border-ink cursor-pointer">Abbrechen</button>
            <button onClick={disable} disabled={busy || !pw} className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />} Deaktivieren
            </button>
          </div>
        </div>
      )}

      {/* Aktionen */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!st.enabled && !setup && (
          <button onClick={startSetup} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} 2FA einrichten
          </button>
        )}
        {st.enabled && mode === "idle" && (
          <>
            <div className="flex items-center gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="2FA-Code" className={`${field} w-32 font-mono tracking-widest`} />
              <button onClick={regenerate} disabled={busy || code.length !== 6} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:border-ink disabled:opacity-50 cursor-pointer">
                <RefreshCw className="h-4 w-4" /> Neue Codes
              </button>
            </div>
            <button onClick={() => setMode("disable")} className="text-sm font-medium text-red-600 hover:text-red-700 cursor-pointer">Deaktivieren</button>
          </>
        )}
        {msg && <span className={`text-sm ${msg.ok ? "text-emerald-600" : "text-red-600"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
