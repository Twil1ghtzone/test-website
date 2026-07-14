import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { readSubscribers, writeSubscribers, type Subscriber } from "@/lib/server/store";
import { smtpConfigured, sendMail, mailLayout } from "@/lib/server/mail";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function baseUrl(req: NextRequest): string {
  const env = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

// Öffentlich: Blog kostenlos abonnieren (wie novum — mit Double-Opt-In, wenn SMTP konfiguriert).
export async function POST(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  const rl = rateLimit(`subscribe:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Zu viele Anmeldungen — bitte später erneut versuchen." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  // Honeypot
  if (typeof body?.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true, verified: true }, { status: 201 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "Bitte eine gültige E-Mail-Adresse angeben." }, { status: 400 });
  }

  const subs = readSubscribers();
  const existing = subs.find((s) => s.email === email);
  if (existing?.verified) {
    return NextResponse.json({ ok: true, verified: true, already: true }, { status: 200 });
  }

  const withMail = smtpConfigured();
  const token = crypto.randomBytes(24).toString("base64url");

  if (existing) {
    existing.token = token;
    existing.verified = existing.verified || !withMail;
  } else {
    const sub: Subscriber = {
      id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email,
      // Ohne SMTP: direkt aktiv. Mit SMTP: erst nach Bestätigungslink.
      verified: !withMail,
      token,
      createdAt: new Date().toISOString(),
    };
    subs.push(sub);
  }
  writeSubscribers(subs.slice(-5000));

  if (withMail) {
    const link = `${baseUrl(req)}/api/blog/verify?token=${token}`;
    await sendMail(
      email,
      "Blog-Abo bestätigen — STUDIO//LOKAL",
      mailLayout(
        "Fast geschafft!",
        `<p>Schön, dass Sie dabei sind. Bitte bestätigen Sie Ihr kostenloses Blog-Abo mit einem Klick:</p>
         <p style="margin:20px 0;"><a href="${link}" style="background:#b0543a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;">Abo bestätigen</a></p>
         <p style="font-size:13px;color:#8a7f70;">Falls Sie das nicht waren, ignorieren Sie diese E-Mail einfach.</p>`
      )
    );
  }

  return NextResponse.json({ ok: true, verified: !withMail }, { status: 201 });
}
