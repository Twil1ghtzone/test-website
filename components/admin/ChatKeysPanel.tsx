"use client";

import { useCallback, useEffect, useState } from "react";
import { KeyRound, Loader2, RefreshCw, Trash2, Check, AlertTriangle, X, Info } from "lucide-react";

type Master = { id: string; createdAt: string; rotations: number; fingerprint: string };
type Stats = { sessions: number; messages: number; oldest: string | null };

export default function ChatKeysPanel() {
  const [master, setMaster] = useState<Master | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rsaBits, setRsaBits] = useState(2048);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  /** Welche Aktion soll bestätigt werden? Beide sind nicht rückholbar. */
  const [confirmAction, setConfirmAction] = useState<"rotate" | "purge" | null>(null);
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/chatkeys", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setMaster(d.master);
      setStats(d.stats);
      setRsaBits(d.rsaBits);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function run() {
    if (!confirmAction) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/chatkeys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: confirmAction, adminPassword: password }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(d.error || "Fehlgeschlagen."); return; }

    setMsg(
      confirmAction === "rotate"
        ? `Neuer Master-Schlüssel ${d.id} — ${d.sessions} Sitzung${d.sessions === 1 ? "" : "en"} neu eingehüllt, keine Gespräche verloren.`
        : `${d.deleted} Chat-Sitzung${d.deleted === 1 ? "" : "en"} gelöscht und krypto-geschreddert.`
    );
    setConfirmAction(null);
    setPassword("");
    load();
    setTimeout(() => setMsg(""), 6000);
  }

  const datum = (s: string | null) => (s ? new Date(s).toLocaleString("de-DE") : "—");

  if (!master) {
    return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><KeyRound className="h-5 w-5" /></span>
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Chat-Verschlüsselung</h2>
          <p className="text-sm text-muted">Schlüsselkette des KI-Support-Chats — RSA-{rsaBits} über AES-256-GCM.</p>
        </div>
      </div>

      {msg && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <Check className="mt-0.5 h-4 w-4 shrink-0" /> <span>{msg}</span>
        </div>
      )}

      {/* Aktueller Schlüssel */}
      <div className="rounded-3xl border border-line bg-surface p-6">
        <h3 className="font-display text-lg font-semibold tracking-tight">Aktueller Master-Schlüssel</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="eyebrow text-muted">Kennung</dt>
            <dd className="mt-1 font-mono text-sm text-ink">{master.id}</dd>
          </div>
          <div>
            <dt className="eyebrow text-muted">Erzeugt am</dt>
            <dd className="mt-1 text-sm text-ink">{datum(master.createdAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="eyebrow text-muted">Fingerabdruck (SHA-256, gekürzt)</dt>
            <dd className="mt-1 break-all font-mono text-sm text-ink">{master.fingerprint}</dd>
            <p className="mt-1 text-xs text-muted">
              Zum Vergleich, ob noch derselbe Schlüssel im Einsatz ist. Der Schlüssel selbst wird nie angezeigt oder heruntergeladen.
            </p>
          </div>
          <div>
            <dt className="eyebrow text-muted">Bisherige Rotationen</dt>
            <dd className="mt-1 text-sm text-ink">{master.rotations}</dd>
          </div>
          <div>
            <dt className="eyebrow text-muted">Gespeicherte Gespräche</dt>
            <dd className="mt-1 text-sm text-ink">
              {stats?.sessions ?? 0} Sitzungen · {stats?.messages ?? 0} Nachrichten
            </dd>
          </div>
        </dl>
      </div>

      {/* Wie die Kette funktioniert */}
      <div className="rounded-3xl border border-line bg-surface/60 p-6">
        <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
          <Info className="h-4 w-4 text-accent" /> Wie die Schlüsselkette aufgebaut ist
        </h3>
        <ol className="mt-3 space-y-2 text-sm leading-relaxed text-ink-soft">
          <li><strong className="text-ink">1. SESSION_SECRET</strong> (Umgebungsvariable) leitet den Schlüssel ab, der den Master-Schlüssel einhüllt. Die Wurzel des Vertrauens liegt damit außerhalb der Datenbank.</li>
          <li><strong className="text-ink">2. Master-Schlüssel</strong> — hier verwaltbar. Hüllt die privaten RSA-Schlüssel aller Gespräche ein.</li>
          <li><strong className="text-ink">3. RSA-{rsaBits} je Gespräch</strong> — für jedes neue Gespräch wird ein eigenes Schlüsselpaar erzeugt. Der öffentliche Teil verschlüsselt den Inhalts-Schlüssel.</li>
          <li><strong className="text-ink">4. AES-256-GCM je Nachricht</strong> — der eigentliche Text, mit eigenem Initialisierungsvektor pro Nachricht.</li>
        </ol>
        <p className="mt-3 rounded-xl bg-canvas p-3 text-xs leading-relaxed text-muted">
          <strong className="text-ink-soft">Ehrliche Einordnung:</strong> RSA allein kann keine Chatnachrichten verschlüsseln
          (RSA-{rsaBits} schafft maximal 190 Byte) — deshalb verschlüsselt AES den Text und RSA nur den kurzen AES-Schlüssel,
          genau wie bei PGP oder TLS. Diese Kette verbirgt die Nachrichten <em>nicht</em> vor diesem Server: er muss sie
          lesen können, um sie der KI vorzulegen. Was sie leistet: Wer eine Kopie der Datenbankdatei erlangt, kann nichts
          lesen; der Master-Schlüssel lässt sich in Sekunden wechseln, ohne jede Nachricht neu zu verschlüsseln; und
          gelöschte Gespräche sind endgültig unlesbar.
        </p>
      </div>

      {/* Aktionen */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-line bg-surface p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight">
            <RefreshCw className="h-4 w-4 text-accent" /> Master-Schlüssel neu erzeugen
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Erzeugt einen neuen Master-Schlüssel und hüllt alle privaten Sitzungsschlüssel damit neu ein.
            <strong className="text-ink"> Laufende Gespräche bleiben lesbar.</strong> Sinnvoll als Routine, etwa nach
            einem Personalwechsel oder wenn ein Zugang kompromittiert war.
          </p>
          <button
            type="button" onClick={() => { setConfirmAction("rotate"); setErr(""); }}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" /> Neu erzeugen
          </button>
        </div>

        <div className="rounded-3xl border border-red-200 bg-red-50/50 p-6">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-red-800">
            <Trash2 className="h-4 w-4" /> Alle Chats löschen
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-red-900/80">
            Löscht alle {stats?.sessions ?? 0} Gespräche samt ihren privaten Schlüsseln.
            <strong> Danach sind sie endgültig unlesbar</strong> — auch mit Master-Schlüssel und Datenbankzugriff.
            Notbremse bei Verdacht auf Kompromittierung.
          </p>
          <button
            type="button" onClick={() => { setConfirmAction("purge"); setErr(""); }}
            disabled={!stats?.sessions}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-red-300 bg-surface px-5 py-2.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-50 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" /> Alles löschen
          </button>
        </div>
      </div>

      {/* Bestätigung mit Passwort */}
      {confirmAction && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-3xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <h3 className="font-display text-lg font-semibold tracking-tight">
                {confirmAction === "rotate" ? "Master-Schlüssel neu erzeugen?" : "Wirklich alle Chats löschen?"}
              </h3>
              <button type="button" onClick={() => setConfirmAction(null)} aria-label="Abbrechen" className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
            </div>

            <div className={`mt-3 flex items-start gap-2.5 rounded-2xl p-3.5 text-sm ${confirmAction === "purge" ? "bg-red-50 text-red-900" : "bg-amber-50 text-amber-900"}`}>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-relaxed">
                {confirmAction === "rotate"
                  ? `${stats?.sessions ?? 0} Sitzungen werden neu eingehüllt. Die Gespräche selbst bleiben erhalten und lesbar. Der alte Master-Schlüssel wird verworfen.`
                  : `${stats?.sessions ?? 0} Gespräche mit insgesamt ${stats?.messages ?? 0} Nachrichten werden gelöscht. Das lässt sich nicht rückgängig machen — auch nicht mit einem Backup, denn Chats sind bewusst nicht im Backup enthalten.`}
              </p>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-ink">Ihr Admin-Passwort</span>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-line bg-canvas px-4 py-2.5 text-ink outline-none focus:border-accent"
                placeholder="Zur Bestätigung"
              />
            </label>

            {err && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setConfirmAction(null)} className="rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:border-ink cursor-pointer">Abbrechen</button>
              <button
                type="button" onClick={run} disabled={busy || password.length === 0}
                className={`inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-medium text-white disabled:opacity-50 cursor-pointer ${confirmAction === "purge" ? "bg-red-600 hover:bg-red-700" : "bg-accent hover:bg-accent-ink"}`}
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {confirmAction === "rotate" ? "Neu erzeugen" : "Endgültig löschen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
