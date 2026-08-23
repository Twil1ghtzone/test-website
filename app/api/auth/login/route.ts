import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { readUsers, readJson, writeJson } from "@/lib/server/store";
import { seedAdminIfEmpty, verifyPassword, createSessionValue, SESSION_COOKIE, publicUser } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";
import { writeUsers } from "@/lib/server/store";
import { verifyTOTP, verifyRecoveryCode } from "@/lib/server/totp";
import { loginSchema } from "@/lib/server/validation";

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

  const raw = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Benutzername und Passwort erforderlich." }, { status: 400 });
  }
  const body = parsed.data;
  const username = body.username.toLowerCase();
  const password = body.password;

  await seedAdminIfEmpty();
  const user = readUsers().find(
    (u) => u.active && (u.username.toLowerCase() === username || u.email.toLowerCase() === username)
  );

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    fail(ip);
    logAudit(username, "Login fehlgeschlagen");
    return NextResponse.json({ ok: false, error: "Benutzername oder Passwort ist falsch." }, { status: 401 });
  }

  // ── 2FA: Passwort stimmt, aber ohne gültigen Code KEINE Session ──
  if (user.totpEnabled && user.totpSecret) {
    const code = body.code || "";
    if (!code) {
      // Kein Cookie gesetzt — der Client zeigt jetzt die Code-Eingabe.
      return NextResponse.json({ ok: false, needTotp: true, error: "Bitte den 6-stelligen Code aus Ihrer Authenticator-App eingeben." }, { status: 401 });
    }
    let passed = verifyTOTP(user.totpSecret, code);
    if (!passed && user.totpRecovery?.length) {
      // Wiederherstellungs-Code: gilt genau EINMAL, danach entfernt.
      const idx = verifyRecoveryCode(code, user.totpRecovery);
      if (idx >= 0) {
        const users = readUsers();
        const u = users.find((x) => x.id === user.id);
        if (u?.totpRecovery) {
          u.totpRecovery.splice(idx, 1);
          u.updatedAt = new Date().toISOString();
          writeUsers(users);
        }
        passed = true;
        logAudit(user.name, "2FA per Wiederherstellungscode", `${(user.totpRecovery.length - 1)} Codes übrig`);
      }
    }
    if (!passed) {
      fail(ip); // zählt gegen das Rate-Limit → kein unbegrenztes Code-Raten
      logAudit(user.name, "2FA fehlgeschlagen");
      return NextResponse.json({ ok: false, needTotp: true, error: "Code ist nicht korrekt." }, { status: 401 });
    }
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
