"use client";

import { Users, Inbox, Mail } from "lucide-react";
import type { User, Inquiry, Tab } from "./types";

function Stat({ icon: I, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-6">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent-soft text-accent"><I className="h-5 w-5" /></span>
      <div className="mt-4 font-display text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-sm text-ink-soft">{label}</div>
    </div>
  );
}

/** Startansicht des Admin-Bereichs: Kennzahlen, die zugleich Sprungziele sind. */
export default function Overview({ users, inquiries, onGo }: { users: User[]; inquiries: Inquiry[]; onGo: (t: Tab) => void }) {
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
