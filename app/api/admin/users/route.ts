import { NextRequest, NextResponse } from "next/server";
import { readUsers, writeUsers, emptyPermissions, fullPermissions, ALL_PERMISSIONS, type User, type Role, type Permissions } from "@/lib/server/store";
import { requirePermission, hashPassword, publicUser } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function sanitizePerms(input: unknown): Permissions {
  const out = emptyPermissions();
  if (input && typeof input === "object") {
    for (const p of ALL_PERMISSIONS) out[p] = !!(input as Record<string, unknown>)[p];
  }
  return out;
}

export async function GET() {
  if (!(await requirePermission("users"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json({ users: readUsers().map(publicUser) });
}

export async function POST(req: NextRequest) {
  const me = await requirePermission("users");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const username = (body.username || "").trim().toLowerCase();
  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  // Nur echte Admins dürfen die Admin-Rolle vergeben.
  const role: Role = body.role === "admin" && me.role === "admin" ? "admin" : "editor";
  const password = body.password || "";

  if (!username || !name || password.length < 6) {
    return NextResponse.json({ error: "Benutzername, Name und Passwort (min. 6 Zeichen) erforderlich." }, { status: 400 });
  }
  const users = readUsers();
  if (users.some((u) => u.username.toLowerCase() === username)) {
    return NextResponse.json({ error: "Benutzername bereits vergeben." }, { status: 409 });
  }
  const now = new Date().toISOString();
  const newUser: User = {
    id: `u-${Date.now()}`,
    username,
    name,
    email,
    role,
    permissions: role === "admin" ? fullPermissions() : sanitizePerms(body.permissions),
    passwordHash: await hashPassword(password),
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  users.push(newUser);
  writeUsers(users);
  return NextResponse.json({ user: publicUser(newUser) }, { status: 201 });
}

export { sanitizePerms };
