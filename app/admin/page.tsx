"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  ShieldCheck, LogOut, Users, Inbox, LayoutDashboard, X, Loader2,
  Sparkles, Database, FileText, Cookie, Star, Ticket, Hammer, Wallet,
  MessageCircle, History, HardDrive, UserRound, Menu, Receipt, Bot,
  LifeBuoy, Scale, KeyRound,
} from "lucide-react";

/*
 * Jedes Panel per next/dynamic statt statischem Import: nur das Panel des
 * gerade aktiven Tabs (siehe `tab === "…" && <…Panel/>` weiter unten) wird
 * überhaupt geladen, nicht alle 17 auf einmal beim ersten Öffnen von /admin.
 * `ssr: false`, weil jedes Panel ohnehin erst nach Login (Client-State)
 * sichtbar wird — serverseitiges Rendern bringt hier nichts.
 */
const panelLoading = () => <div className="py-16 text-center text-sm text-muted">Lädt…</div>;
const SettingsPanel = dynamic(() => import("@/components/admin/SettingsPanel"), { ssr: false, loading: panelLoading });
const BackupPanel = dynamic(() => import("@/components/admin/BackupPanel"), { ssr: false, loading: panelLoading });
const BlogPanel = dynamic(() => import("@/components/admin/BlogPanel"), { ssr: false, loading: panelLoading });
const CookiesPanel = dynamic(() => import("@/components/admin/CookiesPanel"), { ssr: false, loading: panelLoading });
const ReviewsPanel = dynamic(() => import("@/components/admin/ReviewsPanel"), { ssr: false, loading: panelLoading });
const TicketsPanel = dynamic(() => import("@/components/admin/TicketsPanel"), { ssr: false, loading: panelLoading });
const OrdersPanel = dynamic(() => import("@/components/admin/OrdersPanel"), { ssr: false, loading: panelLoading });
const FinancePanel = dynamic(() => import("@/components/admin/FinancePanel"), { ssr: false, loading: panelLoading });
const ChatPanel = dynamic(() => import("@/components/admin/ChatPanel"), { ssr: false, loading: panelLoading });
const ActivityPanel = dynamic(() => import("@/components/admin/ActivityPanel"), { ssr: false, loading: panelLoading });
const DatabasePanel = dynamic(() => import("@/components/admin/DatabasePanel"), { ssr: false, loading: panelLoading });
const AccountPanel = dynamic(() => import("@/components/admin/AccountPanel"), { ssr: false, loading: panelLoading });
const InvoicesPanel = dynamic(() => import("@/components/admin/InvoicesPanel"), { ssr: false, loading: panelLoading });
const AssistantPanel = dynamic(() => import("@/components/admin/AssistantPanel"), { ssr: false, loading: panelLoading });
const SupportPanel = dynamic(() => import("@/components/admin/SupportPanel"), { ssr: false, loading: panelLoading });
const LegalPanel = dynamic(() => import("@/components/admin/LegalPanel"), { ssr: false, loading: panelLoading });
const ChatKeysPanel = dynamic(() => import("@/components/admin/ChatKeysPanel"), { ssr: false, loading: panelLoading });

import { hatBerechtigung, type Permission } from "@/lib/permissions";
import type { User, Inquiry, Tab } from "@/components/admin/types";

/*
 * Anmeldung, Startansicht, Benutzerverwaltung und Posteingang liegen in
 * eigenen Dateien unter components/admin/. Vorher standen sie alle in
 * dieser Datei (574 Zeilen), was jede Änderung an einem Bereich zu einem
 * Eingriff in die zentrale Seite machte.
 *
 * LoginScreen wird STATISCH importiert, nicht per next/dynamic: Er ist das
 * Erste, was ein nicht angemeldeter Besucher sieht — ihn nachzuladen würde
 * genau an dieser Stelle einen unnötigen Ladezustand erzeugen. Die
 * Fach-Panels darüber sind dagegen erst nach dem Anmelden und nur einzeln
 * sichtbar, dort lohnt das Nachladen.
 */
import LoginScreen from "@/components/admin/LoginScreen";
import Overview from "@/components/admin/Overview";
import UsersPanel from "@/components/admin/UsersPanel";
import InquiriesPanel from "@/components/admin/InquiriesPanel";

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

