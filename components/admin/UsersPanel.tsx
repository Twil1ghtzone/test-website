"use client";

import { useState } from "react";
import { Plus, Trash2, Pencil, X, Loader2, Check } from "lucide-react";
import { ALL_PERMISSIONS, PERMISSION_LABELS, type Role, type Permissions } from "@/lib/permissions";
import type { User } from "./types";

/** Benutzerverwaltung: Liste, Anlegen, Bearbeiten, Löschen. */
export default function UsersPanel({ me, users, reload }: { me: User; users: User[]; reload: () => void }) {
  const [edit, setEdit] = useState<User | "new" | null>(null);
  const [err, setErr] = useState("");

  async function del(u: User) {
    if (!confirm(`Benutzer „${u.username}" wirklich löschen?`)) return;
    const r = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    if (!r.ok) { setErr((await r.json()).error || "Fehler"); return; }
    setErr(""); reload();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold tracking-tight">Benutzer</h2>
        <button onClick={() => setEdit("new")} className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer">
          <Plus className="h-4 w-4" /> Neuer Benutzer
        </button>
      </div>
      {err && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}

      <div className="overflow-hidden rounded-3xl border border-line bg-surface">
        {users.map((u, i) => (
          <div key={u.id} className={`flex items-center gap-4 p-4 ${i > 0 ? "border-t border-line" : ""}`}>
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-soft font-display font-semibold text-accent-ink">
              {u.name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium text-ink">{u.name}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "admin" ? "bg-accent-soft text-accent-ink" : "bg-surface-2 text-ink-soft"}`}>{u.role}</span>
                {!u.active && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">inaktiv</span>}
                {u.id === me.id && <span className="rounded-full bg-canvas px-2 py-0.5 text-xs text-muted">Sie</span>}
              </div>
              <div className="truncate text-sm text-muted">@{u.username} · {u.email || "—"}</div>
            </div>
            <button onClick={() => setEdit(u)} aria-label="Bearbeiten" className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink cursor-pointer"><Pencil className="h-4 w-4" /></button>
            {u.id !== me.id && (
              <button onClick={() => del(u)} aria-label="Löschen" className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
            )}
          </div>
        ))}
      </div>

      {edit && <UserModal me={me} user={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
    </div>
  );
}

function UserModal({ me, user, onClose, onSaved }: { me: User; user: User | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !user;
  const isSelf = user?.id === me.id;
  const [name, setName] = useState(user?.name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "editor");
  const [active, setActive] = useState(user?.active ?? true);
  const [password, setPassword] = useState("");
  const [perms, setPerms] = useState<Permissions>(() => {
    const empty = Object.fromEntries(ALL_PERMISSIONS.map((p) => [p, false])) as Permissions;
    return user?.permissions ? { ...empty, ...user.permissions } : empty;
  });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // Nur echte Admins dürfen die Admin-Rolle vergeben.
  const canGrantAdmin = me.role === "admin";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const r = isNew
      ? await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, username, email, role, password, permissions: perms }) })
      : await fetch(`/api/admin/users/${user!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, role, active, permissions: perms, ...(password ? { password } : {}) }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d.error || "Speichern fehlgeschlagen."); setBusy(false); return; }
    onSaved();
  }

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";
  const lbl = "mb-1.5 block eyebrow text-muted";

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm" onClick={onClose}>
      {/* Flex-Spalte mit begrenzter Höhe: Kopf bleibt, Formular scrollt —
          so sind auch die untersten Berechtigungen immer erreichbar. */}
      <div className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-line bg-surface" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line p-5 sm:px-7">
          <h3 className="font-display text-xl font-semibold tracking-tight">{isNew ? "Neuer Benutzer" : "Benutzer bearbeiten"}</h3>
          <button onClick={onClose} aria-label="Schließen" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink cursor-pointer"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={save} className="flex-1 space-y-4 overflow-y-auto overscroll-contain p-5 sm:p-7">
          <div><label className={lbl}>Name</label><input value={name} onChange={(e) => setName(e.target.value)} className={field} required /></div>
          <div>
            <label className={lbl}>Benutzername</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className={field} disabled={!isNew} required />
            {!isNew && <p className="mt-1 text-xs text-muted">Benutzername ist nicht änderbar.</p>}
          </div>
          <div><label className={lbl}>E-Mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Rolle</label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} disabled={isSelf || !canGrantAdmin} className={`${field} cursor-pointer disabled:opacity-60`}>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {!isNew && (
              <div>
                <label className={lbl}>Status</label>
                <select value={active ? "1" : "0"} onChange={(e) => setActive(e.target.value === "1")} disabled={isSelf} className={`${field} cursor-pointer disabled:opacity-60`}>
                  <option value="1">Aktiv</option>
                  <option value="0">Inaktiv</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className={lbl}>{isNew ? "Passwort" : "Neues Passwort (optional)"}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} placeholder={isNew ? "min. 6 Zeichen" : "leer = unverändert"} {...(isNew ? { required: true } : {})} />
          </div>

          {/* Einzelne Berechtigungen — bei Admins immer alle aktiv. */}
          <div>
            <label className={lbl}>Berechtigungen</label>
            {role === "admin" ? (
              <p className="rounded-xl border border-line bg-canvas px-4 py-3 text-sm text-ink-soft">Administratoren haben automatisch Zugriff auf alle Bereiche.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {ALL_PERMISSIONS.map((p) => (
                  <label key={p} className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm text-ink hover:border-accent">
                    <input type="checkbox" checked={!!perms[p]} onChange={(e) => setPerms({ ...perms, [p]: e.target.checked })} className="h-4 w-4 accent-[var(--color-accent)]" />
                    {PERMISSION_LABELS[p]}
                  </label>
                ))}
              </div>
            )}
          </div>
          {err && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Speichern
          </button>
        </form>
      </div>
    </div>
  );
}
