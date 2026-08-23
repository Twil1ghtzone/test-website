import { NextResponse } from "next/server";
import { readAudit, writeAudit } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requirePermission("activity"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json({ entries: readAudit().slice(0, 500) });
}

// Log leeren (nur Admin-Rolle).
export async function DELETE() {
  const me = await requirePermission("activity");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen das Log leeren." }, { status: 403 });
  writeAudit([]);
  return NextResponse.json({ ok: true });
}
