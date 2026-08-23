import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  readSupport, writeSupport, readContent,
  SUPPORT_STATUS_LABELS, SUPPORT_PRIO_LABELS, SUPPORT_PRIOS,
  type SupportTicket, type SupportPrio, type SupportAnhang,
} from "@/lib/server/store";
import {
  newTicketNumber, normalizeNumber, makeToken, hashToken, verifyToken, hashIp,
  signMagicToken, COOKIE_ZUGRIFF, COOKIE_SITZUNG, COOKIE_ZUGRIFF_MAX_ALTER,
  COOKIE_SITZUNG_MAX_ALTER, cookieOptionen, packZugriffe, entpackZugriffe,
  herkunftOk, type Zugriff,
} from "@/lib/server/support";
import { pruefeUpload, anzeigeName, TICKET_TYPEN, TYP_MIME } from "@/lib/server/upload";
import { rateLimit } from "@/lib/server/ratelimit";
import { supportCreateSchema, supportReplySchema } from "@/lib/server/validation";
import { logAudit } from "@/lib/server/audit";
import { sendMail, mailLayout, smtpConfigured } from "@/lib/server/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const MAX_ANHANG = 6 * 1024 * 1024;
const MAX_ANHAENGE_PRO_NACHRICHT = 3;

function clientIp(req: NextRequest): string {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

/**
 * Öffentliche Sicht auf ein Ticket. Gibt NIE tokenHash, ipHash oder interne
 * Notizen heraus — die Auswahl ist bewusst eine Positivliste, damit ein neues
 * Feld im Datenmodell nicht versehentlich nach außen gelangt.
 */
function publicView(t: SupportTicket) {
  return {
    number: t.number,
    name: t.name,
    subject: t.subject,
    status: t.status,
    statusLabel: SUPPORT_STATUS_LABELS[t.status],
    prio: t.prio,
    prioLabel: SUPPORT_PRIO_LABELS[t.prio],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messages: t.messages
      .filter((m) => !m.intern)
      .map((m) => ({ from: m.from, text: m.text, createdAt: m.createdAt, anhaenge: m.anhaenge || [] })),
  };
}

/** Alle Tickets, auf die dieser Browser laut Cookie Zugriff hat. */
function meineTickets(req: NextRequest) {
  const zugriffe = entpackZugriffe(req.cookies.get(COOKIE_ZUGRIFF)?.value);
  const alle = readSupport();
  const treffer: { ticket: SupportTicket; zugriff: Zugriff }[] = [];
  for (const z of zugriffe) {
    const t = alle.find((x) => x.number === z.number);
    if (t && verifyToken(z.token, t.tokenHash)) treffer.push({ ticket: t, zugriff: z });
  }
  return { treffer, zugriffe };
}

/* ─────────────────────────────── GET ─────────────────────────────── */
/**
 * Ohne Parameter: alle Tickets aus dem HttpOnly-Cookie — der Browser muss
 * dafür kein Geheimnis in JavaScript halten.
 * Mit `?number=&token=`: manueller Zugriff (anderes Gerät, Code notiert).
 * Der Zugriff wird dann zusätzlich in den Cookie übernommen.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const number = url.searchParams.get("number");
  const token = url.searchParams.get("token");

  if (number && token) {
    if (!(await rateLimit(`support-read:${clientIp(req)}`, 40, 60 * 60 * 1000)).ok) {
      return NextResponse.json({ error: "Zu viele Abfragen — bitte später erneut versuchen." }, { status: 429 });
    }
    const nr = normalizeNumber(number);
    const alle = readSupport();
    const t = alle.find((x) => x.number === nr);
    // Identische Antwort für „gibt es nicht" und „Code falsch" — sonst ließe
    // sich über die Fehlermeldung herausfinden, welche Nummern existieren.
    if (!t || !verifyToken(token, t.tokenHash)) {
      return NextResponse.json({ error: "Ticket nicht gefunden oder Zugriffscode ungültig." }, { status: 404 });
    }
    const { zugriffe } = meineTickets(req);
    const neu = [...zugriffe.filter((z) => z.number !== nr), { number: nr, token }];
    const res = NextResponse.json({ ticket: publicView(t), tickets: [publicView(t)] });
    res.cookies.set(COOKIE_ZUGRIFF, packZugriffe(neu), cookieOptionen(req, COOKIE_ZUGRIFF_MAX_ALTER));
    res.cookies.set(COOKIE_SITZUNG, nr, cookieOptionen(req, COOKIE_SITZUNG_MAX_ALTER));
    return res;
  }

  const { treffer } = meineTickets(req);
  const offen = req.cookies.get(COOKIE_SITZUNG)?.value || null;
  return NextResponse.json({
    tickets: treffer
      .map((x) => publicView(x.ticket))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    offen,
  });
}

/* ─────────────────────────────── POST ─────────────────────────────── */
/**
 * Neues Ticket. Nimmt entweder JSON oder multipart/form-data (mit Anhängen).
 * Antwort enthält den Zugriffscode EINMAL, damit der Kunde ihn notieren kann;
 * dauerhaft lebt er im HttpOnly-Cookie und im Magic-Link der E-Mail.
 */
export async function POST(req: NextRequest) {
  if (!herkunftOk(req)) return NextResponse.json({ error: "Ungültige Herkunft." }, { status: 403 });

  const ip = clientIp(req);
  if (!(await rateLimit(`support-create:${ip}`, 5, 60 * 60 * 1000)).ok) {
    return NextResponse.json({ error: "Zu viele neue Tickets — bitte später erneut versuchen." }, { status: 429 });
  }

  const { felder, dateien, fehler } = await leseEingabe(req);
  if (fehler) return NextResponse.json({ error: fehler.text }, { status: fehler.status });

  // Honeypot: Bots füllen das versteckte Feld aus, Menschen nicht.
  if (felder.website) return NextResponse.json({ ok: true, number: "TK-0000-0000-0000" }, { status: 201 });

  // Ein Schema für BEIDE Übertragungswege (JSON und multipart) — `leseEingabe`
  // hat sie oben bereits in dieselbe flache Form gebracht.
  const geprueft = supportCreateSchema.safeParse(felder);
  if (!geprueft.success) {
    return NextResponse.json({ error: geprueft.error.issues[0].message }, { status: 400 });
  }
  const { name, email, subject, message } = geprueft.data;
  const prio: SupportPrio = SUPPORT_PRIOS.includes(felder.prio as SupportPrio) ? (felder.prio as SupportPrio) : "mittel";

  const anhaenge = speichereAnhaenge(dateien);
  if ("error" in anhaenge) return NextResponse.json({ error: anhaenge.error }, { status: anhaenge.status });

  const all = readSupport();
  const token = makeToken();
  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    number: newTicketNumber(all),
    tokenHash: hashToken(token),
    name, email, subject,
    status: "offen",
    prio,
    ipHash: hashIp(ip),
    messages: [{ id: `m-${Date.now()}`, from: "kunde", text: message, createdAt: now, anhaenge: anhaenge.liste }],
    log: [{ at: now, action: `Ticket erstellt · Priorität ${SUPPORT_PRIO_LABELS[prio]}`, by: name }],
    createdAt: now,
    updatedAt: now,
  };
  all.unshift(ticket);
  writeSupport(all.slice(0, 5000));
  logAudit(name, "Support-Ticket erstellt", `${ticket.number} · ${subject}`);

  // Benachrichtigung mit geschütztem Magic-Link (signiert, 14 Tage gültig).
  void benachrichtige(req, ticket, token);

  const res = NextResponse.json(
    { ok: true, number: ticket.number, token, ticket: publicView(ticket), mailVersandt: smtpConfigured() },
    { status: 201 }
  );
  const { zugriffe } = meineTickets(req);
  res.cookies.set(
    COOKIE_ZUGRIFF,
    packZugriffe([...zugriffe, { number: ticket.number, token }]),
    cookieOptionen(req, COOKIE_ZUGRIFF_MAX_ALTER)
  );
  res.cookies.set(COOKIE_SITZUNG, ticket.number, cookieOptionen(req, COOKIE_SITZUNG_MAX_ALTER));
  return res;
}

