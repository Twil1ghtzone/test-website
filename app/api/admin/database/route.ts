import { NextRequest, NextResponse } from "next/server";
import { collectionStats, resetCollection, readUsers, COLLECTIONS, type CollectionFile } from "@/lib/server/store";
import { requirePermission, verifyPassword } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Statistik aller Sammlungen (Einträge & Größe).
export async function GET() {
  if (!(await requirePermission("database"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json({ collections: collectionStats() });
}

// Sammlungen zurücksetzen — nur Admin-Rolle + Passwort-Bestätigung.
export async function POST(req: NextRequest) {
  const me = await requirePermission("database");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen die Datenbank zurücksetzen." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const files: string[] = Array.isArray(body?.collections) ? body.collections : [];
  const password = String(body?.password || "");
  if (files.length === 0) return NextResponse.json({ error: "Keine Sammlung ausgewählt." }, { status: 400 });

  // Passwort des ausführenden Admins prüfen — Reset ist unumkehrbar.
  const full = readUsers().find((u) => u.id === me.id);
  if (!full || !(await verifyPassword(password, full.passwordHash))) {
    return NextResponse.json({ error: "Passwort falsch — Zurücksetzen abgebrochen." }, { status: 403 });
  }

  const valid = files.filter((f): f is CollectionFile => f in COLLECTIONS);
  for (const f of valid) resetCollection(f);
  logAudit(me.name, "Datenbank zurückgesetzt", valid.map((f) => COLLECTIONS[f]).join(", "));

  // Hinweis: users.json-Reset legt beim nächsten Login wieder admin/test1234 an.
  const usersReset = valid.includes("users.json");
  return NextResponse.json({ ok: true, reset: valid, usersReset });
}
