import { NextRequest, NextResponse } from "next/server";
import { readUsers, writeUsers } from "@/lib/server/store";
import { getCurrentUser, verifyPassword, hashPassword, publicUser } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Eigenes Konto: Name/E-Mail ändern, Passwort mit Bestätigung des aktuellen wechseln.
export async function PATCH(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const users = readUsers();
  const u = users.find((x) => x.id === me.id);
  if (!u) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  if (typeof body.name === "string" && body.name.trim()) u.name = body.name.trim().slice(0, 120);
  if (typeof body.email === "string") u.email = body.email.trim().slice(0, 160);

  if (typeof body.newPassword === "string" && body.newPassword.length > 0) {
    if (body.newPassword.length < 6) return NextResponse.json({ error: "Neues Passwort: min. 6 Zeichen." }, { status: 400 });
    if (!(await verifyPassword(String(body.currentPassword || ""), u.passwordHash))) {
      return NextResponse.json({ error: "Aktuelles Passwort ist falsch." }, { status: 403 });
    }
    u.passwordHash = await hashPassword(body.newPassword);
    logAudit(u.name, "Eigenes Passwort geändert");
  }

  u.updatedAt = new Date().toISOString();
  writeUsers(users);
  return NextResponse.json({ user: publicUser(u) });
}