/* ─────────────────────────────── PATCH ─────────────────────────────── */
/** Kundenantwort. Der Zugriff kommt aus dem Cookie, nicht aus dem Request-Body. */
export async function PATCH(req: NextRequest) {
  if (!herkunftOk(req)) return NextResponse.json({ error: "Ungültige Herkunft." }, { status: 403 });

  const ip = clientIp(req);
  if (!(await rateLimit(`support-reply:${ip}`, 30, 60 * 60 * 1000)).ok) {
    return NextResponse.json({ error: "Zu viele Nachrichten — bitte später erneut versuchen." }, { status: 429 });
  }

  const { felder, dateien, fehler } = await leseEingabe(req);
  if (fehler) return NextResponse.json({ error: fehler.text }, { status: fehler.status });

  const geprueft = supportReplySchema.safeParse(felder);
  if (!geprueft.success) {
    return NextResponse.json({ error: geprueft.error.issues[0].message }, { status: 400 });
  }
  const nr = normalizeNumber(geprueft.data.number);
  const text = geprueft.data.text;
  if (!nr) return NextResponse.json({ error: "Ticketnummer fehlt." }, { status: 400 });
  if (text.length < 1 && dateien.length === 0) {
    return NextResponse.json({ error: "Bitte Text eingeben oder eine Datei anhängen." }, { status: 400 });
  }

  // Berechtigung ausschließlich aus dem signierten HttpOnly-Cookie.
  const { treffer } = meineTickets(req);
  const eintrag = treffer.find((x) => x.ticket.number === nr);
  if (!eintrag) return NextResponse.json({ error: "Ticket nicht gefunden oder Zugriffscode ungültig." }, { status: 404 });

  const all = readSupport();
  const t = all.find((x) => x.number === nr)!;
  if (t.status === "geschlossen") return NextResponse.json({ error: "Dieses Ticket ist geschlossen." }, { status: 409 });

  const anhaenge = speichereAnhaenge(dateien);
  if ("error" in anhaenge) return NextResponse.json({ error: anhaenge.error }, { status: anhaenge.status });

  const now = new Date().toISOString();
  t.messages.push({ id: `m-${Date.now()}`, from: "kunde", text, createdAt: now, anhaenge: anhaenge.liste });
  // Kunde meldet sich zurück → Ticket ist wieder am Team.
  if (t.status === "warten_kunde" || t.status === "geloest") t.status = "offen";
  t.log.push({ at: now, action: "Kundenantwort eingegangen", by: t.name });
  t.updatedAt = now;
  writeSupport(all);

  const res = NextResponse.json({ ticket: publicView(t) });
  res.cookies.set(COOKIE_SITZUNG, nr, cookieOptionen(req, COOKIE_SITZUNG_MAX_ALTER));
  return res;
}

