import crypto from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { readUsers, writeUsers, fullPermissions, type User, type Role, type Permission } from "./store";

export const SESSION_COOKIE = "sl_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 8; // 8 Stunden

function getSecret(): string {
  // In Produktion (Docker) SESSION_SECRET setzen. Dev-Fallback, damit der erste Start läuft.
  return process.env.SESSION_SECRET || "studio-lokal-dev-secret-bitte-aendern";
}

// ── Passwörter (bcrypt, Kostenfaktor 12 — kein Klartext) ──
export const hashPassword = (pw: string) => bcrypt.hash(pw, 12);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

// ── Session-Cookie: HMAC-signiert (payload.signature) ──
function sign(payload: string): string {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

export function createSessionValue(user: User): string {
  const payload = JSON.stringify({ uid: user.id, role: user.role, exp: Date.now() + SESSION_TTL_MS });
  const b64 = Buffer.from(payload).toString("base64url");
  return `${b64}.${sign(payload)}`;
}

export function readSessionValue(value: string | undefined): { uid: string; role: Role; exp: number } | null {
  if (!value) return null;
  const [b64, sig] = value.split(".");
  if (!b64 || !sig) return null;
  try {
    const payload = Buffer.from(b64, "base64url").toString();
    const expected = sign(payload);
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(payload);
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

// Seed: beim allerersten Start admin / test1234 anlegen.
export async function seedAdminIfEmpty(): Promise<void> {
  const users = readUsers();
  if (users.length > 0) return;
  const now = new Date().toISOString();
  users.push({
    id: `u-${Date.now()}`,
    username: "admin",
    name: "Administrator",
    email: "admin@studio-lokal.de",
    role: "admin",
    permissions: fullPermissions(),
    passwordHash: await hashPassword("test1234"),
    active: true,
    createdAt: now,
    updatedAt: now,
  });
  writeUsers(users);
}

// Admin hat immer alle Rechte; sonst die einzeln gesetzte Berechtigung.
export function userHasPermission(u: { role: Role; permissions?: Partial<Record<Permission, boolean>> } | null, perm: Permission): boolean {
  if (!u) return false;
  return u.role === "admin" || !!u.permissions?.[perm];
}

export async function requirePermission(perm: Permission): Promise<Omit<User, "passwordHash"> | null> {
  const u = await getCurrentUser();
  return userHasPermission(u, perm) ? u : null;
}

// Aktuellen, eingeloggten Benutzer aus dem Cookie holen (server-seitig).
export async function getCurrentUser(): Promise<Omit<User, "passwordHash"> | null> {
  const store = await cookies();
  const session = readSessionValue(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = readUsers().find((u) => u.id === session.uid && u.active);
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  void passwordHash;
  return safe;
}

export async function requireAdmin(): Promise<Omit<User, "passwordHash"> | null> {
  const user = await getCurrentUser();
  return user && user.role === "admin" ? user : null;
}

export function publicUser(u: User): Omit<User, "passwordHash"> {
  const { passwordHash, ...safe } = u;
  void passwordHash;
  return safe;
}
