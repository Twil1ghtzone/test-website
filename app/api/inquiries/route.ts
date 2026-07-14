import { NextRequest, NextResponse } from "next/server";
import { readInquiries, writeInquiries, type Inquiry } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Öffentlich: Kontaktanfrage speichern (vom Kontaktformular).
export async function POST(req: NextRequest) {
  // Spam-Bremse: max. 10 Anfragen pro IP je Stunde.
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (!rateLimit(`inquiry:${ip}`, 10, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Zu viele Anfragen — bitte später erneut versuchen." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.name || !body.email || !body.message) {
    return NextResponse.json({ error: "Name, E-Mail und Nachricht sind erforderlich." }, { status: 400 });
  }
  // Einfacher E-Mail-Plausibilitätscheck.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(body.email))) {
    return NextResponse.json({ error: "Bitte eine gültige E-Mail-Adresse angeben." }, { status: 400 });
  }
  const inquiries = readInquiries();
  const item: Inquiry = {
    id: `i-${Date.now()}`,
    name: String(body.name).slice(0, 120),
    email: String(body.email).slice(0, 160),
    phone: body.phone ? String(body.phone).slice(0, 60) : undefined,
    topic: body.topic ? String(body.topic).slice(0, 120) : undefined,
    building: body.building ? String(body.building).slice(0, 120) : undefined,
    message: String(body.message).slice(0, 4000),
    packages: Array.isArray(body.packages) ? body.packages.slice(0, 12).map(String) : [],
    status: "neu",
    createdAt: new Date().toISOString(),
  };
  inquiries.unshift(item);
  writeInquiries(inquiries.slice(0, 1000));
  return NextResponse.json({ ok: true }, { status: 201 });
}

// Admin: alle Anfragen lesen.
export async function GET() {
  if (!(await requirePermission("inquiries"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json({ inquiries: readInquiries() });
}

// Admin: Status ändern oder löschen.
export async function PATCH(req: NextRequest) {
  if (!(await requirePermission("inquiries"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const inquiries = readInquiries();
  const i = inquiries.find((x) => x.id === body.id);
  if (!i) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  if (["neu", "gelesen", "erledigt"].includes(body.status)) i.status = body.status;
  writeInquiries(inquiries);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!(await requirePermission("inquiries"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  writeInquiries(readInquiries().filter((x) => x.id !== id));
  return NextResponse.json({ ok: true });
}
