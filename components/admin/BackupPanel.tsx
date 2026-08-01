"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, Download, Upload, Loader2, Check, AlertTriangle, ShieldAlert, FileArchive, Image as ImageIcon, ShieldCheck, HardDrive, Copy } from "lucide-react";

type Col = { file: string; label: string; count: number; bytes: number };
type Inspect = {
  version: number; exportedAt: string | null; collections: string[];
  counts: Record<string, number>; uploads: number; labels: Record<string, string>;
};
type Snapshot = { name: string; bytes: number; createdAt: string };
type Raid = { mirrorConfigured: boolean; mirrorReachable: boolean; snapshots: Snapshot[]; mirrorSnapshots: Snapshot[] };

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupPanel() {
  const [cols, setCols] = useState<Col[] | null>(null);
  const [uploadCount, setUploadCount] = useState(0);
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [raid, setRaid] = useState<Raid | null>(null);
  const [snapBusy, setSnapBusy] = useState(false);

  // Export-Auswahl
  const [selected, setSelected] = useState<string[]>([]);
  const [withUploads, setWithUploads] = useState(true);

  // Import
  const [file, setFile] = useState<File | null>(null);
  const [blob, setBlob] = useState<unknown>(null);
  const [inspect, setInspect] = useState<Inspect | null>(null);
  const [importOnly, setImportOnly] = useState<string[]>([]);
  const [mode, setMode] = useState<"merge" | "overwrite">("merge");
  const [adminPw, setAdminPw] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/backup", { cache: "no-store" });
    if (r.ok) {
      const d = await r.json();
      setCols(d.collections);
      setUploadCount(d.uploads);
      setSelected(d.collections.map((c: Col) => c.file)); // Standard: alles
      setRaid(d.raid);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Gespiegelte Sicherung: dieselbe verschlüsselte Sicherung wie beim Export,
  // aber vom Server selbst auf zwei Verzeichnisse geschrieben statt nur
  // heruntergeladen — schützt gegen den Ausfall EINES Datenträgers.
  async function snapshotBackup() {
    if (pass.length < 8) { setMsg({ ok: false, text: "Passphrase: mindestens 8 Zeichen." }); return; }
    setSnapBusy(true); setMsg(null);
    const r = await fetch("/api/admin/backup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "snapshot", passphrase: pass, collections: selected, includeUploads: withUploads }),
    });
    const d = await r.json().catch(() => ({}));
    setSnapBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: d.error || "Gespiegelte Sicherung fehlgeschlagen." }); return; }
    setMsg({
      ok: true,
      text: `Gespiegelte Sicherung erstellt ✓ — primär ${d.primaryOk ? "gesichert" : "fehlgeschlagen"}${
        d.mirrorConfigured ? `, Spiegel ${d.mirrorOk ? "gesichert" : `fehlgeschlagen (${d.mirrorError || "unbekannt"})`}` : " (kein zweiter Speicherort eingerichtet)"
      }.`,
    });
    load();
  }

  const toggle = (list: string[], set: (v: string[]) => void, f: string) =>
    set(list.includes(f) ? list.filter((x) => x !== f) : [...list, f]);

  async function exportBackup() {
    if (pass.length < 8) { setMsg({ ok: false, text: "Passphrase: mindestens 8 Zeichen." }); return; }
    if (selected.length === 0) { setMsg({ ok: false, text: "Bitte mindestens eine Sammlung wählen." }); return; }
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/backup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "export", passphrase: pass, collections: selected, includeUploads: withUploads }),
    });
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: (await r.json()).error || "Fehler" }); return; }
    const { backup } = await r.json();
    // Download anstoßen (Anchor im DOM → funktioniert in allen Browsern)
    const b = new Blob([JSON.stringify(backup)], { type: "application/octet-stream" });
    const url = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = url;
    a.download = `studio-lokal-backup-${new Date().toISOString().slice(0, 10)}.slbak`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setMsg({ ok: true, text: `Backup heruntergeladen ✓ (${selected.length} Sammlungen${withUploads ? " + Bilder" : ""})` });
  }

  // Datei wählen → sofort entschlüsseln & Inhalt anzeigen (schreibt noch nichts).
  async function inspectFile(f: File) {
    setFile(f); setInspect(null); setBlob(null); setMsg(null);
    if (pass.length < 8) { setMsg({ ok: false, text: "Bitte zuerst die Passphrase des Backups eingeben." }); return; }
    setBusy(true);
    try {
      const parsed = JSON.parse(await f.text());
      const r = await fetch("/api/admin/backup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "inspect", passphrase: pass, backup: parsed }),
      });
      const d = await r.json();
      setBusy(false);
      if (!r.ok) { setMsg({ ok: false, text: d.error || "Konnte nicht gelesen werden." }); return; }
      setBlob(parsed);
      setInspect(d);
      setImportOnly(d.collections);
    } catch {
      setBusy(false);
      setMsg({ ok: false, text: "Datei ist keine gültige Backup-Datei." });
    }
  }

  async function importBackup() {
    if (!blob) { setMsg({ ok: false, text: "Bitte zuerst eine Backup-Datei prüfen." }); return; }
    if (mode === "overwrite" && !adminPw) { setMsg({ ok: false, text: "Überschreiben erfordert Ihr Admin-Passwort." }); return; }
    if (mode === "overwrite" && !confirm("ÜBERSCHREIBEN ersetzt die gewählten Sammlungen vollständig. Fortfahren?")) return;
    setBusy(true); setMsg(null);
    const r = await fetch("/api/admin/backup", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "import", passphrase: pass, backup: blob, mode,
        only: importOnly, includeUploads: withUploads,
        ...(mode === "overwrite" ? { adminPassword: adminPw } : {}),
      }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: d.error || "Import fehlgeschlagen." }); return; }
    setAdminPw("");
    setMsg({
      ok: true,
      text: `${d.mode === "overwrite" ? "Überschrieben" : "Importiert"} ✓ — ${d.restoredCollections} Sammlungen, ${d.restoredUploads} Dateien.${d.details?.length ? " " + d.details.join(", ") : ""} Ggf. neu anmelden.`,
    });
    load();
  }

  if (!cols) return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";

  return (
    <div className="space-y-6">
      {/* Passphrase — gilt für Export UND Import */}
      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"><Database className="h-5 w-5 text-accent" /> Verschlüsseltes Backup</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Sichert die gewählten Daten in einer mit <b>AES-256-GCM</b> verschlüsselten Datei (<code className="rounded bg-canvas px-1">.slbak</code>).
          Ohne dieselbe Passphrase ist die Datei nicht lesbar — bitte sicher aufbewahren.
        </p>
        <div className="mt-5 max-w-md">
          <label className="mb-1.5 block eyebrow text-muted">Passphrase (min. 8 Zeichen)</label>
          <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} className={field} placeholder="Geheime Passphrase" autoComplete="off" />
        </div>
      </div>

      {/* ── EXPORT mit Auswahl ── */}
      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"><Download className="h-5 w-5 text-accent" /> Backup erstellen</h3>
          <div className="flex gap-2 text-xs">
            <button onClick={() => setSelected(cols.map((c) => c.file))} className="rounded-full border border-line-strong px-3 py-1 font-medium text-ink hover:border-ink cursor-pointer">alle</button>
            <button onClick={() => setSelected([])} className="rounded-full border border-line-strong px-3 py-1 font-medium text-ink hover:border-ink cursor-pointer">keine</button>
          </div>
        </div>
        <p className="mt-1 text-sm text-muted">Wählen Sie, was gesichert werden soll.</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {cols.map((c) => (
            <label key={c.file} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${selected.includes(c.file) ? "border-accent bg-accent-soft/40" : "border-line bg-canvas hover:border-line-strong"}`}>
              <input type="checkbox" checked={selected.includes(c.file)} onChange={() => toggle(selected, setSelected, c.file)} className="h-4 w-4 accent-[var(--color-accent)]" />
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{c.label}</span>
              <span className="shrink-0 text-xs text-muted">{c.count} · {fmtBytes(c.bytes)}</span>
            </label>
          ))}
          <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors sm:col-span-2 ${withUploads ? "border-accent bg-accent-soft/40" : "border-line bg-canvas hover:border-line-strong"}`}>
            <input type="checkbox" checked={withUploads} onChange={(e) => setWithUploads(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
            <ImageIcon className="h-4 w-4 shrink-0 text-accent" />
            <span className="min-w-0 flex-1 font-medium text-ink">Hochgeladene Bilder & Dateien</span>
            <span className="shrink-0 text-xs text-muted">{uploadCount} Dateien</span>
          </label>
        </div>

        <button onClick={exportBackup} disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-white transition-colors hover:bg-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />} Backup herunterladen
        </button>
      </div>

      {/* ── RAID-Schutz: gespiegelte Sicherung auf dem Server ── */}
      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"><ShieldCheck className="h-5 w-5 text-accent" /> RAID-Schutz (gespiegelte Sicherung)</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Echtes RAID entsteht auf Platten-/Volume-Ebene — das kann diese App nicht herstellen. Was sie kann:
          bei jedem Klick dieselbe verschlüsselte Sicherung automatisch auf <b>zwei unabhängige Speicherorte</b> schreiben,
          damit der Ausfall eines Datenträgers nicht die einzige Kopie mitreißt.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm">
            <HardDrive className="h-4 w-4 shrink-0 text-accent" />
            <span className="min-w-0 flex-1 font-medium text-ink">Primärer Speicherort</span>
            <span className="shrink-0 text-xs text-muted">{raid?.snapshots.length ?? 0} Sicherung{raid?.snapshots.length === 1 ? "" : "en"}</span>
          </div>
          <div className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm ${raid?.mirrorConfigured ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
            <Copy className={`h-4 w-4 shrink-0 ${raid?.mirrorConfigured ? "text-emerald-600" : "text-amber-600"}`} />
            <span className="min-w-0 flex-1 font-medium text-ink">Gespiegelter Speicherort</span>
            <span className="shrink-0 text-xs text-muted">
              {raid?.mirrorConfigured ? `${raid.mirrorSnapshots.length} Sicherung${raid.mirrorSnapshots.length === 1 ? "" : "en"}` : "nicht eingerichtet"}
            </span>
          </div>
        </div>
        {!raid?.mirrorConfigured && (
          <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-amber-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Kein zweiter Speicherort eingerichtet — die Umgebungsvariable <code className="rounded bg-canvas px-1">BACKUP_MIRROR_DIR</code> zeigt
            auf ein zweites Verzeichnis (idealerweise ein eigenes Volume/eine eigene Platte). Ohne sie läuft die Sicherung nur einfach.
          </p>
        )}

        <button onClick={snapshotBackup} disabled={snapBusy} className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent px-6 py-3 font-medium text-accent-ink transition-colors hover:bg-accent-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer">
          {snapBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />} Jetzt gespiegelt sichern
        </button>

        {raid && raid.snapshots.length > 0 && (
          <div className="mt-4 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line bg-canvas p-3 text-xs">
            {raid.snapshots.slice(0, 8).map((s) => (
              <div key={s.name} className="flex items-center justify-between gap-3 text-ink-soft">
                <span className="truncate">{new Date(s.createdAt).toLocaleString("de-DE")}</span>
                <span className="shrink-0 tabular-nums text-muted">{fmtBytes(s.bytes)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── IMPORT mit Prüfung, Auswahl und Modus ── */}
      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"><Upload className="h-5 w-5 text-accent" /> Backup laden</h3>
        <p className="mt-1 text-sm text-muted">Passphrase oben eingeben, Datei wählen — der Inhalt wird zuerst geprüft und angezeigt.</p>

        <input type="file" accept=".slbak,application/json" onChange={(e) => { const f = e.target.files?.[0]; if (f) inspectFile(f); }}
          className="mt-4 w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-accent-soft file:px-4 file:py-2 file:text-sm file:font-medium file:text-accent-ink" />

        {inspect && (
          <div className="mt-5 rounded-2xl border border-line bg-canvas p-4">
            <p className="flex items-center gap-2 eyebrow text-muted"><FileArchive className="h-3.5 w-3.5" /> Inhalt der Datei {file?.name ? `(${file.name})` : ""}</p>
            <p className="mt-2 text-sm text-ink-soft">
              Format v{inspect.version}
              {inspect.exportedAt && <> · erstellt am {new Date(inspect.exportedAt).toLocaleString("de-DE")}</>}
              {inspect.uploads > 0 && <> · {inspect.uploads} Dateien</>}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {inspect.collections.map((f) => (
                <label key={f} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2 text-sm transition-colors ${importOnly.includes(f) ? "border-accent bg-accent-soft/40" : "border-line bg-surface hover:border-line-strong"}`}>
                  <input type="checkbox" checked={importOnly.includes(f)} onChange={() => toggle(importOnly, setImportOnly, f)} className="h-4 w-4 accent-[var(--color-accent)]" />
                  <span className="min-w-0 flex-1 truncate text-ink">{inspect.labels[f] || f}</span>
                  <span className="shrink-0 text-xs text-muted">{inspect.counts?.[f] ?? "?"}</span>
                </label>
              ))}
            </div>

            {/* Modus-Wahl */}
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <button onClick={() => setMode("merge")} className={`rounded-2xl border p-3.5 text-left transition-colors cursor-pointer ${mode === "merge" ? "border-accent bg-accent-soft/40" : "border-line bg-surface hover:border-line-strong"}`}>
                <span className="block text-sm font-semibold text-ink">Nur importieren (empfohlen)</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">Fügt fehlende Einträge hinzu. Bestehende Daten bleiben unangetastet.</span>
              </button>
              <button onClick={() => setMode("overwrite")} className={`rounded-2xl border p-3.5 text-left transition-colors cursor-pointer ${mode === "overwrite" ? "border-red-400 bg-red-50" : "border-line bg-surface hover:border-line-strong"}`}>
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink"><ShieldAlert className="h-4 w-4 text-red-600" /> Alles überschreiben</span>
                <span className="mt-0.5 block text-xs leading-snug text-muted">Ersetzt die gewählten Sammlungen vollständig. Erfordert Admin-Passwort.</span>
              </button>
            </div>

            {mode === "overwrite" && (
              <div className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3">
                <label className="flex items-center gap-2 text-sm font-medium text-red-800"><AlertTriangle className="h-4 w-4" /> Admin-Passwort zum Überschreiben</label>
                <input type="password" value={adminPw} onChange={(e) => setAdminPw(e.target.value)} autoComplete="current-password" placeholder="Ihr Passwort"
                  className="mt-2 w-full rounded-xl border border-line bg-surface px-4 py-2.5 text-ink outline-none focus:border-accent" />
              </div>
            )}

            <button onClick={importBackup} disabled={busy || importOnly.length === 0}
              className={`mt-4 inline-flex items-center gap-2 rounded-full px-6 py-3 font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 cursor-pointer ${mode === "overwrite" ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500" : "bg-accent hover:bg-accent-ink focus-visible:ring-accent"}`}>
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
              {mode === "overwrite" ? "Endgültig überschreiben" : "Importieren"}
            </button>
          </div>
        )}
      </div>

      {msg && (
        <p className={`rounded-xl border px-4 py-3 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-700"}`}>{msg.text}</p>
      )}
    </div>
  );
}
