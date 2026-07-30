import { NextRequest, NextResponse } from "next/server";
import { readSupport, writeSupport, SUPPORT_STATUS_LABELS, type SupportStatus } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: SupportStatus[] = ["offen", "in_bearbeitung", "beantwortet", "geschlossen"];

// Admin: alle Support-Tickets inkl. Kontaktdaten & Verlauf (ohne tokenHash/ipHash).
export async function GET() {
  if (!(await requirePermission("support"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const tickets = readSupport().map((t) => ({
    id: t.id, number: t.number, name: t.name, email: t.email, subject: t.subject,
    status: t.status, statusLabel: SUPPORT_STATUS_LABELS[t.status],
    messages: t.messages, createdAt: t.createdAt, updatedAt: t.updatedAt,
  }));
  return NextResponse.json({ tickets });
}

// Admin: Status ändern und/oder Team-Antwort anhängen.
export async function PATCH(req: NextRequest) {
  const me = await requirePermission("support");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  const all = readSupport();
  const t = all.find((x) => x.id === body.id);
  if (!t) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  const reply = typeof body.reply === "string" ? body.reply.trim().slice(0, 4000) : "";
  if (reply) {
    t.messages.push({ id: `m-${Date.now()}`, from: "team", text: reply, createdAt: new Date().toISOString() });
    t.status = "beantwortet";
  }
  if (STATUSES.includes(body.status)) t.status = body.status;
  t.updatedAt = new Date().toISOString();
  writeSupport(all);
  logAudit(me.name, "Support-Ticket bearbeitet", `${t.number}${reply ? " · Antwort" : ""} → ${t.status}`);
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
