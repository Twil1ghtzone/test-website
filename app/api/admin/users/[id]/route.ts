import { NextRequest, NextResponse } from "next/server";
import { readUsers, writeUsers, fullPermissions, ALL_PERMISSIONS, emptyPermissions, type Role, type Permissions } from "@/lib/server/store";
import { requirePermission, hashPassword, publicUser } from "@/lib/server/auth";

function sanitizePerms(input: unknown): Permissions {
  const out = emptyPermissions();
  if (input && typeof input === "object") {
    for (const p of ALL_PERMISSIONS) out[p] = !!(input as Record<string, unknown>)[p];
  }
  return out;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("users");
  if (!admin) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const users = readUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  const u = users[idx];

  // Sich selbst nicht degradieren/deaktivieren (Selbst-Aussperren verhindern)
  const isSelf = u.id === admin.id;

  if (typeof body.name === "string") u.name = body.name.trim();
  if (typeof body.email === "string") u.email = body.email.trim();
  // Nur echte Admins dürfen die Admin-Rolle vergeben/entziehen.
  if ((body.role === "admin" || body.role === "editor") && !isSelf && admin.role === "admin") u.role = body.role as Role;
  if (typeof body.active === "boolean" && !isSelf) u.active = body.active;
  if (body.permissions && typeof body.permissions === "object") u.permissions = sanitizePerms(body.permissions);
  // Admins haben stets alle Rechte.
  if (u.role === "admin") u.permissions = fullPermissions();
  if (typeof body.password === "string" && body.password.length >= 6) {
    u.passwordHash = await hashPassword(body.password);
  }
  // Letzten aktiven Admin schützen
  if ((u.role !== "admin" || u.active === false) && !users.some((x) => x.id !== u.id && x.role === "admin" && x.active)) {
    return NextResponse.json({ error: "Mindestens ein aktiver Admin muss bestehen bleiben." }, { status: 409 });
  }
  u.updatedAt = new Date().toISOString();
  users[idx] = u;
  writeUsers(users);
  return NextResponse.json({ user: publicUser(u) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePermission("users");
  if (!admin) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const { id } = await params;
  if (id === admin.id) return NextResponse.json({ error: "Sie können sich nicht selbst löschen." }, { status: 409 });

  const users = readUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  if (target.role === "admin" && !users.some((x) => x.id !== id && x.role === "admin" && x.active)) {
    return NextResponse.json({ error: "Der letzte Admin kann nicht gelöscht werden." }, { status: 409 });
  }
  writeUsers(users.filter((u) => u.id !== id));
  return NextResponse.json({ ok: true });
}
