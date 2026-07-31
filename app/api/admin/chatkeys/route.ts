import { NextRequest, NextResponse } from "next/server";
import { readUsers } from "@/lib/server/store";
import { requirePermission, verifyPassword } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";
import { masterStatus, rotateChatMaster, deleteAllSessions, chatStats } from "@/lib/server/aiChat";
import { RSA_BITS } from "@/lib/server/chatKeys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Status der Chat-Verschlüsselung — Fingerabdruck statt Schlüsselmaterial. */
export async function GET() {
  if (!(await requirePermission("settings"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json({ master: masterStatus(), stats: chatStats(), rsaBits: RSA_BITS });
}

/**
 * Zwei Aktionen, beide mit Admin-Passwort abgesichert:
 *
 * `rotate` — neuen Master-Schlüssel erzeugen. Laufende Gespräche bleiben
 *   lesbar, weil nur die kurzen privaten Sitzungsschlüssel neu eingehüllt
 *   werden. Routinemaßnahme, etwa nach einem Personalwechsel.
 *
 * `purge` — alle Chats löschen. Damit verschwinden auch die privaten
 *   Sitzungsschlüssel, die Nachrichten sind danach endgültig unlesbar
 *   (Krypto-Schreddern). Notbremse bei Verdacht auf Kompromittierung.
 */
export async function POST(req: NextRequest) {
  const me = await requirePermission("settings");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  // Wie bei Rechtstexten und Backup-Überschreiben: das Passwort schützt
  // Aktionen, die sich nicht zurücknehmen lassen.
  if (me.role !== "admin") {
    return NextResponse.json({ error: "Nur Administratoren dürfen Schlüssel verwalten." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const full = readUsers().find((u) => u.id === me.id);
  const pw = String(body?.adminPassword || "");
  if (!full || !pw || !(await verifyPassword(pw, full.passwordHash))) {
    return NextResponse.json({ error: "Diese Aktion erfordert Ihr Admin-Passwort.", needPassword: true }, { status: 403 });
  }

  if (body.action === "rotate") {
    const r = rotateChatMaster();
    logAudit(me.name, "Chat-Master-Schlüssel rotiert", `Neu: ${r.id} · ${r.sessions} Sitzungen neu eingehüllt${r.skipped ? ` · ${r.skipped} übersprungen` : ""}`);
    return NextResponse.json({ ok: true, ...r, master: masterStatus() });
  }

  if (body.action === "purge") {
    const n = deleteAllSessions();
    logAudit(me.name, "Alle KI-Chats gelöscht", `${n} Sitzungen krypto-geschreddert`);
    return NextResponse.json({ ok: true, deleted: n, stats: chatStats() });
  }

  return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
