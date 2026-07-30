import { NextRequest, NextResponse } from "next/server";
import { readSupport, writeSupport, SUPPORT_STATUS_LABELS, type SupportTicket } from "@/lib/server/store";
import { nextTicketNumber, makeToken, hashToken, verifyToken, hashIp } from "@/lib/server/support";
import { rateLimit } from "@/lib/server/ratelimit";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

// Öffentliche, sichere Sicht auf ein Ticket (nie tokenHash/ipHash rausgeben).
function publicView(t: SupportTicket) {
  return {
    number: t.number,
    name: t.name,
    subject: t.subject,
    status: t.status,
    statusLabel: SUPPORT_STATUS_LABELS[t.status],
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    messages: t.messages.map((m) => ({ from: m.from, text: m.text, createdAt: m.createdAt })),
  };
}

// GET ?number=&token= → Ticketstatus + Verlauf (nur mit gültigem Token).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const number = (url.searchParams.get("number") || "").trim().toUpperCase();
  const token = url.searchParams.get("token") || "";
  if (!number || !token) return NextResponse.json({ error: "Ticketnummer und Zugriffscode nötig." }, { status: 400 });

  const t = readSupport().find((x) => x.number === number);
  if (!t || !verifyToken(token, t.tokenHash)) {
    // Kein Unterschied zwischen „nicht gefunden" und „falsches Token" (kein Enumerieren).
    return NextResponse.json({ error: "Ticket nicht gefunden oder Zugriffscode ungültig." }, { status: 404 });
  }
  return NextResponse.json({ ticket: publicView(t) });
}

// POST → neues Ticket. Gibt Nummer + Token zurück (Client speichert es im Cookie).
export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`support-create:${ip}`, 5, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Zu viele neue Tickets — bitte später erneut versuchen." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  // Honeypot
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true, number: "TS-0000-000", token: "x" }, { status: 201 });
  }

  const name = String(body.name || "").trim().slice(0, 80);
  const email = String(body.email || "").trim().slice(0, 160);
  const subject = String(body.subject || "").trim().slice(0, 160);
  const message = String(body.message || "").trim().slice(0, 4000);
  if (name.length < 2) return NextResponse.json({ error: "Bitte einen Namen angeben." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "Bitte eine gültige E-Mail angeben." }, { status: 400 });
  if (!subject) return NextResponse.json({ error: "Bitte einen Betreff angeben." }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "Bitte beschreiben Sie Ihr Anliegen (min. 10 Zeichen)." }, { status: 400 });

  const all = readSupport();
  const token = makeToken();
  const now = new Date().toISOString();
  const ticket: SupportTicket = {
    id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    number: nextTicketNumber(all),
    tokenHash: hashToken(token),
    name, email, subject,
    status: "offen",
    ipHash: hashIp(ip),
    messages: [{ id: `m-${Date.now()}`, from: "kunde", text: message, createdAt: now }],
    createdAt: now,
    updatedAt: now,
  };
  all.unshift(ticket);
  writeSupport(all.slice(0, 5000));
  logAudit(name, "Support-Ticket erstellt", `${ticket.number} · ${subject}`);
  return NextResponse.json({ ok: true, number: ticket.number, token }, { status: 201 });
}

// PATCH → Kundenantwort an ein bestehendes Ticket (Nummer + Token).
export async function PATCH(req: NextRequest) {
  const ip = clientIp(req);
  if (!rateLimit(`support-reply:${ip}`, 30, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Zu viele Nachrichten — bitte später erneut versuchen." }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const number = String(body?.number || "").trim().toUpperCase();
  const token = String(body?.token || "");
  const text = String(body?.text || "").trim().slice(0, 4000);
  if (!number || !token || text.length < 1) return NextResponse.json({ error: "Nummer, Zugriffscode und Text nötig." }, { status: 400 });

  const all = readSupport();
  const t = all.find((x) => x.number === number);
  if (!t || !verifyToken(token, t.tokenHash)) {
    return NextResponse.json({ error: "Ticket nicht gefunden oder Zugriffscode ungültig." }, { status: 404 });
  }
  if (t.status === "geschlossen") return NextResponse.json({ error: "Dieses Ticket ist geschlossen." }, { status: 409 });

  t.messages.push({ id: `m-${Date.now()}`, from: "kunde", text, createdAt: new Date().toISOString() });
  if (t.status === "beantwortet") t.status = "offen"; // Kunde meldet sich wieder
  t.updatedAt = new Date().toISOString();
  writeSupport(all);
  return NextResponse.json({ ticket: publicView(t) });
}
