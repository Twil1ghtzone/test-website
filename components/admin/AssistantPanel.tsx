"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Send, RotateCcw, Trash2, Wifi, WifiOff, Loader2 } from "lucide-react";

type Msg = { role: "user" | "assistant"; text: string };

export default function AssistantPanel() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ configured: boolean; model?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const r = await fetch("/api/admin/assistant", { cache: "no-store" });
      setStatus(r.ok ? await r.json() : { configured: false });
    } catch {
      setStatus({ configured: false });
    }
    setChecking(false);
  }, []);
  useEffect(() => { check(); }, [check]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [messages, busy]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t || busy) return;
    const next: Msg[] = [...messages, { role: "user", text: t }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const r = await fetch("/api/admin/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const d = await r.json();
      setMessages((m) => [...m, { role: "assistant", text: r.ok ? d.reply : `⚠ ${d.error || "Fehler"}` }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "⚠ Verbindungsfehler." }]);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><Sparkles className="h-5 w-5" /></span>
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">KI-Assistent</h2>
            <p className="flex items-center gap-1.5 text-xs text-muted">
              {status === null || checking ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> prüfe…</>
              ) : status.configured ? (
                <><Wifi className="h-3 w-3 text-emerald-600" /> Online · {status.model}</>
              ) : (
                <><WifiOff className="h-3 w-3 text-red-500" /> Nicht konfiguriert — unter „KI &amp; Einstellungen" einrichten</>
              )}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={check} disabled={checking} title="Status prüfen" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:text-ink disabled:opacity-50 cursor-pointer"><RotateCcw className={`h-4 w-4 ${checking ? "animate-spin" : ""}`} /></button>
          <button onClick={() => setMessages([])} title="Chat leeren" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:text-red-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-line bg-surface">
        <div ref={scrollRef} className="flex max-h-[min(26rem,55dvh)] min-h-[16rem] flex-col gap-2.5 overflow-y-auto overscroll-contain bg-canvas/60 p-4">
          {messages.length === 0 && (
            <div className="m-auto max-w-sm text-center text-sm text-muted">
              Interner Assistent fürs Team — z. B. „Formuliere eine Angebots-E-Mail für eine Kamera-Installation"
              oder „Erkläre kurz VLAN-Trennung für Kameras".
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <span className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${m.role === "user" ? "bg-accent text-white" : "border border-line bg-surface text-ink"}`}>{m.text}</span>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <span className="flex items-center gap-1 rounded-2xl border border-line bg-surface px-3.5 py-2.5">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
              </span>
            </div>
          )}
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-line p-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Frage an den Assistenten …" className="h-11 w-full rounded-full border border-line bg-canvas px-4 text-sm text-ink placeholder:text-muted outline-none focus:border-accent" />
          <button type="submit" aria-label="Senden" disabled={busy} className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-white hover:bg-accent-ink disabled:opacity-60 cursor-pointer"><Send className="h-4 w-4" /></button>
        </form>
      </div>
    </div>
  );
}
