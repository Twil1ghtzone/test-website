"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Loader2, Check, X, Receipt, Star, Copy } from "lucide-react";

type InvoiceStatus = "geplant" | "in_arbeit" | "abgeschlossen";
type Invoice = { id: string; number: string; customer: string; title: string; amount: number; status: InvoiceStatus; statusLabel: string; reviewCount: number; createdAt: string; updatedAt: string };

const STATUSES: InvoiceStatus[] = ["geplant", "in_arbeit", "abgeschlossen"];
const LABEL: Record<InvoiceStatus, string> = { geplant: "Geplant", in_arbeit: "In Arbeit mit der Umsetzung", abgeschlossen: "Abgeschlossen" };
const BADGE: Record<InvoiceStatus, string> = { geplant: "bg-sky-100 text-sky-700", in_arbeit: "bg-amber-100 text-amber-700", abgeschlossen: "bg-emerald-100 text-emerald-700" };
const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export default function InvoicesPanel() {
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [edit, setEdit] = useState<Invoice | "new" | null>(null);
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/invoices", { cache: "no-store" });
    if (r.ok) setInvoices((await r.json()).invoices);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function del(i: Invoice) {
    if (!confirm(`Rechnung ${i.number} löschen? Damit können darüber keine Bewertungen mehr abgegeben werden.`)) return;
    await fetch(`/api/admin/invoices?id=${i.id}`, { method: "DELETE" });
    load();
  }
  async function setStatus(id: string, status: InvoiceStatus) {
    await fetch("/api/admin/invoices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    load();
  }
  function copy(n: string) {
    navigator.clipboard?.writeText(n).then(() => { setCopied(n); setTimeout(() => setCopied(""), 1500); });
  }

  if (!invoices) return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"><Receipt className="h-5 w-5 text-accent" /> Rechnungen</h2>
          <p className="text-sm text-muted">Registrierte Rechnungsnummern — nur damit sind Bewertungen möglich. Der Status bestimmt Teil- oder Endbewertung.</p>
        </div>
        <button onClick={() => setEdit("new")} className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-ink cursor-pointer"><Plus className="h-4 w-4" /> Rechnung erstellen</button>
      </div>

      {invoices.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-10 text-center text-muted">Noch keine Rechnungen registriert.</div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          {invoices.map((i, idx) => (
            <div key={i.id} className={`p-4 ${idx > 0 ? "border-t border-line" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => copy(i.number)} title="Nummer kopieren" className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-2.5 py-1 font-mono text-sm font-semibold text-ink hover:text-accent cursor-pointer">
                  {i.number} {copied === i.number ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-muted" />}
                </button>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[i.status]}`}>{LABEL[i.status]}</span>
                {i.reviewCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-ink"><Star className="h-3 w-3" /> {i.reviewCount} Bewertung{i.reviewCount > 1 ? "en" : ""}</span>
                )}
                <span className="ml-auto font-display font-semibold text-ink">{eur(i.amount)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{i.customer} · {i.title}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {STATUSES.filter((s) => s !== i.status).map((s) => (
                  <button key={s} onClick={() => setStatus(i.id, s)} className="rounded-full border border-line-strong px-2.5 py-1 text-xs text-ink hover:border-ink cursor-pointer">→ {LABEL[s]}</button>
                ))}
                <button onClick={() => setEdit(i)} aria-label="Bearbeiten" className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink cursor-pointer"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => del(i)} aria-label="Löschen" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && <InvoiceModal invoice={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

function InvoiceModal({ invoice, onClose, onSaved }: { invoice: Invoice | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !invoice;
  const [customer, setCustomer] = useState(invoice?.customer ?? "");
  const [title, setTitle] = useState(invoice?.title ?? "");
  const [amount, setAmount] = useState(invoice?.amount ?? 0);
  const [number, setNumber] = useState(invoice?.number ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = isNew
      ? await fetch("/api/admin/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer, title, amount, ...(number ? { number } : {}) }) })
      : await fetch("/api/admin/invoices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: invoice!.id, customer, title, amount }) });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error || "Fehler"); return; }
    onSaved();
  }

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";
  const lbl = "mb-1.5 block eyebrow text-muted";

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl border border-line bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold tracking-tight">{isNew ? "Rechnung erstellen" : "Rechnung bearbeiten"}</h3>
          <button onClick={onClose} aria-label="Schließen" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={save} className="mt-5 space-y-4">
          <div><label className={lbl}>Kunde</label><input value={customer} onChange={(e) => setCustomer(e.target.value)} className={field} required /></div>
          <div><label className={lbl}>Leistung</label><input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="z. B. Smart-Home-Installation EG" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Betrag (€)</label><input type="number" min={0} step={0.01} value={amount} onChange={(e) => setAmount(+e.target.value)} className={field} /></div>
            {isNew && (
              <div><label className={lbl}>Nummer (optional)</label><input value={number} onChange={(e) => setNumber(e.target.value)} className={field} placeholder="auto: RG-2026-001" /></div>
            )}
          </div>
          {err && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-medium text-white hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} {isNew ? "Erstellen & registrieren" : "Speichern"}
          </button>
        </form>
      </div>
    </div>
  );
}
