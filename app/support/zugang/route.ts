import { NextRequest, NextResponse } from "next/server";
import { readSupport } from "@/lib/server/store";
import {
  verifyMagicToken, verifyToken, entpackZugriffe, packZugriffe,
  COOKIE_ZUGRIFF, COOKIE_SITZUNG, COOKIE_ZUGRIFF_MAX_ALTER, COOKIE_SITZUNG_MAX_ALTER,
  cookieOptionen,
} from "@/lib/server/support";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Magic-Link aus der Benachrichtigungs-E-Mail einlösen.
 *
 * Der signierte Token wird geprüft, der Zugriff in den HttpOnly-Cookie
 * übernommen und danach sofort per Weiterleitung aus der Adresszeile
 * entfernt — so landet er nicht im Verlauf, in Lesezeichen oder im
 * Referrer-Header der nächsten Anfrage.
 */
export async function GET(req: NextRequest) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const basis = new URL(req.url).origin;

  if (!(await rateLimit(`support-magic:${ip}`, 20, 60 * 60 * 1000)).ok) {
    return NextResponse.redirect(`${basis}/support?zugang=limit`, 303);
  }

  const roh = new URL(req.url).searchParams.get("t") || "";
  const geprueft = verifyMagicToken(roh);
  if (!geprueft) return NextResponse.redirect(`${basis}/support?zugang=abgelaufen`, 303);

  const ticket = readSupport().find((t) => t.number === geprueft.number);
  if (!ticket || !verifyToken(geprueft.code, ticket.tokenHash)) {
    return NextResponse.redirect(`${basis}/support?zugang=ungueltig`, 303);
  }

  const vorhanden = entpackZugriffe(req.cookies.get(COOKIE_ZUGRIFF)?.value)
    .filter((z) => z.number !== ticket.number);
  const res = NextResponse.redirect(`${basis}/support?zugang=ok`, 303);
  res.cookies.set(
    COOKIE_ZUGRIFF,
    packZugriffe([...vorhanden, { number: ticket.number, token: geprueft.code }]),
    cookieOptionen(req, COOKIE_ZUGRIFF_MAX_ALTER)
  );
  res.cookies.set(COOKIE_SITZUNG, ticket.number, cookieOptionen(req, COOKIE_SITZUNG_MAX_ALTER));
  return res;
}
