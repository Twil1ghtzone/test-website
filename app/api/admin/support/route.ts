import { NextRequest, NextResponse } from "next/server";
import {
  readSupport, writeSupport, readContent,
  SUPPORT_STATUS_LABELS, SUPPORT_STATUS, SUPPORT_PRIO_LABELS, SUPPORT_PRIOS,
  type SupportStatus, type SupportPrio,
} from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";
import { sendMail, mailLayout, smtpConfigured } from "@/lib/server/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-Sicht: alle Tickets inkl. Kontaktdaten, Verlauf und internen Notizen.
 * tokenHash und ipHash bleiben auch hier drin — sie werden bewusst nicht
 * ausgeliefert, damit ein kompromittiertes Admin-Konto nicht gleich alle
 * Kunden-Zugriffscodes mitnimmt (der Hash ist ohnehin nicht umkehrbar).
 */
export async function GET() {
  if (!(await requirePermission("support"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const tickets = readSupport().map((t) => ({
    id: t.id, number: t.number, name: t.name, email: t.email, subject: t.subject,
    status: t.status, statusLabel: SUPPORT_STATUS_LABELS[t.status],
    prio: t.prio, prioLabel: SUPPORT_PRIO_LABELS[t.prio],
    bearbeiter: t.bearbeiter ?? "",
    messages: t.messages, log: t.log,
    createdAt: t.createdAt, updatedAt: t.updatedAt,
  }));
  return NextResponse.json({
    tickets,
    status: SUPPORT_STATUS.map((s) => ({ key: s, label: SUPPORT_STATUS_LABELS[s] })),
    prios: SUPPORT_PRIOS.map((p) => ({ key: p, label: SUPPORT_PRIO_LABELS[p] })),
    mailBereit: smtpConfigured(),
  });
}

/** Antwort schreiben, interne Notiz anlegen, Status/Priorität/Zuordnung ändern. */
export async function PATCH(req: NextRequest) {
  const me = await requirePermission("support");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  const all = readSupport();
  const t = all.find((x) => x.id === body.id);
  if (!t) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const now = new Date().toISOString();
  const reply = typeof body.reply === "string" ? body.reply.trim().slice(0, 4000) : "";
  const notiz = typeof body.notiz === "string" ? body.notiz.trim().slice(0, 4000) : "";
  let benachrichtigen = false;

  if (reply) {
    t.messages.push({ id: `m-${Date.now()}`, from: "team", text: reply, createdAt: now });
    // Nach einer Antwort liegt der Ball beim Kunden.
    t.status = "warten_kunde";
    t.log.push({ at: now, action: "Antwort an den Kunden gesendet", by: me.name });
    benachrichtigen = true;
  }
  if (notiz) {
    // Interne Notiz: `intern` sorgt dafür, dass publicView sie herausfiltert.
    t.messages.push({ id: `n-${Date.now()}`, from: "team", text: notiz, createdAt: now, intern: true });
    t.log.push({ at: now, action: "Interne Notiz hinzugefügt", by: me.name });
  }
  if (SUPPORT_STATUS.includes(body.status as SupportStatus) && body.status !== t.status) {
    t.status = body.status as SupportStatus;
    t.log.push({ at: now, action: `Status → ${SUPPORT_STATUS_LABELS[t.status]}`, by: me.name });
  }
  if (SUPPORT_PRIOS.includes(body.prio as SupportPrio) && body.prio !== t.prio) {
    t.prio = body.prio as SupportPrio;
    t.log.push({ at: now, action: `Priorität → ${SUPPORT_PRIO_LABELS[t.prio]}`, by: me.name });
  }
  if (typeof body.bearbeiter === "string") {
    const neu = body.bearbeiter.trim().slice(0, 60);
    if (neu !== (t.bearbeiter ?? "")) {
      t.bearbeiter = neu;
      t.log.push({ at: now, action: neu ? `Zugewiesen an ${neu}` : "Zuweisung entfernt", by: me.name });
    }
  }

  t.updatedAt = now;
  writeSupport(all);
  logAudit(me.name, "Support-Ticket bearbeitet", `${t.number}${reply ? " · Antwort" : ""} → ${SUPPORT_STATUS_LABELS[t.status]}`);

  // Der Kunde bekommt einen neuen, frisch befristeten Magic-Link. Der
  // Zugriffscode steht dem Admin nicht zur Verfügung (nur der Hash liegt
  // gespeichert) — deshalb verweist die Mail auf die Ticket-Startseite.
  if (benachrichtigen && smtpConfigured()) void informiereKunden(req, t.number, t.subject, t.name, t.email, reply);

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const me = await requirePermission("support");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const all = readSupport();
  const target = all.find((t) => t.id === id);
  writeSupport(all.filter((t) => t.id !== id));
  if (target) logAudit(me.name, "Support-Ticket gelöscht", target.number);
  return NextResponse.json({ ok: true });
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function informiereKunden(
  req: NextRequest, number: string, subject: string, name: string, email: string, antwort: string
) {
  const c = readContent();
  const basis = new URL(req.url).origin;
  const html = mailLayout(
    "Neue Antwort zu Ihrem Ticket",
    `<p style="font-size:15px;line-height:1.6;">Hallo ${esc(name)},</p>
     <p style="font-size:15px;line-height:1.6;">es gibt eine neue Antwort zu <strong>${esc(number)}</strong> — „${esc(subject)}":</p>
     <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #b0543a;background:#f6f2ea;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(antwort.slice(0, 1200))}</blockquote>
     <p style="margin:20px 0;">
       <a href="${basis}/support" style="display:inline-block;background:#b0543a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:15px;">Ticket öffnen und antworten</a>
     </p>
     <p style="font-size:13px;line-height:1.6;color:#8a7f70;">Falls Sie nicht mehr angemeldet sind: Ticketnummer <strong>${esc(number)}</strong> und Ihr Zugriffscode aus der ersten E-Mail öffnen das Ticket.</p>
     <p style="font-size:13px;line-height:1.6;color:#8a7f70;">Rückfragen? ${esc(c.email)} · ${esc(c.phone)}</p>`
  );
  await sendMail(email, `[${number}] Neue Antwort — ${subject}`, html);
}
