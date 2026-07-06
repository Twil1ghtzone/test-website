import { NextRequest, NextResponse } from "next/server";
import { readOrders, writeOrders, type Order } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["angefragt", "geplant", "in_arbeit", "abgeschlossen"] as const;

export async function GET() {
  if (!(await requirePermission("orders"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json({ orders: readOrders() });
}

export async function POST(req: NextRequest) {
  const me = await requirePermission("orders");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const customer = String(body?.customer || "").trim().slice(0, 120);
  const title = String(body?.title || "").trim().slice(0, 160);
  if (!customer || !title) return NextResponse.json({ error: "Kunde und Titel erforderlich." }, { status: 400 });

  const now = new Date().toISOString();
  const o: Order = {
    id: `o-${Date.now()}`,
    customer,
    title,
    status: STATUSES.includes(body.status) ? body.status : "angefragt",
    value: Math.max(0, Number(body.value) || 0),
    notes: String(body.notes || "").slice(0, 2000),
    createdAt: now,
    updatedAt: now,
  };
  const all = readOrders();
  all.unshift(o);
  writeOrders(all);
  logAudit(me.name, "Auftrag angelegt", `${customer} — ${title}`);
  return NextResponse.json({ order: o }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const me = await requirePermission("orders");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const all = readOrders();
  const o = all.find((x) => x.id === body.id);
  if (!o) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  if (typeof body.customer === "string" && body.customer.trim()) o.customer = body.customer.trim().slice(0, 120);
  if (typeof body.title === "string" && body.title.trim()) o.title = body.title.trim().slice(0, 160);
  if (STATUSES.includes(body.status)) o.status = body.status;
  if (body.value !== undefined) o.value = Math.max(0, Number(body.value) || 0);
  if (typeof body.notes === "string") o.notes = body.notes.slice(0, 2000);
  o.updatedAt = new Date().toISOString();
  writeOrders(all);
  logAudit(me.name, "Auftrag aktualisiert", `${o.customer} — ${o.title} → ${o.status}`);
  return NextResponse.json({ order: o });
}

export async function DELETE(req: NextRequest) {
  const me = await requirePermission("orders");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const all = readOrders();
  const target = all.find((o) => o.id === id);
  writeOrders(all.filter((o) => o.id !== id));
  if (target) logAudit(me.name, "Auftrag gelöscht", `${target.customer} — ${target.title}`);
  return NextResponse.json({ ok: true });
}