/* ─────────────────────────────── DELETE ─────────────────────────────── */
/** Abmelden: entfernt die Zugriffs-Cookies aus diesem Browser (löscht kein Ticket). */
export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_ZUGRIFF, "", { ...cookieOptionen(req, 0), maxAge: 0 });
  res.cookies.set(COOKIE_SITZUNG, "", { ...cookieOptionen(req, 0), maxAge: 0 });
  return res;
}

/* ───────────────────────────── Hilfsfunktionen ───────────────────────────── */

type Eingabe = {
  felder: { name: string; email: string; subject: string; message: string; text: string; number: string; prio: string; website: string };
  dateien: { name: string; buf: Buffer }[];
  fehler?: { text: string; status: number };
};

/** Liest JSON oder multipart/form-data in eine gemeinsame, getrimmte Form. */
async function leseEingabe(req: NextRequest): Promise<Eingabe> {
  const leer: Eingabe["felder"] = { name: "", email: "", subject: "", message: "", text: "", number: "", prio: "", website: "" };
  const typ = req.headers.get("content-type") || "";

  if (typ.includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return { felder: leer, dateien: [], fehler: { text: "Ungültige Anfrage.", status: 400 } };
    const s = (k: string) => String(form.get(k) ?? "").trim();
    const dateien: { name: string; buf: Buffer }[] = [];
    for (const wert of form.getAll("dateien")) {
      if (!(wert instanceof File) || wert.size === 0) continue;
      if (dateien.length >= MAX_ANHAENGE_PRO_NACHRICHT) {
        return { felder: leer, dateien: [], fehler: { text: `Höchstens ${MAX_ANHAENGE_PRO_NACHRICHT} Dateien pro Nachricht.`, status: 400 } };
      }
      if (wert.size > MAX_ANHANG) {
        return { felder: leer, dateien: [], fehler: { text: `„${anzeigeName(wert.name)}" ist zu groß (max. ${MAX_ANHANG / 1024 / 1024} MB).`, status: 413 } };
      }
      dateien.push({ name: wert.name, buf: Buffer.from(await wert.arrayBuffer()) });
    }
    return {
      felder: { name: s("name"), email: s("email"), subject: s("subject"), message: s("message"), text: s("text"), number: s("number"), prio: s("prio"), website: s("website") },
      dateien,
    };
  }

  const body = await req.json().catch(() => null);
  if (!body) return { felder: leer, dateien: [], fehler: { text: "Ungültige Anfrage.", status: 400 } };
  const s = (k: string) => String((body as Record<string, unknown>)[k] ?? "").trim();
  return {
    felder: { name: s("name"), email: s("email"), subject: s("subject"), message: s("message"), text: s("text"), number: s("number"), prio: s("prio"), website: s("website") },
    dateien: [],
  };
}

