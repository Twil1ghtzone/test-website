"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2, History } from "lucide-react";

type Entry = { id: string; actor: string; action: string; detail: string; createdAt: string };

export default function ActivityPanel({ isAdmin }: { isAdmin: boolean }) {
  const [entries, setEntries] = useState<Entry[] | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/activity", { cache: "no-store" });
    if (r.ok) setEntries((await r.json()).entries);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function clearAll() {
    if (!confirm("Aktivitätslog wirklich leeren?")) return;
    await fetch("/api/admin/activity", { method: "DELETE" });
    load();
  }

  if (!entries) return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Aktivität</h2>
          <p className="text-sm text-muted">Protokoll aller Admin-Aktionen ({entries.length} Einträge).</p>
        </div>
        {isAdmin && (
          <button onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-4 py-2 text-xs font-medium text-ink hover:border-red-400 hover:text-red-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /> Log leeren</button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-10 text-center text-muted">Noch keine Aktivität protokolliert.</div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          {entries.map((e, i) => (
            <div key={e.id} className={`flex items-start gap-3 p-4 ${i > 0 ? "border-t border-line" : ""}`}>
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-accent"><History className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink"><b>{e.actor}</b> · {e.action}</p>
                {e.detail && <p className="truncate text-sm text-muted">{e.detail}</p>}
              </div>
              <span className="shrink-0 text-xs text-muted">{new Date(e.createdAt).toLocaleString("de-DE")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
