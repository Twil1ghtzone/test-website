"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldCheck, LogIn, LogOut, Users, Inbox, LayoutDashboard, Plus, Trash2, Pencil, X,
  Eye, EyeOff, Loader2, Check, Mail, Phone, Sparkles, Database, FileText, Cookie,
  Star, Ticket, Hammer, Wallet, MessageCircle, History, HardDrive, UserRound, Menu,
  Receipt, Bot, LifeBuoy, Scale, KeyRound,
} from "lucide-react";
import SettingsPanel from "@/components/admin/SettingsPanel";
import BackupPanel from "@/components/admin/BackupPanel";
import BlogPanel from "@/components/admin/BlogPanel";
import CookiesPanel from "@/components/admin/CookiesPanel";
import ReviewsPanel from "@/components/admin/ReviewsPanel";
import TicketsPanel from "@/components/admin/TicketsPanel";
import OrdersPanel from "@/components/admin/OrdersPanel";
import FinancePanel from "@/components/admin/FinancePanel";
import ChatPanel from "@/components/admin/ChatPanel";
import ActivityPanel from "@/components/admin/ActivityPanel";
import DatabasePanel from "@/components/admin/DatabasePanel";
import AccountPanel from "@/components/admin/AccountPanel";
import InvoicesPanel from "@/components/admin/InvoicesPanel";
import AssistantPanel from "@/components/admin/AssistantPanel";
import SupportPanel from "@/components/admin/SupportPanel";
import LegalPanel from "@/components/admin/LegalPanel";
import ChatKeysPanel from "@/components/admin/ChatKeysPanel";

import {
  ALL_PERMISSIONS, PERMISSION_LABELS, hatBerechtigung,
  type Role, type Permission, type Permissions,
} from "@/lib/permissions";
type User = { id: string; username: string; name: string; email: string; role: Role; permissions: Permissions; active: boolean; createdAt: string };
type Inquiry = { id: string; name: string; email: string; phone?: string; topic?: string; building?: string; message: string; packages?: string[]; status: "neu" | "gelesen" | "erledigt"; createdAt: string };
type Tab =
  | "overview" | "users" | "inquiries" | "blog" | "settings" | "backup" | "cookies"
  | "reviews" | "tickets" | "chat" | "orders" | "finance" | "activity" | "database" | "account"
  | "invoices" | "assistant" | "support" | "legal" | "chatkeys";

// Liste, Beschriftungen und die "Admin darf alles"-Regel kommen aus
// lib/permissions.ts — dieselbe Quelle, die auch der Server nutzt.
const can = hatBerechtigung;

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<User | null>(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/auth/session", { cache: "no-store" });
      const d = await r.json();
      setMe(d.user ?? null);
    } catch {
      setMe(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadSession(); }, [loadSession]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-canvas">
        <Loader2 className="h-7 w-7 animate-spin text-accent" />
      </main>
    );
  }
  if (!me) return <LoginScreen onSuccess={loadSession} />;
  return <Dashboard me={me} onLogout={loadSession} />;
}

/* ─────────────────────────── LOGIN ─────────────────────────── */
function LoginScreen({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // 2FA: Server antwortet mit needTotp → zweiter Schritt mit Code.
  const [needTotp, setNeedTotp] = useState(false);
  const [code, setCode] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, ...(needTotp ? { code } : {}) }),
      });
      const d = await r.json();
      if (!r.ok) {
        if (d.needTotp) { setNeedTotp(true); setCode(""); }
        setErr(d.error || "Anmeldung fehlgeschlagen.");
        setBusy(false);
        return;
      }
      onSuccess();
    } catch {
      setErr("Verbindungsfehler."); setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 shadow-[0_24px_60px_-24px_rgba(33,28,23,0.3)]">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-white"><ShieldCheck className="h-6 w-6" /></span>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight">Admin-Anmeldung</h1>
        <p className="mt-1 text-sm text-ink-soft">Geschützter Bereich.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="u" className="mb-1.5 block eyebrow text-muted">Benutzername</label>
            <input id="u" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username"
              className="w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface" placeholder="admin" />
          </div>
          <div>
            <label htmlFor="p" className="mb-1.5 block eyebrow text-muted">Passwort</label>
            <div className="relative">
              <input id="p" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
                className="w-full rounded-xl border border-line bg-canvas px-4 py-3 pr-11 text-ink outline-none focus:border-accent focus:bg-surface" placeholder="••••••••" />
              <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer">
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          {needTotp && (
            <div className="rounded-xl border border-accent/40 bg-accent-soft/40 p-3">
              <label htmlFor="totp" className="mb-1.5 block eyebrow text-accent-ink">Code aus der Authenticator-App</label>
              <input
                id="totp"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                placeholder="123456"
                className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-ink outline-none focus:border-accent"
              />
              <p className="mt-1.5 text-xs text-muted">Kein Zugriff aufs Handy? Einen Wiederherstellungs-Code eingeben.</p>
            </div>
          )}
          {err && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
          <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />} {needTotp ? "Code bestätigen" : "Anmelden"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted">Erststart: <span className="font-mono">admin</span> / <span className="font-mono">test1234</span></p>
      </div>
    </main>
  );
}

