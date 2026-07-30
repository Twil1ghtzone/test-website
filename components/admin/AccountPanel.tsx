"use client";

import { useState } from "react";
import { Loader2, Save, UserRound, KeyRound } from "lucide-react";
import TwoFactorPanel from "@/components/admin/TwoFactorPanel";

type Me = { id: string; username: string; name: string; email: string; role: string };

export default function AccountPanel({ me, onChanged }: { me: Me; onChanged: () => void }) {
  const [name, setName] = useState(me.name);
  const [email, setEmail] = useState(me.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword && newPassword !== newPassword2) {
      setMsg({ ok: false, text: "Die neuen Passwörter stimmen nicht überein." });
      return;
    }
    setBusy(true);
    const r = await fetch("/api/admin/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, ...(newPassword ? { currentPassword, newPassword } : {}) }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: d.error || "Speichern fehlgeschlagen." }); return; }
    setMsg({ ok: true, text: "Gespeichert ✓" });
    setCurrentPassword(""); setNewPassword(""); setNewPassword2("");
    onChanged();
  }

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";
  const lbl = "mb-1.5 block eyebrow text-muted";

  return (
    <form onSubmit={save} className="max-w-xl space-y-6">
      <div className="rounded-3xl border border-line bg-surface p-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold tracking-tight"><UserRound className="h-5 w-5 text-accent" /> Mein Konto</h2>
        <p className="mt-1 text-sm text-muted">Angemeldet als <span className="font-mono">@{me.username}</span> · Rolle: {me.role}</p>
        <div className="mt-4 space-y-4">
          <div><label className={lbl}>Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={field} required /></div>
          <div><label className={lbl}>E-Mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></div>
        </div>
      </div>

      <div className="rounded-3xl border border-line bg-surface p-6">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight"><KeyRound className="h-5 w-5 text-accent" /> Passwort ändern</h3>
        <p className="mt-1 text-sm text-muted">Nur mit Bestätigung des aktuellen Passworts. Gespeichert wird ausschließlich der bcrypt-Hash.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className={lbl}>Aktuelles Passwort</label><input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={field} autoComplete="current-password" /></div>
          <div><label className={lbl}>Neues Passwort</label><input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={field} placeholder="min. 6 Zeichen" autoComplete="new-password" /></div>
          <div><label className={lbl}>Wiederholen</label><input type="password" value={newPassword2} onChange={(e) => setNewPassword2(e.target.value)} className={field} autoComplete="new-password" /></div>
        </div>
      </div>

      <TwoFactorPanel />

      {msg && <p className={`rounded-xl border px-4 py-3 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-700"}`}>{msg.text}</p>}
      <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 font-medium text-white hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />} Speichern
      </button>
    </form>
  );
}
