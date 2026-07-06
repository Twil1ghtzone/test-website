import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readUsers, readJson, writeJson } from "@/lib/server/store";
import { seedAdminIfEmpty, verifyPassword, createSessionValue, SESSION_COOKIE, publicUser } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Rate-Limiting (persistiert) ──
const MAX = 5;
const LOCK = 15 * 60 * 1000;
const WINDOW = 5 * 60 * 1000;
type Rec = { count: number; last: number; until: number };

function check(ip: string): { ok: boolean; retry?: number } {
  const limits = readJson<Record<string, Rec>>("rate-limits.json", {});
  const r = limits[ip];
  const now = Date.now();
  if (!r) return { ok: true };
  if (r.until > now) return { ok: false, retry: Math.ceil((r.until - now) / 1000) };
  if (now - r.last > WINDOW) return { ok: true };
  if (r.count >= MAX) return { ok: false, retry: Math.ceil(LOCK / 1000) };
  return { ok: true };
}
function fail(ip: string) {
  const limits = readJson<Record<string, Rec>>("rate-limits.json", {});
  const now = Date.now();
  const r = limits[ip];
  if (!r || now - r.last > WINDOW) limits[ip] = { count: 1, last: now, until: 0 };
  else {
    limits[ip].count++;
    limits[ip].last = now;
    if (limits[ip].count >= MAX) limits[ip].until = now + LOCK;
  }
  writeJson("rate-limits.json", limits);
}
function clear(ip: string) {
  const limits = readJson<Record<string, Rec>>("rate-limits.json", {});
  if (limits[ip]) {
    delete limits[ip];
    writeJson("rate-limits.json", limits);
  }
}

export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rate = check(ip);
  if (!rate.ok) {
    return NextResponse.json({ ok: false, error: `Zu viele Versuche. Bitte ${rate.retry}s warten.` }, { status: 429 });
  }

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage." }, { status: 400 });
  }
  const username = (body.username || "").trim().toLowerCase();
  const password = body.password || "";
  if (!username || !password) {
    return NextResponse.json({ ok: false, error: "Benutzername und Passwort erforderlich." }, { status: 400 });
  }

  await seedAdminIfEmpty();
  const user = readUsers().find(
    (u) => u.active && (u.username.toLowerCase() === username || u.email.toLowerCase() === username)
  );

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    fail(ip);
    logAudit(username, "Login fehlgeschlagen");
    return NextResponse.json({ ok: false, error: "Benutzername oder Passwort ist falsch." }, { status: 401 });
  }

  clear(ip);
  logAudit(user.name, "Login erfolgreich");
  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionValue(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return NextResponse.json({ ok: true, user: publicUser(user) });
}
