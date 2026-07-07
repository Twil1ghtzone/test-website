import { NextRequest, NextResponse } from "next/server";
import { readSubscribers, writeSubscribers } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Abmelden per Link aus jeder E-Mail (wie novum /api/blogs/unsubscribe-confirm).
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const subs = readSubscribers();
  const found = subs.some((s) => s.token === token);
  if (found) writeSubscribers(subs.filter((s) => s.token !== token));

  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Abmeldung</title></head>
<body style="margin:0;background:#f6f2ea;font-family:Georgia,serif;color:#211c17;display:grid;place-items:center;min-height:100vh;">
  <div style="background:#fffdf9;border:1px solid #e7ddcc;border-radius:20px;padding:40px;max-width:420px;text-align:center;">
    <h1 style="margin:0 0 10px;font-size:24px;">${found ? "Abgemeldet ✓" : "Link ungültig"}</h1>
    <p style="color:#5c5244;line-height:1.6;">${found ? "Sie erhalten keine Blog-Benachrichtigungen mehr. Ihre E-Mail-Adresse wurde vollständig gelöscht." : "Dieser Abmeldelink ist abgelaufen oder wurde bereits verwendet."}</p>
    <a href="/blog" style="display:inline-block;margin-top:16px;background:#b0543a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold;">Zum Blog</a>
  </div>
</body></html>`;
  return new NextResponse(html, { status: found ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
