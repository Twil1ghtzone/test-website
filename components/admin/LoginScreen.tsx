"use client";

import { useState } from "react";
import { ShieldCheck, LogIn, Loader2, Eye, EyeOff } from "lucide-react";

/**
 * Anmeldemaske des Admin-Bereichs, inklusive zweitem Schritt für 2FA.
 *
 * Der Ablauf ist bewusst zweistufig: Stimmt das Passwort, der Code aber
 * nicht (oder fehlt er), antwortet der Server mit `needTotp` und setzt
 * KEIN Sitzungs-Cookie. Erst ein gültiger Code erzeugt eine Sitzung —
 * siehe app/api/auth/login/route.ts.
 */
export default function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // 2FA: Server antwortet mit needTotp → zweiter Schritt mit Code.
  const [needTotp, setNeedTotp] = useState(false);
  const [code, setCode] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, ...(needTotp ? { code } : {}) }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.needTotp) { setNeedTotp(true); setCode(""); }
        setErr(d.error || "Anmeldung fehlgeschlagen.");
        setBusy(false);
        return;
      }
      onSuccess();
    } catch {
      setErr("Verbindungsfehler."); setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 shadow-[0_24px_60px_-24px_rgba(33,28,23,0.3)]">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-white"><ShieldCheck className="h-6 w-6" /></span>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">Admin-Anmeldung</h1>
        <p className="mt-1 text-sm text-ink-soft">Geschützter Bereich.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="u" className="mb-1.5 block eyebrow text-muted">Benutzername</label>
            <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username"
              className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface" placeholder="admin" />
          </div>
          <div>
            <label htmlFor="p" className="mb-1.5 block eyebrow text-muted">Passwort</label>
            <div className="relative">
              <input id="p" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                className="w-full rounded-xl border border-line bg-canvas px-4 py-3 pr-11 text-ink outline-none focus:border-accent focus:bg-surface" placeholder="••••••••" />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer">
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {needTotp && (
            <div className="rounded-xl border border-accent/40 bg-accent-soft/40 p-3">
              <label htmlFor="totp" className="mb-1.5 block eyebrow text-accent-ink">Code aus der Authenticator-App</label>
              <input
                id="totp"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                placeholder="123456"
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-ink outline-none focus:border-accent"
              />
              <p className="mt-1.5 text-xs text-muted">Kein Zugriff aufs Handy? Einen Wiederherstellungs-Code eingeben.</p>
            </div>
          )}
          {err && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />} {needTotp ? "Code bestätigen" : "Anmelden"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">Erststart: <span className="font-mono">admin</span> / <span className="font-mono">test1234</span></p>
      </div>
    </main>
  );
}
