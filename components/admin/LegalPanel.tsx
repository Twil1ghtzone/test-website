"use client";

import { useCallback, useEffect, useState } from "react";
import { Scale, Loader2, Save, Check, X, AlertTriangle, Phone, FileText } from "lucide-react";

type Content = {
  companyName: string; email: string; phone: string; region: string; address: string;
  footerNote: string; impressum: string; datenschutz: string; agb: string;
};

export default function LegalPanel() {
  const [c, setC] = useState<Content | null>(null);
  const [tab, setTab] = useState<"kontakt" | "impressum" | "datenschutz" | "agb">("kontakt");
  const [confirm, setConfirm] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/legal", { cache: "no-store" });
    if (r.ok) setC((await r.json()).content);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!c) return;
    setBusy(true); setErr("");
    const r = await fetch("/api/admin/legal", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, adminPassword: pw }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(d.error || "Speichern fehlgeschlagen."); return; }
    setConfirm(false); setPw(""); setMsg("Gespeichert ✓");
    setTimeout(() => setMsg(""), 2500);
    load();
  }

  if (!c) return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";
  const lbl = "mb-1.5 block eyebrow text-muted";
  const area = `${field} resize-y font-mono text-sm leading-relaxed`;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><Scale className="h-5 w-5" /></span>
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Rechtstexte & Kontakt</h2>
          <p className="text-sm text-muted">Impressum, Datenschutz, AGB und die Kontaktdaten für Footer & Kontaktseite. Speichern erfordert Ihr Admin-Passwort.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 rounded-full border border-line bg-surface p-1">
        {([["kontakt", "Kontakt & Footer"], ["impressum", "Impressum"], ["datenschutz", "Datenschutz"], ["agb", "AGB (optional)"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${tab === k ? "bg-accent text-white" : "text-ink-soft hover:bg-canvas"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "kontakt" && (
        <div className="rounded-3xl border border-line bg-surface p-6">
          <h3 className="flex items-center gap-2 eyebrow text-muted"><Phone className="h-3.5 w-3.5" /> Wird sitewide verwendet (Footer, Kontaktseite, Support)</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><label className={lbl}>Firmenname</label><input value={c.companyName} onChange={(e) => setC({ ...c, companyName: e.target.value })} className={field} /></div>
            <div><label className={lbl}>Einsatzgebiet / Region</label><input value={c.region} onChange={(e) => setC({ ...c, region: e.target.value })} className={field} /></div>
            <div><label className={lbl}>E-Mail</label><input type="email" value={c.email} onChange={(e) => setC({ ...c, email: e.target.value })} className={field} /></div>
            <div><label className={lbl}>Telefon</label><input value={c.phone} onChange={(e) => setC({ ...c, phone: e.target.value })} className={field} /></div>
            <div className="sm:col-span-2"><label className={lbl}>Adresse (mehrzeilig)</label><textarea rows={3} value={c.address} onChange={(e) => setC({ ...c, address: e.target.value })} className={`${field} resize-none`} /></div>
            <div className="sm:col-span-2"><label className={lbl}>Footer-Notiz</label><input value={c.footerNote} onChange={(e) => setC({ ...c, footerNote: e.target.value })} className={field} /></div>
          </div>
        </div>
      )}

      {tab !== "kontakt" && (
        <div className="rounded-3xl border border-line bg-surface p-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 eyebrow text-muted"><FileText className="h-3.5 w-3.5" /> Markdown — erscheint auf /{tab}</h3>
            <a href={`/${tab}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-accent hover:text-accent-ink cursor-pointer">Seite ansehen →</a>
          </div>
          <textarea
            rows={20}
            value={tab === "impressum" ? c.impressum : tab === "datenschutz" ? c.datenschutz : c.agb}
            onChange={(e) => setC({ ...c, [tab]: e.target.value } as Content)}
            className={`mt-3 ${area}`}
            placeholder={tab === "agb" ? "Leer lassen, wenn keine AGB benötigt werden — die Seite wird dann nicht verlinkt." : "## Überschrift\n\nText…"}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => { setErr(""); setConfirm(true); }} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-white hover:bg-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer">
          <Save className="h-5 w-5" /> Speichern
        </button>
        {msg && <span className="text-sm font-medium text-emerald-600">{msg}</span>}
        {err && !confirm && <span className="text-sm text-red-600">{err}</span>}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[130] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" onClick={() => setConfirm(false)}>
          <div className="max-h-[90dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-3xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-100 text-amber-600"><AlertTriangle className="h-5 w-5" /></span>
              <button onClick={() => setConfirm(false)} aria-label="Abbrechen" className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink cursor-pointer"><X className="h-4 w-4" /></button>
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold tracking-tight">Mit Admin-Passwort bestätigen</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">Rechtstexte und Kontaktdaten sind öffentlich sichtbar und rechtlich relevant — bitte bestätigen.</p>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" placeholder="Ihr Passwort"
              onKeyDown={(e) => { if (e.key === "Enter" && pw) save(); }}
              className="mt-4 w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent" />
            {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => setConfirm(false)} className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium text-ink hover:border-ink cursor-pointer">Abbrechen</button>
              <button onClick={save} disabled={busy || !pw} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-ink disabled:opacity-50 cursor-pointer">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
