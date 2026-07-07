import { NextRequest, NextResponse } from "next/server";
import { readSubscribers, writeSubscribers } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requirePermission("blog"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  // Token nie an den Client geben.
  const subscribers = readSubscribers().map(({ id, email, verified, createdAt }) => ({ id, email, verified, createdAt }));
  return NextResponse.json({ subscribers });
}

export async function DELETE(req: NextRequest) {
  const me = await requirePermission("blog");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const subs = readSubscribers();
  const target = subs.find((s) => s.id === id);
  writeSubscribers(subs.filter((s) => s.id !== id));
  if (target) logAudit(me.name, "Blog-Abonnent entfernt", target.email);
  return NextResponse.json({ ok: true });
}
