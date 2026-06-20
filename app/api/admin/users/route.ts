import { NextRequest, NextResponse } from "next/server";
import { readUsers, writeUsers, type User, type Role } from "@/lib/server/store";
import { requireAdmin, hashPassword, publicUser } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json({ users: readUsers().map(publicUser) });
}

export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const username = (body.username || "").trim().toLowerCase();
  const name = (body.name || "").trim();
  const email = (body.email || "").trim();
  const role: Role = body.role === "admin" ? "admin" : "editor";
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
    passwordHash: await hashPassword(password),
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  users.push(newUser);
  writeUsers(users);
  return NextResponse.json({ user: publicUser(newUser) }, { status: 201 });
}
