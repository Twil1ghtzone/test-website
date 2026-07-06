"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Loader2, TrendingUp, TrendingDown, Wallet } from "lucide-react";

type Entry = { id: string; type: "einnahme" | "ausgabe"; label: string; amount: number; date: string; createdAt: string };
const eur = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

export default function FinancePanel() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<Entry["type"]>("einnahme");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/finance", { cache: "no-store" });
    if (r.ok) setEntries((await r.json()).entries);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/admin/finance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ label, amount: +amount, type, date }) });
    if (!r.ok) { setErr((await r.json()).error || "Fehler"); return; }
    setLabel(""); setAmount("");
    load();
  }
  async function del(en: Entry) {
    if (!confirm(`Buchung „${en.label}" löschen?`)) return;
    await fetch(`/api/admin/finance?id=${en.id}`, { method: "DELETE" });
    load();
  }

  if (!entries) return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;

  const month = new Date().toISOString().slice(0, 7);
  const inMonth = entries.filter((e) => e.date.startsWith(month));
  const einnahmen = inMonth.filter((e) => e.type === "einnahme").reduce((s, e) => s + e.amount, 0);
  const ausgaben = inMonth.filter((e) => e.type === "ausgabe").reduce((s, e) => s + e.amount, 0);
  const totalIn = entries.filter((e) => e.type === "einnahme").reduce((s, e) => s + e.amount, 0);
  const totalOut = entries.filter((e) => e.type === "ausgabe").reduce((s, e) => s + e.amount, 0);

  const field = "rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";

  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl font-semibold tracking-tight">Finanzen</h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-line bg-surface p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700"><TrendingUp className="h-5 w-5" /></span>
          <div className="mt-3 font-display text-2xl font-semibold">{eur(einnahmen)}</div>
          <div className="text-sm text-muted">Einnahmen (Monat)</div>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-100 text-red-700"><TrendingDown className="h-5 w-5" /></span>
          <div className="mt-3 font-display text-2xl font-semibold">{eur(ausgaben)}</div>
          <div className="text-sm text-muted">Ausgaben (Monat)</div>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><Wallet className="h-5 w-5" /></span>
          <div className="mt-3 font-display text-2xl font-semibold">{eur(totalIn - totalOut)}</div>
          <div className="text-sm text-muted">Saldo (gesamt)</div>
        </div>
      </div>

      <form onSubmit={add} className="flex flex-wrap items-end gap-3 rounded-3xl border border-line bg-surface p-5">
        <div className="min-w-40 flex-1"><label className="mb-1.5 block eyebrow text-muted">Bezeichnung</label><input value={label} onChange={(e) => setLabel(e.target.value)} className={`${field} w-full`} required /></div>
        <div><label className="mb-1.5 block eyebrow text-muted">Betrag (€)</label><input type="number" min={0.01} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} w-32`} required /></div>
        <div><label className="mb-1.5 block eyebrow text-muted">Art</label>
          <select value={type} onChange={(e) => setType(e.target.value as Entry["type"])} className={`${field} cursor-pointer`}>
            <option value="einnahme">Einnahme</option><option value="ausgabe">Ausgabe</option>
          </select>
        </div>
        <div><label className="mb-1.5 block eyebrow text-muted">Datum</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} /></div>
        <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-accent-ink cursor-pointer"><Plus className="h-4 w-4" /> Buchen</button>
        {err && <p className="w-full text-sm text-red-600">{err}</p>}
      </form>

      {entries.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-10 text-center text-muted">Noch keine Buchungen.</div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          {entries.map((e, i) => (
            <div key={e.id} className={`flex items-center gap-3 p-4 ${i > 0 ? "border-t border-line" : ""}`}>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${e.type === "einnahme" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {e.type === "einnahme" ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{e.label}</span>
                <span className="text-xs text-muted">{new Date(e.date).toLocaleDateString("de-DE")}</span>
              </div>
              <span className={`font-display font-semibold ${e.type === "einnahme" ? "text-emerald-700" : "text-red-700"}`}>{e.type === "einnahme" ? "+" : "−"}{eur(e.amount)}</span>
              <button onClick={() => del(e)} aria-label="Löschen" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
