"use client";

import { Cookie, ShieldCheck, Info } from "lucide-react";

type CookieInfo = {
  name: string;
  purpose: string;
  category: "Notwendig" | "Funktional" | "Analyse" | "Marketing";
  duration: string;
  provider: string;
  flags: string[];
};

// Vollständige Liste aller Cookies, die diese Website setzt.
// Alle sind First-Party, technisch notwendig und tracken nichts.
const COOKIES: CookieInfo[] = [
  {
    name: "sl_session",
    purpose:
      "Admin-Sitzung: hält die Anmeldung im geschützten Admin-Bereich aufrecht (HMAC-signiert, kein personenbezogenes Tracking).",
    category: "Notwendig",
    duration: "8 Stunden",
    provider: "Diese Website (First-Party)",
    flags: ["HttpOnly", "SameSite=Lax", "Secure (HTTPS)", "signiert"],
  },
  {
    name: "sl_ticket_auth",
    purpose:
      "Support-Tickets: enthält signiert, auf welche Tickets dieser Browser zugreifen darf (Ticketnummer + Zugriffscode). Dadurch bleibt ein Ticket ohne Konto und ohne Passwort geöffnet. Weil der Cookie HttpOnly ist, kann JavaScript ihn nicht auslesen — ein XSS könnte die Zugriffscodes also nicht abgreifen.",
    category: "Notwendig",
    duration: "90 Tage",
    provider: "Diese Website (First-Party)",
    flags: ["HttpOnly", "SameSite=Strict", "Secure (HTTPS)", "signiert"],
  },
  {
    name: "sl_ticket_session",
    purpose:
      "Support-Tickets: merkt sich, welches Ticket zuletzt geöffnet war, damit die Seite direkt dort weitermacht. Enthält ausschließlich die Ticketnummer, kein Geheimnis.",
    category: "Notwendig",
    duration: "30 Tage",
    provider: "Diese Website (First-Party)",
    flags: ["HttpOnly", "SameSite=Strict", "Secure (HTTPS)"],
  },
  {
    name: "sl_chat_session",
    purpose:
      "KI-Support-Chat: hält die laufende Unterhaltung mit dem Assistenten, damit man die Seite verlassen und später zurückkehren kann. Der Cookie enthält nur eine Sitzungs-Kennung und ein Geheimnis, niemals Gesprächsinhalte. Die Nachrichten selbst liegen hüllenverschlüsselt auf dem Server (RSA-2048 über AES-256-GCM, eigenes Schlüsselpaar je Gespräch — Details unter „Chat-Verschlüsselung”). Löscht sich automatisch nach 7 Tagen Inaktivität oder sofort per „Neuer Chat”-Knopf.",
    category: "Notwendig",
    duration: "7 Tage, rollierend (verlängert sich mit jeder Nachricht)",
    provider: "Diese Website (First-Party)",
    flags: ["HttpOnly", "SameSite=Strict", "Secure (HTTPS)", "signiert"],
  },
];

// Geprüft am 31.07.2026: Die Seite verwendet weder localStorage noch
// sessionStorage, und kein einziges Cookie wird per JavaScript gesetzt.
// Alle Cookies kommen ausschließlich vom Server und sind HttpOnly.
// Sollte sich das ändern, gehört der neue Eintrag hierher.

export default function CookiesPanel() {
  const badge: Record<CookieInfo["category"], string> = {
    Notwendig: "bg-emerald-100 text-emerald-700",
    Funktional: "bg-sky-100 text-sky-700",
    Analyse: "bg-amber-100 text-amber-700",
    Marketing: "bg-rose-100 text-rose-700",
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent"><Cookie className="h-5 w-5" /></span>
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Cookies</h2>
          <p className="text-sm text-muted">Alle Cookies, die diese Website verwendet.</p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <p className="text-sm leading-relaxed text-emerald-900">
          Diese Seite setzt <b>keine Tracking-, Analyse- oder Marketing-Cookies</b> und lädt keine Drittanbieter-Skripte
          (kein Google Analytics, keine Werbe-Pixel). Es wird ausschließlich das technisch notwendige Sitzungs-Cookie
          für den Admin-Login verwendet — cloud-frei und datensparsam.
        </p>
      </div>

      <div className="space-y-4">
        {COOKIES.map((c) => (
          <div key={c.name} className="rounded-3xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold text-ink">{c.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge[c.category]}`}>{c.category}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{c.purpose}</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div><dt className="eyebrow text-muted">Anbieter</dt><dd className="mt-0.5 text-sm text-ink">{c.provider}</dd></div>
              <div><dt className="eyebrow text-muted">Speicherdauer</dt><dd className="mt-0.5 text-sm text-ink">{c.duration}</dd></div>
              <div>
                <dt className="eyebrow text-muted">Merkmale</dt>
                <dd className="mt-0.5 flex flex-wrap gap-1">
                  {c.flags.map((f) => <span key={f} className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-soft">{f}</span>)}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="flex items-start gap-3 rounded-2xl border border-line bg-canvas p-4 text-sm text-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Wird künftig ein Dienst ergänzt, der weitere Cookies setzt (z. B. Karten oder Videos), erscheint er
          automatisch in dieser Liste, sobald er hier eingetragen wird. Aktuell ist <b>1</b> Cookie im Einsatz.
        </p>
      </div>
    </div>
  );
}
