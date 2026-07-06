"use client";

import { useState } from "react";
import { Database, Download, Upload } from "lucide-react";

export default function BackupPanel() {
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [file, setFile] = useState<File | null>(null);

  async function exportBackup() {
    if (pass.length < 8) { setMsg("Passphrase: mindestens 8 Zeichen."); return; }
    setBusy(true); setMsg("");
    const r = await fetch("/api/admin/backup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "export", passphrase: pass }),
    });
    setBusy(false);
    if (!r.ok) { setMsg((await r.json()).error || "Fehler"); return; }
    const { backup } = await r.json();
    const blob = new Blob([JSON.stringify(backup)], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studio-lokal-backup-${new Date().toISOString().slice(0, 10)}.slbak`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg("Verschlüsseltes Backup heruntergeladen ✓");
  }

  async function importBackup() {
    if (!file) { setMsg("Bitte Backup-Datei wählen."); return; }
    if (pass.length < 8) { setMsg("Passphrase: mindestens 8 Zeichen."); return; }
    if (!confirm("Der Import stellt das KOMPLETTE System aus dem Backup wieder her und überschreibt alle aktuellen Daten (inkl. Bilder). Fortfahren?")) return;
    setBusy(true); setMsg("");
    try {
      const backup = JSON.parse(await file.text());
      const r = await fetch("/api/admin/backup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", passphrase: pass, backup }),
      });
      setBusy(false);
      const d = await r.json().catch(() => ({}));
      setMsg(r.ok
        ? `Wiederhergestellt ✓ — ${d.restoredCollections ?? 0} Sammlungen, ${d.restoredUploads ?? 0} Dateien. Bitte ggf. neu anmelden.`
        : d.error || "Import fehlgeschlagen.");
    } catch {
      setBusy(false); setMsg("Datei konnte nicht gelesen werden.");
    }
  }

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"><Database className="h-5 w-5 text-accent" /> Verschlüsseltes Backup</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Sichert das <b>komplette System</b> — Benutzer, Anfragen, Blog, Bewertungen, Rechnungen, Tickets,
          Aufträge, Finanzen, Team-Chat, Aktivitätslog, Einstellungen <b>und alle hochgeladenen Bilder</b> —
          in einer passwortgeschützten Datei (AES-256-GCM). Nur mit derselben Passphrase wieder
          importierbar — bitte sicher aufbewahren.
        </p>
        <div className="mt-5 max-w-md">
          <label className="mb-1.5 block eyebrow text-muted">Passphrase (min. 8 Zeichen)</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className={field} placeholder="Geheime Passphrase" autoComplete="off" />
        </div>
        <div className="mt-5">
          <button onClick={exportBackup} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60 cursor-pointer"><Download className="h-5 w-5" /> Backup herunterladen</button>
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"><Upload className="h-5 w-5 text-accent" /> Backup importieren</h2>
        <p className="mt-2 text-sm text-ink-soft">Datei wählen, dieselbe Passphrase oben eingeben und importieren.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <input type="file" accept=".slbak,application/json" onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-ink" />
          <button onClick={importBackup} disabled={busy} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-6 py-3 font-medium text-ink transition-colors hover:border-ink disabled:opacity-60 cursor-pointer"><Upload className="h-5 w-5" /> Importieren</button>
        </div>
      </div>

      {msg && <p className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink">{msg}</p>}
    </div>
  );
}
