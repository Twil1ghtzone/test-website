import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readContent, writeContent, readUsers, type SiteContent } from "@/lib/server/store";
import { requirePermission, verifyPassword } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await requirePermission("legal"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json({ content: readContent() });
}

// Speichern erfordert IMMER das Admin-Passwort (Rechtstexte & Kontaktdaten
// sind rechtlich bindend bzw. sitewide sichtbar → zusätzliche Hürde).
export async function POST(req: NextRequest) {
  const me = await requirePermission("legal");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const full = readUsers().find((u) => u.id === me.id);
  const pw = String(body.adminPassword || "");
  if (!full || !pw || !(await verifyPassword(pw, full.passwordHash))) {
    return NextResponse.json({ error: "Änderung erfordert Ihr Admin-Passwort.", needPassword: true }, { status: 403 });
  }

  const cur = readContent();
  const str = (v: unknown, fallback: string, max = 20000) =>
    typeof v === "string" ? v.slice(0, max) : fallback;

  const next: SiteContent = {
    companyName: str(body.companyName, cur.companyName, 120).trim(),
    email: str(body.email, cur.email, 160).trim(),
    phone: str(body.phone, cur.phone, 60).trim(),
    region: str(body.region, cur.region, 120).trim(),
    address: str(body.address, cur.address, 400),
    footerNote: str(body.footerNote, cur.footerNote, 400),
    impressum: str(body.impressum, cur.impressum),
    datenschutz: str(body.datenschutz, cur.datenschutz),
    agb: str(body.agb, cur.agb),
  };
  writeContent(next);
  // Der Footer steckt im Root-Layout und wird auf statisch vorgerenderten Seiten
  // (Start, Kontakt, Konfigurator, Leistungen) zur Build-Zeit eingebacken.
  // Ohne diese Zeile blieben dort die alten Kontaktdaten bis zum nächsten Build stehen.
  revalidatePath("/", "layout");
  logAudit(me.name, "Rechtstexte/Kontakt gespeichert", `Kontakt: ${next.email} · ${next.phone}`);
  return NextResponse.json({ ok: true });
}
