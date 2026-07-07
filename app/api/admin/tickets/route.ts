import { NextRequest, NextResponse } from "next/server";
import { readTickets, writeTickets, type Ticket } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIORITIES = ["niedrig", "mittel", "hoch"] as const;
const STATUSES = ["offen", "in_arbeit", "erledigt"] as const;

export async function GET() {
  if (!(await requirePermission("tickets"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json({ tickets: readTickets() });
}

export async function POST(req: NextRequest) {
  const me = await requirePermission("tickets");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const title = String(body?.title || "").trim().slice(0, 160);
  if (!title) return NextResponse.json({ error: "Titel erforderlich." }, { status: 400 });

  const now = new Date().toISOString();
  const t: Ticket = {
    id: `t-${Date.now()}`,
    title,
    description: String(body.description || "").slice(0, 2000),
    priority: PRIORITIES.includes(body.priority) ? body.priority : "mittel",
    status: "offen",
    assignee: String(body.assignee || "").slice(0, 80),
    dueDate: /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate || "") ? body.dueDate : undefined,
    comments: [],
    createdBy: me.name,
    createdAt: now,
    updatedAt: now,
  };
  const all = readTickets();
  all.unshift(t);
  writeTickets(all);
  logAudit(me.name, "Ticket erstellt", title);
  return NextResponse.json({ ticket: t }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const me = await requirePermission("tickets");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const all = readTickets();
  const t = all.find((x) => x.id === body.id);
  if (!t) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  if (typeof body.title === "string" && body.title.trim()) t.title = body.title.trim().slice(0, 160);
  if (typeof body.description === "string") t.description = body.description.slice(0, 2000);
  if (PRIORITIES.includes(body.priority)) t.priority = body.priority;
  if (STATUSES.includes(body.status)) t.status = body.status;
  if (typeof body.assignee === "string") t.assignee = body.assignee.slice(0, 80);
  if (typeof body.dueDate === "string") t.dueDate = /^\d{4}-\d{2}-\d{2}$/.test(body.dueDate) ? body.dueDate : undefined;
  // Kommentar anhängen (Verlauf pro Ticket).
  if (typeof body.comment === "string" && body.comment.trim()) {
    t.comments = t.comments || [];
    t.comments.push({
      id: `c-${Date.now()}`,
      author: me.name,
      text: body.comment.trim().slice(0, 1000),
      createdAt: new Date().toISOString(),
    });
    t.comments = t.comments.slice(-100);
  }
  t.updatedAt = new Date().toISOString();
  writeTickets(all);
  logAudit(me.name, "Ticket aktualisiert", `${t.title} → ${t.status}`);
  return NextResponse.json({ ticket: t });
}

export async function DELETE(req: NextRequest) {
  const me = await requirePermission("tickets");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const all = readTickets();
  const target = all.find((t) => t.id === id);
  writeTickets(all.filter((t) => t.id !== id));
  if (target) logAudit(me.name, "Ticket gelöscht", target.title);
  return NextResponse.json({ ok: true });
}
