"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Loader2, Check, X, Receipt, Star, Copy, Printer, Package, ChevronDown } from "lucide-react";
import { services } from "@/lib/services";

import ZahlFeld from "@/components/admin/ZahlFeld";
type InvoiceStatus = "geplant" | "in_arbeit" | "abgeschlossen";
type Item = { id: string; name: string; price: number; sqm: number; custom: boolean };
type Invoice = { id: string; number: string; customer: string; title: string; amount: number; items: Item[]; status: InvoiceStatus; statusLabel: string; reviewCount: number; createdAt: string; updatedAt: string };

const STATUSES: InvoiceStatus[] = ["geplant", "in_arbeit", "abgeschlossen"];
const LABEL: Record<InvoiceStatus, string> = { geplant: "Geplant", in_arbeit: "In Arbeit mit der Umsetzung", abgeschlossen: "Abgeschlossen" };
const BADGE: Record<InvoiceStatus, string> = { geplant: "bg-sky-100 text-sky-700", in_arbeit: "bg-amber-100 text-amber-700", abgeschlossen: "bg-emerald-100 text-emerald-700" };
const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

// Pakete von der Website (lib/services) als Vorlagen für Rechnungspositionen.
const WEBSITE_PACKAGES = services.map((s) => s.title);

// HTML-Escape für alle vom Nutzer eingegebenen Felder in der Druckansicht —
// verhindert, dass z. B. ein Kundenname mit <script> im Druckfenster ausgeführt wird.
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Druckansicht: eigenes Fenster mit sauberem Rechnungslayout, druckt automatisch.
function printInvoice(inv: Invoice) {
  const rows = (inv.items.length > 0 ? inv.items : [{ id: "x", name: inv.title, price: inv.amount, sqm: 0, custom: false }])
    .map(
      (it, i) => `<tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e7ddcc;">${i + 1}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e7ddcc;">${esc(it.name)}${it.custom ? ' <span style="font-size:11px;color:#8a7f70;">(individuelle Vereinbarung)</span>' : ""}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e7ddcc;text-align:right;">${it.sqm > 0 ? `${String(it.sqm).replace(".", ",")} m²` : "—"}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e7ddcc;text-align:right;white-space:nowrap;">${eur(it.price)}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Rechnung ${esc(inv.number)}</title>
<style>
  @page { margin: 18mm; }
  body { font-family: Georgia, "Times New Roman", serif; color: #211c17; margin: 0; }
  @media print { .noprint { display: none; } }
</style></head>
<body>
  <div style="max-width:720px;margin:0 auto;padding:24px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b0543a;margin:0;">STUDIO//LOKAL</p>
        <p style="font-size:12px;color:#8a7f70;margin:4px 0 0;">Elektrohandwerk + lokale IT · cloud-frei, abofrei</p>
      </div>
      <div style="text-align:right;">
        <h1 style="font-size:26px;margin:0;">Rechnung</h1>
        <p style="font-family:monospace;font-size:14px;margin:4px 0 0;">${esc(inv.number)}</p>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;margin-top:36px;">
      <div>
        <p style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8a7f70;margin:0 0 4px;">Rechnung an</p>
        <p style="font-size:16px;font-weight:bold;margin:0;">${esc(inv.customer)}</p>
      </div>
      <div style="text-align:right;font-size:13px;color:#5c5244;">
        <p style="margin:0;">Datum: ${new Date(inv.createdAt).toLocaleDateString("de-DE")}</p>
        <p style="margin:4px 0 0;">Status: ${LABEL[inv.status]}</p>
      </div>
    </div>

    <p style="margin:28px 0 8px;font-size:15px;"><b>Leistung:</b> ${esc(inv.title)}</p>

    <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:14px;">
      <thead>
        <tr style="text-align:left;">
          <th style="padding:10px 8px;border-bottom:2px solid #211c17;width:32px;">#</th>
          <th style="padding:10px 8px;border-bottom:2px solid #211c17;">Position</th>
          <th style="padding:10px 8px;border-bottom:2px solid #211c17;text-align:right;width:90px;">Fläche</th>
          <th style="padding:10px 8px;border-bottom:2px solid #211c17;text-align:right;width:120px;">Preis</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:14px 8px;text-align:right;font-weight:bold;">Gesamtbetrag</td>
          <td style="padding:14px 8px;text-align:right;font-weight:bold;font-size:16px;border-top:2px solid #211c17;white-space:nowrap;">${eur(inv.amount)}</td>
        </tr>
      </tfoot>
    </table>

    <p style="margin-top:36px;font-size:12px;color:#8a7f70;line-height:1.6;">
      Vielen Dank für Ihr Vertrauen. Mit dieser Rechnungsnummer können Sie unseren Service auf der Website bewerten —
      je nach Projektstand auch schon während der Umsetzung.
    </p>

    <button id="drucken" class="noprint" style="margin-top:24px;background:#b0543a;color:#fff;border:0;padding:12px 24px;border-radius:999px;font-size:14px;cursor:pointer;">Drucken</button>
  </div>
</body></html>`;

  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();

  // Bewusst KEIN Inline-<script> und kein onclick-Attribut im erzeugten HTML:
  // Das Popup erbt die Content-Security-Policy dieser Seite, und die erlaubt
  // nur Skripte mit gültigem Nonce. Attribut-Handler lassen sich per Nonce
  // grundsätzlich nicht freigeben. Deshalb steuern wir das Fenster von hier
  // aus über die DOM-API — funktioniert ohne jede CSP-Ausnahme.
  const start = () => {
    w.document.getElementById("drucken")?.addEventListener("click", () => w.print());
    window.setTimeout(() => w.print(), 300);
  };
  if (w.document.readyState === "complete") start();
  else w.addEventListener("load", start, { once: true });
}

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
                {i.items.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-soft"><Package className="h-3 w-3" /> {i.items.length} Position{i.items.length > 1 ? "en" : ""}</span>
                )}
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
                <button onClick={() => printInvoice(i)} title="Druckansicht öffnen" className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1 text-xs font-medium text-ink hover:border-accent hover:text-accent-ink cursor-pointer"><Printer className="h-3.5 w-3.5" /> Drucken</button>
                <button onClick={() => setEdit(i)} aria-label="Bearbeiten" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink cursor-pointer"><Pencil className="h-4 w-4" /></button>
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
  const [number, setNumber] = useState(invoice?.number ?? "");
  const [items, setItems] = useState<Item[]>(invoice?.items ?? []);
  const [amount, setAmount] = useState(invoice?.amount ?? 0); // nur ohne Positionen
  const [pkgOpen, setPkgOpen] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const total = items.reduce((s, it) => s + (it.price || 0), 0);

  function addPackage(name: string) {
    setItems((p) => [...p, { id: `it-${Date.now()}-${p.length}`, name, price: 0, sqm: 0, custom: false }]);
    setPkgOpen(false);
  }
  function addCustom() {
    setItems((p) => [...p, { id: `it-${Date.now()}-${p.length}`, name: "", price: 0, sqm: 0, custom: true }]);
  }
  function update(id: string, patch: Partial<Item>) {
    setItems((p) => p.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }
  function removeItem(id: string) {
    setItems((p) => p.filter((it) => it.id !== id));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (items.some((it) => it.custom && !it.name.trim())) { setErr("Bitte alle eigenen Posten benennen."); return; }
    setBusy(true); setErr("");
    const payload = { customer, title, items, amount, ...(isNew && number ? { number } : {}) };
    const r = isNew
      ? await fetch("/api/admin/invoices", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/admin/invoices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: invoice!.id, ...payload }) });
    setBusy(false);
    if (!r.ok) { setErr((await r.json()).error || "Fehler"); return; }
    onSaved();
  }

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";
  const small = "rounded-lg border border-line bg-canvas px-2.5 py-2 text-sm text-ink outline-none focus:border-accent";
  const lbl = "mb-1.5 block eyebrow text-muted";

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-ink/55 p-3 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl border border-line bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line p-5">
          <h3 className="font-display text-xl font-semibold tracking-tight">{isNew ? "Rechnung erstellen" : "Rechnung bearbeiten"}</h3>
          <button onClick={onClose} aria-label="Schließen" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink cursor-pointer"><X className="h-5 w-5" /></button>
        </div>

        <form onSubmit={save} className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={lbl}>Kunde</label><input value={customer} onChange={(e) => setCustomer(e.target.value)} className={field} required /></div>
            {isNew && (
              <div><label className={lbl}>Nummer (optional)</label><input value={number} onChange={(e) => setNumber(e.target.value)} className={field} placeholder="auto: RG-2026-001" /></div>
            )}
          </div>
          <div><label className={lbl}>Leistung (Kurzbeschreibung)</label><input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="z. B. Smart-Home-Installation EG" required /></div>

          {/* ── Positionen: Pakete + eigene Posten, je Preis + m² ── */}
          <div>
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
              <label className={lbl.replace("mb-1.5 ", "")}>Positionen</label>
              <div className="flex gap-2">
                <div className="relative">
                  <button type="button" onClick={() => setPkgOpen((v) => !v)} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-canvas px-3.5 py-1.5 text-xs font-medium text-ink hover:border-accent cursor-pointer">
                    <Package className="h-3.5 w-3.5" /> Paket von der Website <ChevronDown className="h-3 w-3" />
                  </button>
                  {pkgOpen && (
                    <div className="absolute right-0 z-10 mt-1 w-72 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
                      {WEBSITE_PACKAGES.map((name) => (
                        <button key={name} type="button" onClick={() => addPackage(name)} className="block w-full px-4 py-2.5 text-left text-sm text-ink hover:bg-canvas cursor-pointer">{name}</button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={addCustom} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-canvas px-3.5 py-1.5 text-xs font-medium text-ink hover:border-accent cursor-pointer">
                  <Plus className="h-3.5 w-3.5" /> Eigener Posten
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line-strong bg-canvas p-4 text-center text-sm text-muted">
                Keine Positionen — Betrag frei eingeben oder Pakete/Posten hinzufügen.
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-canvas p-2.5">
                    <input
                      value={it.name}
                      onChange={(e) => update(it.id, { name: e.target.value })}
                      readOnly={!it.custom}
                      placeholder="Bezeichnung des Postens"
                      className={`${small} min-w-40 flex-1 ${!it.custom ? "bg-surface-2 text-ink-soft" : ""}`}
                    />
                    {it.custom && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent-ink">individuell</span>}
                    <label className="flex items-center gap-1 text-xs text-muted">
                      <input type="number" min={0} step={0.5} value={it.sqm || ""} onChange={(e) => update(it.id, { sqm: +e.target.value || 0 })} placeholder="0" className={`${small} w-20 text-right`} /> m²
                    </label>
                    <label className="flex items-center gap-1 text-xs text-muted">
                      <input type="number" min={0} step={0.01} value={it.price || ""} onChange={(e) => update(it.id, { price: +e.target.value || 0 })} placeholder="0,00" className={`${small} w-28 text-right`} /> €
                    </label>
                    <button type="button" onClick={() => removeItem(it.id)} aria-label="Position entfernen" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                <div className="flex items-center justify-end gap-2 pr-2 text-sm">
                  <span className="text-muted">Gesamtsumme:</span>
                  <span className="font-display text-lg font-semibold text-ink">{eur(total)}</span>
                </div>
              </div>
            )}
          </div>

          {items.length === 0 && (
            <div><label className={lbl}>Betrag (€) — ohne Positionen</label><ZahlFeld min={0} step={0.01} value={amount} onChange={setAmount} className={field} /></div>
          )}

          {err && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        </form>

        <div className="flex justify-end gap-3 border-t border-line p-5">
          <button type="button" onClick={onClose} className="rounded-full border border-line-strong px-5 py-2.5 text-sm font-medium text-ink hover:border-ink cursor-pointer">Abbrechen</button>
          <button onClick={save} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {isNew ? "Erstellen & registrieren" : "Speichern"}
          </button>
        </div>
      </div>
    </div>
  );
}
