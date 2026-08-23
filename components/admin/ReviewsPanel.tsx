"use client";

import { useCallback, useEffect, useState } from "react";
import { Star, Trash2, Check, X, ShieldCheck, ShieldAlert, Loader2, Save } from "lucide-react";

import ZahlFeld from "@/components/admin/ZahlFeld";
type Review = { id: string; name: string; rating: number; text: string; status: "offen" | "freigegeben" | "abgelehnt"; createdAt: string; verified: boolean; invoiceNumber: string; phase: string; kind: "teil" | "end" };

const PHASE_LABEL: Record<string, string> = { geplant: "Geplant", in_arbeit: "In Arbeit mit der Umsetzung", abgeschlossen: "Abgeschlossen" };
type Cfg = { enabled: boolean; autoApprove: boolean; maxPerDay: number };

function Stars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-4 w-4 ${i <= n ? "fill-amber-400 text-amber-400" : "text-line-strong"}`} />
      ))}
    </span>
  );
}

export default function ReviewsPanel({ canSettings }: { canSettings: boolean }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [filter, setFilter] = useState<"alle" | Review["status"]>("alle");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/reviews", { cache: "no-store" });
    if (r.ok) setReviews((await r.json()).reviews);
    if (canSettings) {
      const s = await fetch("/api/admin/settings", { cache: "no-store" });
      if (s.ok) setCfg((await s.json()).settings.reviews);
    }
  }, [canSettings]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: Review["status"]) {
    await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }
  async function del(r: Review) {
    if (!confirm(`Bewertung von „${r.name}" löschen?`)) return;
    await fetch(`/api/admin/reviews?id=${r.id}`, { method: "DELETE" });
    load();
  }
  async function saveCfg() {
    if (!cfg) return;
    const r = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviews: cfg }) });
    setMsg(r.ok ? "Gespeichert ✓" : "Fehler");
    setTimeout(() => setMsg(""), 2000);
  }

  if (!reviews) return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;

  const shown = filter === "alle" ? reviews : reviews.filter((r) => r.status === filter);
  const badge = { offen: "bg-amber-100 text-amber-700", freigegeben: "bg-emerald-100 text-emerald-700", abgelehnt: "bg-red-100 text-red-700" } as const;
  const avg = reviews.filter((r) => r.status === "freigegeben").reduce((s, r, _, a) => s + r.rating / a.length, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Bewertungen</h2>
          <p className="text-sm text-muted">{reviews.length} gesamt · Ø {avg ? avg.toFixed(1) : "—"} ★ (freigegeben)</p>
        </div>
        <div className="flex gap-1.5 rounded-full border border-line bg-surface p-1">
          {(["alle", "offen", "freigegeben", "abgelehnt"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${filter === f ? "bg-accent text-white" : "text-ink-soft hover:bg-canvas"}`}>{f}</button>
          ))}
        </div>
      </div>

      {canSettings && cfg && (
        <div className="rounded-3xl border border-line bg-surface p-5">
          <h3 className="eyebrow text-muted">Steuerung</h3>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={cfg.enabled} onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" />
              Bewertungssystem aktiv
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={cfg.autoApprove} onChange={(e) => setCfg({ ...cfg, autoApprove: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" />
              automatisch freigeben (ohne Moderation)
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              max./Tag pro IP
              <ZahlFeld min={1} max={20} value={cfg.maxPerDay} onChange={(n) => setCfg({ ...cfg, maxPerDay: n })} className="w-16 rounded-lg border border-line bg-canvas px-2 py-1 text-ink outline-none focus:border-accent" />
            </label>
            <button onClick={saveCfg} className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-medium text-white hover:bg-accent-ink cursor-pointer"><Save className="h-3.5 w-3.5" /> Speichern</button>
            {msg && <span className="text-sm text-emerald-600">{msg}</span>}
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-10 text-center text-muted">Keine Bewertungen{filter !== "alle" ? ` (${filter})` : ""}.</div>
      ) : (
        <div className="space-y-3">
          {shown.map((r) => (
            <div key={r.id} className="rounded-3xl border border-line bg-surface p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{r.name}</span>
                <Stars n={r.rating} />
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[r.status]}`}>{r.status}</span>
                {r.invoiceNumber && <span className="rounded-full bg-canvas px-2 py-0.5 font-mono text-xs text-ink-soft">{r.invoiceNumber}</span>}
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.kind === "teil" ? "bg-sky-100 text-sky-700" : "bg-surface-2 text-ink-soft"}`}>
                  {r.kind === "teil" ? `Teilbewertung · ${PHASE_LABEL[r.phase] || r.phase}` : "Endbewertung"}
                </span>
                {r.verified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700" title="HMAC-Siegel gültig — Eintrag stammt vom Server und ist unverändert"><ShieldCheck className="h-3 w-3" /> Siegel gültig</span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700" title="Siegel ungültig — Eintrag wurde manipuliert oder von Hand eingefügt"><ShieldAlert className="h-3 w-3" /> manipuliert!</span>
                )}
                <span className="ml-auto text-xs text-muted">{new Date(r.createdAt).toLocaleString("de-DE")}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{r.text}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "freigegeben" && (
                  <button onClick={() => setStatus(r.id, "freigegeben")} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 cursor-pointer"><Check className="h-3.5 w-3.5" /> Freigeben</button>
                )}
                {r.status !== "abgelehnt" && (
                  <button onClick={() => setStatus(r.id, "abgelehnt")} className="inline-flex items-center gap-1 rounded-full border border-line-strong px-3 py-1.5 text-xs font-medium text-ink hover:border-ink cursor-pointer"><X className="h-3.5 w-3.5" /> Ablehnen</button>
                )}
                <button onClick={() => del(r)} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-muted hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /> Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