/* ─────────────────────────── DASHBOARD ─────────────────────────── */
function Dashboard({ me, onLogout }: { me: User; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!can(me, "users")) return;
    const r = await fetch("/api/admin/users", { cache: "no-store" });
    if (r.ok) setUsers((await r.json()).users);
  }, [me]);
  const loadInquiries = useCallback(async () => {
    if (!can(me, "inquiries")) return;
    const r = await fetch("/api/inquiries", { cache: "no-store" });
    if (r.ok) setInquiries((await r.json()).inquiries);
  }, [me]);
  useEffect(() => { loadUsers(); loadInquiries(); }, [loadUsers, loadInquiries]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    onLogout();
  }

  // Gruppierte Navigation (wie novum) — nur sichtbare Bereiche je Berechtigung.
  type NavGroup = { label: string; items: { id: Tab; label: string; icon: React.ElementType; show: boolean }[] };
  const baseGroups: NavGroup[] = [
    {
      label: "",
      items: [{ id: "overview", label: "Übersicht", icon: LayoutDashboard, show: true }],
    },
    {
      label: "Betrieb",
      items: [
        { id: "tickets", label: "Tickets", icon: Ticket, show: can(me, "tickets") },
        { id: "orders", label: "Aufträge", icon: Hammer, show: can(me, "orders") },
        { id: "invoices", label: "Rechnungen", icon: Receipt, show: can(me, "invoices") },
        { id: "finance", label: "Finanzen", icon: Wallet, show: can(me, "finance") },
      ],
    },
    {
      label: "Kommunikation",
      items: [
        { id: "chat", label: "Team-Chat", icon: MessageCircle, show: can(me, "chat") },
        { id: "inquiries", label: "Anfragen", icon: Inbox, show: can(me, "inquiries") },
        { id: "support", label: "Support-Tickets", icon: LifeBuoy, show: can(me, "support") },
        { id: "reviews", label: "Bewertungen", icon: Star, show: can(me, "reviews") },
      ],
    },
    {
      label: "Inhalte",
      items: [
        { id: "blog", label: "Blog", icon: FileText, show: can(me, "blog") },
        { id: "cookies", label: "Cookies", icon: Cookie, show: can(me, "cookies") },
        { id: "legal", label: "Rechtstexte & Kontakt", icon: Scale, show: can(me, "legal") },
      ],
    },
    {
      label: "Verwaltung",
      items: [
        { id: "users", label: "Benutzer", icon: Users, show: can(me, "users") },
        { id: "activity", label: "Aktivität", icon: History, show: can(me, "activity") },
        { id: "assistant", label: "KI-Assistent", icon: Bot, show: true },
        { id: "settings", label: "KI & Einstellungen", icon: Sparkles, show: can(me, "settings") },
        { id: "chatkeys", label: "Chat-Verschlüsselung", icon: KeyRound, show: can(me, "settings") },
        { id: "backup", label: "Backup", icon: Database, show: can(me, "backup") },
        { id: "database", label: "Datenbank", icon: HardDrive, show: can(me, "database") },
      ],
    },
    {
      label: "Persönlich",
      items: [{ id: "account", label: "Mein Konto", icon: UserRound, show: true }],
    },
  ];
  const groups = baseGroups.map((g) => ({ ...g, items: g.items.filter((i) => i.show) })).filter((g) => g.items.length > 0);

  const neu = inquiries.filter((i) => i.status === "neu").length;
  const activeLabel = groups.flatMap((g) => g.items).find((i) => i.id === tab)?.label ?? "";

  const NavList = (
    <nav className="space-y-5">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.label && <p className="mb-1.5 px-3 eyebrow text-muted">{g.label}</p>}
          <div className="space-y-1">
            {g.items.map((n) => {
              const I = n.icon;
              const on = tab === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => { setTab(n.id); setMenuOpen(false); }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors cursor-pointer ${on ? "bg-accent text-white" : "text-ink-soft hover:bg-canvas hover:text-ink"}`}
                >
                  <I className="h-4 w-4 shrink-0" />
                  <span className="truncate">{n.label}</span>
                  {n.id === "inquiries" && neu > 0 && <span className={`ml-auto rounded-full px-1.5 text-xs ${on ? "bg-white/25" : "bg-accent text-white"}`}>{neu}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );

  const panel = (
    <>
      {tab === "overview" && <Overview users={users} inquiries={inquiries} onGo={setTab} />}
      {tab === "users" && can(me, "users") && <UsersPanel me={me} users={users} reload={loadUsers} />}
      {tab === "inquiries" && can(me, "inquiries") && <InquiriesPanel inquiries={inquiries} reload={loadInquiries} />}
      {tab === "blog" && can(me, "blog") && <BlogPanel />}
      {tab === "reviews" && can(me, "reviews") && <ReviewsPanel canSettings={can(me, "settings")} />}
      {tab === "tickets" && can(me, "tickets") && <TicketsPanel />}
      {tab === "orders" && can(me, "orders") && <OrdersPanel />}
      {tab === "invoices" && can(me, "invoices") && <InvoicesPanel />}
      {tab === "assistant" && <AssistantPanel />}
      {tab === "support" && can(me, "support") && <SupportPanel />}
      {tab === "legal" && can(me, "legal") && <LegalPanel />}
      {tab === "finance" && can(me, "finance") && <FinancePanel />}
      {tab === "chat" && can(me, "chat") && <ChatPanel meId={me.id} isAdmin={me.role === "admin"} />}
      {tab === "activity" && can(me, "activity") && <ActivityPanel isAdmin={me.role === "admin"} />}
      {tab === "settings" && can(me, "settings") && <SettingsPanel />}
      {tab === "chatkeys" && can(me, "settings") && <ChatKeysPanel />}
      {tab === "backup" && can(me, "backup") && <BackupPanel />}
      {tab === "database" && can(me, "database") && <DatabasePanel isAdmin={me.role === "admin"} />}
      {tab === "cookies" && can(me, "cookies") && <CookiesPanel />}
      {tab === "account" && <AccountPanel me={me} onChanged={loadUsers} />}
    </>
  );

  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto flex max-w-7xl">
        {/* Sidebar (Desktop) */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white"><ShieldCheck className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="truncate font-display font-semibold tracking-tight">Admin</p>
              <p className="truncate text-xs text-muted">{me.name} · {me.role}</p>
            </div>
          </div>
          <div className="mt-6 flex-1 overflow-y-auto pr-1">{NavList}</div>
          <button onClick={logout} className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink cursor-pointer">
            <LogOut className="h-4 w-4" /> Abmelden
          </button>
        </aside>

        {/* Inhalt */}
        <div className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          {/* Mobile Kopf */}
          <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
            <div className="flex items-center gap-3">
              <button onClick={() => setMenuOpen(true)} aria-label="Menü öffnen" className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink cursor-pointer"><Menu className="h-5 w-5" /></button>
              <div>
                <h1 className="font-display text-lg font-semibold tracking-tight">{activeLabel}</h1>
                <p className="text-xs text-muted">{me.name}</p>
              </div>
            </div>
            <button onClick={logout} aria-label="Abmelden" className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface text-ink cursor-pointer"><LogOut className="h-4 w-4" /></button>
          </div>

          {panel}
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[110] bg-ink/50 backdrop-blur-sm lg:hidden" onClick={() => setMenuOpen(false)}>
          <aside className="h-full w-72 max-w-[85vw] overflow-y-auto border-r border-line bg-surface px-4 py-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-white"><ShieldCheck className="h-5 w-5" /></span>
                <p className="font-display font-semibold tracking-tight">Admin</p>
              </div>
              <button onClick={() => setMenuOpen(false)} aria-label="Menü schließen" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink cursor-pointer"><X className="h-5 w-5" /></button>
            </div>
            {NavList}
          </aside>
        </div>
      )}
    </main>
  );
}

function Stat({ icon: I, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-6">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent"><I className="h-5 w-5" /></span>
      <div className="mt-4 font-display text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-ink-soft">{label}</div>
    </div>
  );
}

function Overview({ users, inquiries, onGo }: { users: User[]; inquiries: Inquiry[]; onGo: (t: Tab) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-3">
        <button onClick={() => onGo("users")} className="text-left cursor-pointer"><Stat icon={Users} label="Benutzer" value={users.length} /></button>
        <button onClick={() => onGo("inquiries")} className="text-left cursor-pointer"><Stat icon={Inbox} label="Anfragen gesamt" value={inquiries.length} /></button>
        <button onClick={() => onGo("inquiries")} className="text-left cursor-pointer"><Stat icon={Mail} label="Neue Anfragen" value={inquiries.filter((i) => i.status === "neu").length} /></button>
      </div>
      <div className="rounded-3xl border border-line bg-surface p-6">
        <h2 className="font-display text-lg font-semibold tracking-tight">Willkommen im Admin-Bereich</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Verwalten Sie hier <b>Benutzerkonten</b> (anlegen, bearbeiten, Passwort ändern, Rollen)
          und den <b>Anfragen-Posteingang</b> aus dem Kontaktformular. Passwörter werden
          ausschließlich als bcrypt-Hash gespeichert — niemals im Klartext.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────── BENUTZER ─────────────────────────── */
function UsersPanel({ me, users, reload }: { me: User; users: User[]; reload: () => void }) {
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

/* ─────────────────────────── ANFRAGEN ─────────────────────────── */
function InquiriesPanel({ inquiries, reload }: { inquiries: Inquiry[]; reload: () => void }) {
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
