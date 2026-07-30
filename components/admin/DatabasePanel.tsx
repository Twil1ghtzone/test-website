"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Database, RotateCcw, AlertTriangle, X, Check, Zap } from "lucide-react";

type Col = { file: string; label: string; count: number; bytes: number };

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function DatabasePanel({ isAdmin }: { isAdmin: boolean }) {
  const [cols, setCols] = useState<Col[] | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/database", { cache: "no-store" });
    if (r.ok) setCols((await r.json()).collections);
  }, []);
  useEffect(() => { load(); }, [load]);

  function toggle(file: string) {
    setSelected((s) => (s.includes(file) ? s.filter((f) => f !== file) : [...s, file]));
  }

  async function doReset() {
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/database", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collections: selected, password }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: d.error || "Zurücksetzen fehlgeschlagen." }); return; }
    setConfirm(false); setPassword(""); setSelected([]);
    setMsg({ ok: true, text: d.usersReset ? "Zurückgesetzt ✓ — Benutzer wurden geleert: nach dem nächsten Abmelden gilt wieder admin / test1234." : "Zurückgesetzt ✓" });
    load();
  }

  if (!cols) return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;

  const totalBytes = cols.reduce((s, c) => s + c.bytes, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><Database className="h-5 w-5" /></span>
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Datenbank</h2>
          <p className="text-sm text-muted">{cols.length} Sammlungen · {fmtBytes(totalBytes)} gesamt</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-line bg-canvas p-4 text-sm text-ink-soft">
        <Zap className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <p>
          Alle Lesezugriffe laufen über einen <b>In-Memory-Cache</b> (kein Disk-I/O pro Anfrage), Schreibvorgänge sind
          <b> atomar</b> (temp-Datei + rename) — auch bei vielen parallelen Anfragen entstehen keine halben Dateien.
          Die Daten liegen im Docker-Volume und überleben Container-Neustarts.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-surface">
        {cols.map((c, i) => (
          <label key={c.file} className={`flex cursor-pointer items-center gap-3 p-4 transition-colors hover:bg-canvas ${i > 0 ? "border-t border-line" : ""}`}>
            {isAdmin && (
              <input type="checkbox" checked={selected.includes(c.file)} onChange={() => toggle(c.file)} className="h-4 w-4 accent-[var(--color-accent)]" />
            )}
            <div className="min-w-0 flex-1">
              <span className="block font-medium text-ink">{c.label}</span>
              <span className="font-mono text-xs text-muted">{c.file}</span>
            </div>
            <span className="text-sm text-ink-soft">{c.count} Einträge</span>
            <span className="w-20 text-right text-sm text-muted">{fmtBytes(c.bytes)}</span>
          </label>
        ))}
      </div>

      {msg && (
        <p className={`rounded-xl border px-4 py-3 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-700"}`}>{msg.text}</p>
      )}

      {isAdmin ? (
        <button
          onClick={() => setConfirm(true)}
          disabled={selected.length === 0}
          className="inline-flex items-center gap-2 rounded-full border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 cursor-pointer"
        >
          <RotateCcw className="h-4 w-4" /> Ausgewählte zurücksetzen ({selected.length})
        </button>
      ) : (
        <p className="text-sm text-muted">Zurücksetzen ist der Admin-Rolle vorbehalten.</p>
      )}

      {confirm && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" onClick={() => setConfirm(false)}>
          <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-100 text-red-600"><AlertTriangle className="h-5 w-5" /></span>
              <button onClick={() => setConfirm(false)} aria-label="Abbrechen" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">Unwiderruflich zurücksetzen?</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Folgende Sammlungen werden <b>endgültig gelöscht</b>:{" "}
              {cols.filter((c) => selected.includes(c.file)).map((c) => c.label).join(", ")}.
              {selected.includes("users.json") && <> Beim Reset der Benutzer gilt danach wieder <span className="font-mono">admin / test1234</span>.</>}
              {" "}Tipp: vorher ein Backup exportieren.
            </p>
            <label className="mt-4 block eyebrow text-muted">Zur Bestätigung: Ihr Passwort</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent" placeholder="••••••••" autoComplete="current-password" />
            {msg && !msg.ok && <p className="mt-2 text-sm text-red-600">{msg.text}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirm(false)} className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium text-ink hover:border-ink cursor-pointer">Abbrechen</button>
              <button onClick={doReset} disabled={busy || password.length === 0} className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60 cursor-pointer">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Endgültig zurücksetzen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
