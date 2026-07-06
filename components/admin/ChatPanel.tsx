"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, Loader2, Trash2 } from "lucide-react";

type Msg = { id: string; userId: string; userName: string; text: string; createdAt: string };

export default function ChatPanel({ meId, isAdmin }: { meId: string; isAdmin: boolean }) {
  const [messages, setMessages] = useState<Msg[] | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastId = useRef<string | null>(null);

  const load = useCallback(async (initial = false) => {
    const url = !initial && lastId.current ? `/api/admin/chat?after=${lastId.current}` : "/api/admin/chat";
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) return;
    const d = await r.json();
    if (initial) {
      setMessages(d.messages);
      lastId.current = d.messages.at(-1)?.id ?? null;
    } else if (d.messages.length > 0) {
      setMessages((m) => [...(m || []), ...d.messages]);
      lastId.current = d.messages.at(-1).id;
    }
  }, []);

  // Initial laden + alle 5 s auf neue Nachrichten prüfen (Polling).
  useEffect(() => {
    load(true);
    const iv = setInterval(() => load(false), 5000);
    return () => clearInterval(iv);
  }, [load]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    const r = await fetch("/api/admin/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: t }) });
    if (r.ok) {
      const d = await r.json();
      setMessages((m) => [...(m || []), d.message]);
      lastId.current = d.message.id;
    }
  }

  async function clearAll() {
    if (!confirm("Gesamten Chatverlauf löschen?")) return;
    await fetch("/api/admin/chat", { method: "DELETE" });
    setMessages([]);
    lastId.current = null;
  }

  if (!messages) return <div className="rounded-3xl border border-line bg-surface p-10 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Team-Chat</h2>
          <p className="text-sm text-muted">Interner Chat für alle Admin-Benutzer · aktualisiert automatisch.</p>
        </div>
        {isAdmin && (
          <button onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-4 py-2 text-xs font-medium text-ink hover:border-red-400 hover:text-red-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /> Verlauf leeren</button>
        )}
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div ref={scrollRef} className="flex max-h-[26rem] min-h-[14rem] flex-col gap-2.5 overflow-y-auto bg-canvas/60 p-4">
          {messages.length === 0 && <p className="m-auto text-sm text-muted">Noch keine Nachrichten.</p>}
          {messages.map((m) => {
            const mine = m.userId === meId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${mine ? "bg-accent text-white" : "border border-line bg-surface text-ink"}`}>
                  {!mine && <span className="block text-xs font-semibold text-accent">{m.userName}</span>}
                  <span className="whitespace-pre-wrap">{m.text}</span>
                  <span className={`mt-0.5 block text-right text-[10px] ${mine ? "text-white/60" : "text-muted"}`}>{new Date(m.createdAt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Nachricht ans Team …" className="h-11 w-full rounded-full border border-line bg-canvas px-4 text-sm text-ink placeholder:text-muted outline-none focus:border-accent" />
          <button type="submit" aria-label="Senden" className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-white hover:bg-accent-ink cursor-pointer"><Send className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  );
}
