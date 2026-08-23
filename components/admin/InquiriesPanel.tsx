"use client";

import { Trash2, Mail, Phone } from "lucide-react";
import type { Inquiry } from "./types";

/** Posteingang der Kontaktanfragen: Status setzen und löschen. */
export default function InquiriesPanel({ inquiries, reload }: { inquiries: Inquiry[]; reload: () => void }) {
  async function setStatus(id: string, status: Inquiry["status"]) {
    await fetch("/api/inquiries", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) });
    reload();
  }
  async function del(id: string) {
    if (!confirm("Anfrage löschen?")) return;
    await fetch(`/api/inquiries?id=${id}`, { method: "DELETE" });
    reload();
  }

  const badge = { neu: "bg-accent text-white", gelesen: "bg-surface-2 text-ink-soft", erledigt: "bg-emerald-100 text-emerald-700" } as const;

  if (inquiries.length === 0) {
    return <div className="rounded-3xl border border-line bg-surface p-10 text-center text-muted">Noch keine Anfragen.</div>;
  }
  return (
    <div className="space-y-4">
      {inquiries.map((i) => (
        <div key={i.id} className="rounded-3xl border border-line bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-ink">{i.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[i.status]}`}>{i.status}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                <a href={`mailto:${i.email}`} className="inline-flex items-center gap-1 hover:text-ink"><Mail className="h-3.5 w-3.5" />{i.email}</a>
                {i.phone && <a href={`tel:${i.phone}`} className="inline-flex items-center gap-1 hover:text-ink"><Phone className="h-3.5 w-3.5" />{i.phone}</a>}
                <span>{new Date(i.createdAt).toLocaleString("de-DE")}</span>
              </div>
            </div>
            <button onClick={() => del(i.id)} aria-label="Löschen" className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
          </div>
          {(i.topic || i.building || (i.packages && i.packages.length > 0)) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {i.topic && <span className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink-soft">{i.topic}</span>}
              {i.building && <span className="rounded-full bg-canvas px-2.5 py-1 text-xs text-ink-soft">{i.building}</span>}
              {i.packages?.map((p) => <span key={p} className="rounded-full bg-accent-soft px-2.5 py-1 text-xs text-accent-ink">{p}</span>)}
            </div>
          )}
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">{i.message}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["neu", "gelesen", "erledigt"] as const).map((s) => (
              <button key={s} onClick={() => setStatus(i.id, s)} disabled={i.status === s}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 ${i.status === s ? "bg-accent text-white" : "border border-line-strong bg-surface text-ink hover:border-ink"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
