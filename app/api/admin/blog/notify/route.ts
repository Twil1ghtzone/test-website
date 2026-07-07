import { NextRequest, NextResponse } from "next/server";
import { readPosts, writePosts, readSubscribers } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";
import { smtpConfigured, sendMail, mailLayout } from "@/lib/server/mail";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function baseUrl(req: NextRequest): string {
  const env = process.env.BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;
  if (env) return env.replace(/\/$/, "");
  const proto = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost:3000";
  return `${proto}://${host}`;
}

// Abonnenten über einen Beitrag benachrichtigen (wie novum /api/blogs/notify).
// Mit testEmail wird nur eine Test-Mail an diese Adresse geschickt.
export async function POST(req: NextRequest) {
  const me = await requirePermission("blog");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  if (!smtpConfigured()) {
    return NextResponse.json({ error: "SMTP nicht konfiguriert — bitte unter KI & Einstellungen die E-Mail-Zugangsdaten hinterlegen." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const postId = String(body?.postId || "");
  const testEmail = typeof body?.testEmail === "string" ? body.testEmail.trim() : "";

  const posts = readPosts();
  const post = posts.find((p) => p.id === postId);
  if (!post) return NextResponse.json({ error: "Beitrag nicht gefunden." }, { status: 404 });
  if (post.status !== "published") return NextResponse.json({ error: "Nur veröffentlichte Beiträge können versendet werden." }, { status: 400 });

  const base = baseUrl(req);
  const buildHtml = (unsubscribeToken?: string) =>
    mailLayout(
      post.title,
      `${post.excerpt ? `<p style="color:#5c5244;line-height:1.7;">${post.excerpt}</p>` : ""}
       <p style="margin:20px 0;"><a href="${base}/blog/${post.slug}" style="background:#b0543a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;">Beitrag lesen</a></p>
       ${unsubscribeToken ? `<p style="font-size:12px;color:#8a7f70;margin-top:24px;"><a href="${base}/api/blog/unsubscribe?token=${unsubscribeToken}" style="color:#8a7f70;">Abmelden</a></p>` : ""}`
    );

  // Test-Versand an eine Adresse.
  if (testEmail) {
    const r = await sendMail(testEmail, `Neu im Blog: ${post.title}`, buildHtml());
    return r.ok
      ? NextResponse.json({ ok: true, test: true })
      : NextResponse.json({ error: `Test-Versand fehlgeschlagen: ${r.detail}` }, { status: 502 });
  }

  const subs = readSubscribers().filter((s) => s.verified);
  if (subs.length === 0) return NextResponse.json({ error: "Keine bestätigten Abonnenten vorhanden." }, { status: 400 });

  let sent = 0;
  let failed = 0;
  for (const sub of subs) {
    const r = await sendMail(sub.email, `Neu im Blog: ${post.title}`, buildHtml(sub.token));
    if (r.ok) sent++;
    else failed++;
  }

  post.notifiedAt = new Date().toISOString();
  writePosts(posts);
  logAudit(me.name, "Blog-Newsletter versendet", `„${post.title}" an ${sent} Abonnenten${failed ? ` (${failed} fehlgeschlagen)` : ""}`);
  return NextResponse.json({ ok: true, sent, failed });
}