/**
 * Speichert Anhänge nach vollständiger Inhaltsprüfung. Der Dateiname auf der
 * Platte wird neu gebildet — der vom Nutzer geschickte Name landet nie im
 * Dateisystem, nur als Anzeigetext.
 */
function speichereAnhaenge(dateien: { name: string; buf: Buffer }[]):
  | { liste: SupportAnhang[] }
  | { error: string; status: number } {
  if (dateien.length === 0) return { liste: [] };
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  const liste: SupportAnhang[] = [];
  for (const d of dateien) {
    const pruefung = pruefeUpload(d.buf, d.name, TICKET_TYPEN, MAX_ANHANG);
    if (!pruefung.ok) return { error: `„${anzeigeName(d.name)}": ${pruefung.fehler}`, status: pruefung.status ?? 415 };
    fs.writeFileSync(path.join(UPLOAD_DIR, pruefung.dateiname!), d.buf);
    liste.push({
      name: anzeigeName(d.name),
      url: `/api/uploads/${pruefung.dateiname!}`,
      mime: TYP_MIME[pruefung.typ!],
      size: d.buf.length,
    });
  }
  return { liste };
}

/** HTML-Escape für alles, was aus Nutzereingaben in die E-Mail wandert. */
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Bestätigungs-E-Mail mit signiertem, befristetem Magic-Link. */
async function benachrichtige(req: NextRequest, t: SupportTicket, token: string) {
  if (!smtpConfigured()) return;
  const c = readContent();
  const basis = new URL(req.url).origin;
  const link = `${basis}/support/zugang?t=${encodeURIComponent(signMagicToken(t.number, token))}`;
  const html = mailLayout(
    "Ihr Ticket ist bei uns eingegangen",
    `<p style="font-size:15px;line-height:1.6;">Hallo ${esc(t.name)},</p>
     <p style="font-size:15px;line-height:1.6;">wir haben Ihre Anfrage <strong>„${esc(t.subject)}"</strong> aufgenommen.</p>
     <table style="font-size:14px;margin:16px 0;">
       <tr><td style="padding:2px 12px 2px 0;color:#8a7f70;">Ticketnummer</td><td><strong>${esc(t.number)}</strong></td></tr>
       <tr><td style="padding:2px 12px 2px 0;color:#8a7f70;">Priorität</td><td>${SUPPORT_PRIO_LABELS[t.prio]}</td></tr>
       <tr><td style="padding:2px 12px 2px 0;color:#8a7f70;">Zugriffscode</td><td style="font-family:monospace;">${esc(token)}</td></tr>
     </table>
     <p style="margin:20px 0;">
       <a href="${link}" style="display:inline-block;background:#b0543a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:15px;">Ticket öffnen</a>
     </p>
     <p style="font-size:13px;line-height:1.6;color:#8a7f70;">Der Link ist 14 Tage gültig und nur für Sie bestimmt — bitte nicht weitergeben. Danach öffnen Sie Ihr Ticket mit Nummer und Zugriffscode.</p>
     <p style="font-size:13px;line-height:1.6;color:#8a7f70;">Rückfragen? ${esc(c.email)} · ${esc(c.phone)}</p>`
  );
  await sendMail(t.email, `[${t.number}] ${t.subject}`, html);
}
