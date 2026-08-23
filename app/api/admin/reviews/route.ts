import { NextRequest, NextResponse } from "next/server";
import { readReviews, writeReviews } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";
import { verifyReview } from "@/lib/server/reviews";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin: alle Bewertungen inkl. Siegel-Prüfung (verified) & Status.
export async function GET() {
  if (!(await requirePermission("reviews"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const reviews = readReviews().map((r) => ({
    id: r.id, name: r.name, rating: r.rating, text: r.text,
    status: r.status, createdAt: r.createdAt, verified: verifyReview(r),
    invoiceNumber: r.invoiceNumber || "", phase: r.phase || "", kind: r.kind || "end",
  }));
  return NextResponse.json({ reviews });
}

// Admin: Status ändern (freigeben/ablehnen/zurücksetzen).
export async function PATCH(req: NextRequest) {
  const me = await requirePermission("reviews");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  const all = readReviews();
  const r = all.find((x) => x.id === body.id);
  if (!r) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  if (!["offen", "freigegeben", "abgelehnt"].includes(body.status)) {
    return NextResponse.json({ error: "Ungültiger Status" }, { status: 400 });
  }
  r.status = body.status;
  writeReviews(all);
  logAudit(me.name, "Bewertung moderiert", `„${r.name}" → ${r.status}`);
  return NextResponse.json({ ok: true });
}

// Admin: einzelne Bewertung löschen.
export async function DELETE(req: NextRequest) {
  const me = await requirePermission("reviews");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const all = readReviews();
  const target = all.find((r) => r.id === id);
  writeReviews(all.filter((r) => r.id !== id));
  if (target) logAudit(me.name, "Bewertung gelöscht", `„${target.name}" (${target.rating}★)`);
  return NextResponse.json({ ok: true });
}
