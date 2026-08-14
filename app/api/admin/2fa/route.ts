import { NextRequest, NextResponse } from "next/server";
import { readUsers, writeUsers } from "@/lib/server/store";
import { getCurrentUser, verifyPassword } from "@/lib/server/auth";
import { generateSecret, verifyTOTP, totpUri, generateRecoveryCodes, hashCode } from "@/lib/server/totp";
import { logAudit } from "@/lib/server/audit";
import { rateLimit } from "@/lib/server/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Status des EIGENEN Kontos (nie fremde Konten, nie das Secret nach Aktivierung).
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const full = readUsers().find((u) => u.id === me.id);
  return NextResponse.json({
    enabled: !!full?.totpEnabled,
    pending: !!full?.totpSecret && !full?.totpEnabled,
    recoveryLeft: full?.totpRecovery?.length ?? 0,
  });
}

export async function POST(req: NextRequest) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  // Bremse gegen Code-Erraten beim Einrichten/Deaktivieren.
  const ip = (req.headers.get("x-forwarded-for") || "local").split(",")[0].trim();
  if (!rateLimit(`2fa:${me.id}:${ip}`, 20, 10 * 60 * 1000).ok) {
    return NextResponse.json({ error: "Zu viele Versuche — bitte kurz warten." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const action = body?.action;
  const users = readUsers();
  const u = users.find((x) => x.id === me.id);
  if (!u) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  /* 1) Einrichtung starten: Secret + QR-URI zurückgeben (noch NICHT aktiv) */
  if (action === "setup") {
    /*
     * Läuft 2FA bereits, ist "setup" gesperrt.
     *
     * Vorher setzte diese Aktion bedingungslos `totpEnabled = false` und legte
     * ein neues Geheimnis an — ohne Passwort, ohne aktuellen Code. Wer eine
     * fremde Sitzung übernommen hatte, konnte damit die Zwei-Faktor-Anmeldung
     * einfach abschalten, obwohl "disable" dafür ausdrücklich Passwort UND
     * Code verlangt. Die zusätzliche Hürde war damit wirkungslos.
     */
    if (u.totpEnabled) {
      return NextResponse.json(
        { error: "2FA ist bereits aktiv. Zum Wechseln bitte zuerst deaktivieren — dafür sind Passwort und aktueller Code nötig." },
        { status: 409 }
      );
    }
    u.totpSecret = generateSecret();
    u.totpEnabled = false;
    u.updatedAt = new Date().toISOString();
    writeUsers(users);
    return NextResponse.json({ secret: u.totpSecret, uri: totpUri(u.totpSecret, u.username) });
  }

  /* 2) Aktivieren: erst nach gültigem Code aus der App → kein Aussperren */
  if (action === "activate") {
    if (!u.totpSecret) return NextResponse.json({ error: "Bitte zuerst die Einrichtung starten." }, { status: 400 });
    if (!verifyTOTP(u.totpSecret, String(body.code || ""))) {
      return NextResponse.json({ error: "Code ist nicht korrekt. Stimmt die Uhrzeit des Geräts?" }, { status: 400 });
    }
    const codes = generateRecoveryCodes(8);
    u.totpEnabled = true;
    u.totpRecovery = codes.map(hashCode);
    u.updatedAt = new Date().toISOString();
    writeUsers(users);
    logAudit(u.name, "2FA aktiviert");
    // Codes werden EINMAL im Klartext geliefert — danach nur noch Hashes.
    return NextResponse.json({ ok: true, recoveryCodes: codes });
  }

  /* 3) Deaktivieren: Passwort + aktueller Code (bzw. Recovery-Code) */
  if (action === "disable") {
    const pw = String(body.password || "");
    if (!(await verifyPassword(pw, u.passwordHash))) {
      return NextResponse.json({ error: "Passwort ist falsch." }, { status: 403 });
    }
    if (u.totpEnabled && u.totpSecret && !verifyTOTP(u.totpSecret, String(body.code || ""))) {
      return NextResponse.json({ error: "Aktueller 2FA-Code erforderlich." }, { status: 400 });
    }
    u.totpEnabled = false;
    u.totpSecret = undefined;
    u.totpRecovery = [];
    u.updatedAt = new Date().toISOString();
    writeUsers(users);
    logAudit(u.name, "2FA deaktiviert");
    return NextResponse.json({ ok: true });
  }

  /* 4) Neue Wiederherstellungs-Codes (alte werden ungültig) */
  if (action === "regenerate") {
    if (!u.totpEnabled || !u.totpSecret) return NextResponse.json({ error: "2FA ist nicht aktiv." }, { status: 400 });
    if (!verifyTOTP(u.totpSecret, String(body.code || ""))) {
      return NextResponse.json({ error: "Aktueller 2FA-Code erforderlich." }, { status: 400 });
    }
    const codes = generateRecoveryCodes(8);
    u.totpRecovery = codes.map(hashCode);
    u.updatedAt = new Date().toISOString();
    writeUsers(users);
    logAudit(u.name, "2FA-Wiederherstellungscodes neu erzeugt");
    return NextResponse.json({ ok: true, recoveryCodes: codes });
  }

  return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
