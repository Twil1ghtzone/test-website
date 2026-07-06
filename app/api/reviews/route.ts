import { NextRequest, NextResponse } from "next/server";
import { readReviews, writeReviews, readSettings, type Review } from "@/lib/server/store";
import { sealReview, verifyReview, hashIp } from "@/lib/server/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clientIp(req: NextRequest): string {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
}

// Öffentlich: freigegebene Bewertungen (nur mit gültigem Siegel) + Durchschnitt.
export async function GET() {
  const { reviews: cfg } = readSettings();
  if (!cfg.enabled) return NextResponse.json({ enabled: false, reviews: [], average: 0, count: 0 });

  const all = readReviews().filter((r) => r.status === "freigegeben" && verifyReview(r));
  const count = all.length;
  const average = count ? Math.round((all.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;
  // Nie ipHash/seal an den Client geben.
  const publicReviews = all.slice(0, 50).map(({ id, name, rating, text, createdAt }) => ({ id, name, rating, text, createdAt }));
  return NextResponse.json({ enabled: true, reviews: publicReviews, average, count });
}

// Öffentlich: Bewertung abgeben (Rate-Limit pro IP, Honeypot, serverseitiges Siegel).
export async function POST(req: NextRequest) {
  const { reviews: cfg } = readSettings();
  if (!cfg.enabled) return NextResponse.json({ error: "Bewertungen sind derzeit deaktiviert." }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });

  // Honeypot: verstecktes Feld — Bots füllen es aus, Menschen nicht.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true }, { status: 201 }); // still schlucken
  }

  const name = String(body.name || "").trim().slice(0, 80);
  const rating = Math.round(Number(body.rating));
  const text = String(body.text || "").trim().slice(0, 1200);
  if (!name || name.length < 2) return NextResponse.json({ error: "Bitte einen Namen angeben." }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Bewertung muss zwischen 1 und 5 Sternen liegen." }, { status: 400 });
  if (text.length < 10) return NextResponse.json({ error: "Bitte mindestens 10 Zeichen Text schreiben." }, { status: 400 });

  const ipHash = hashIp(clientIp(req));
  const all = readReviews();

  // Rate-Limit: max. N Bewertungen pro IP in 24 h.
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recent = all.filter((r) => r.ipHash === ipHash && new Date(r.createdAt).getTime() > dayAgo).length;
  if (recent >= cfg.maxPerDay) {
    return NextResponse.json({ error: "Zu viele Bewertungen — bitte morgen erneut versuchen." }, { status: 429 });
  }

  const base = {
    id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    rating,
    text,
    createdAt: new Date().toISOString(),
  };
  const review: Review = {
    ...base,
    seal: sealReview(base),
    ipHash,
    status: cfg.autoApprove ? "freigegeben" : "offen",
  };
  all.unshift(review);
  writeReviews(all.slice(0, 5000));

  return NextResponse.json(
    { ok: true, pending: review.status === "offen" },
    { status: 201 }
  );
}
