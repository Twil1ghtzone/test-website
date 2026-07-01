import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { readUsers, writeUsers, readInquiries, writeInquiries, readSettings, writeSettings } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function encrypt(plain: string, passphrase: string) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 1,
    alg: "aes-256-gcm",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: enc.toString("base64"),
  };
}

function decrypt(blob: { salt: string; iv: string; tag: string; data: string }, passphrase: string): string {
  const salt = Buffer.from(blob.salt, "base64");
  const iv = Buffer.from(blob.iv, "base64");
  const tag = Buffer.from(blob.tag, "base64");
  const key = crypto.scryptSync(passphrase, salt, 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(Buffer.from(blob.data, "base64")), decipher.final()]).toString("utf8");
}

// Export: verschlüsseltes Backup herunterladen.
export async function POST(req: NextRequest) {
  if (!(await requirePermission("backup"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const passphrase: string = body?.passphrase || "";
  if (passphrase.length < 8) {
    return NextResponse.json({ error: "Passphrase muss mindestens 8 Zeichen lang sein." }, { status: 400 });
  }

  if (action === "export") {
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      users: readUsers(),
      inquiries: readInquiries(),
      settings: readSettings(),
    });
    const blob = encrypt(payload, passphrase);
    return NextResponse.json({ backup: blob });
  }

  if (action === "import") {
    try {
      const blob = body.backup;
      if (!blob?.data || !blob?.salt) return NextResponse.json({ error: "Ungültige Backup-Datei." }, { status: 400 });
      const json = JSON.parse(decrypt(blob, passphrase));
      if (Array.isArray(json.users)) writeUsers(json.users);
      if (Array.isArray(json.inquiries)) writeInquiries(json.inquiries);
      if (json.settings) writeSettings(json.settings);
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({ error: "Entschlüsselung fehlgeschlagen — falsche Passphrase oder beschädigte Datei." }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
