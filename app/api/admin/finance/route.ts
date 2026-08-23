import { NextRequest, NextResponse } from "next/server";
import { readFinance, writeFinance, type FinanceEntry } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requirePermission("finance"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json({ entries: readFinance() });
}

export async function POST(req: NextRequest) {
  const me = await requirePermission("finance");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const label = String(body?.label || "").trim().slice(0, 160);
  const amount = Math.round((Number(body?.amount) || 0) * 100) / 100;
  const type = body?.type === "ausgabe" ? "ausgabe" : "einnahme";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body?.date || "") ? body.date : new Date().toISOString().slice(0, 10);
  if (!label || amount <= 0) return NextResponse.json({ error: "Bezeichnung und Betrag (> 0) erforderlich." }, { status: 400 });

  const e: FinanceEntry = { id: `f-${Date.now()}`, type, label, amount, date, createdAt: new Date().toISOString() };
  const all = readFinance();
  all.unshift(e);
  writeFinance(all);
  logAudit(me.name, "Finanzbuchung", `${type === "einnahme" ? "+" : "−"}${amount.toFixed(2)} € — ${label}`);
  return NextResponse.json({ entry: e }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const me = await requirePermission("finance");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const all = readFinance();
  const target = all.find((e) => e.id === id);
  writeFinance(all.filter((e) => e.id !== id));
  if (target) logAudit(me.name, "Finanzbuchung gelöscht", target.label);
  return NextResponse.json({ ok: true });
}
