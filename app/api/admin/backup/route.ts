import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { readJson, writeJson, COLLECTIONS, type CollectionFile } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

function encrypt(plain: string, passphrase: string) {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: 2,
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

// Export/Import: VOLLSTÄNDIGES, passwortgeschütztes Backup (AES-256-GCM).
// Enthält ALLE Sammlungen (Benutzer, Anfragen, Blog, Bewertungen, Tickets,
// Aufträge, Finanzen, Rechnungen, Chat, Aktivität, Einstellungen) sowie
// alle hochgeladenen Dateien (uploads/).
export async function POST(req: NextRequest) {
  const me = await requirePermission("backup");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const passphrase: string = body?.passphrase || "";
  if (passphrase.length < 8) {
    return NextResponse.json({ error: "Passphrase muss mindestens 8 Zeichen lang sein." }, { status: 400 });
  }

  if (action === "export") {
    const collections: Record<string, unknown> = {};
    for (const file of Object.keys(COLLECTIONS) as CollectionFile[]) {
      const raw = readJson<unknown>(file, null);
      if (raw !== null) collections[file] = raw;
    }
    // Uploads (Bilder etc.) als base64 mitsichern.
    const uploads: Record<string, string> = {};
    if (fs.existsSync(UPLOAD_DIR)) {
      for (const name of fs.readdirSync(UPLOAD_DIR)) {
        if (!/^[a-z0-9._-]+$/i.test(name)) continue;
        const p = path.join(UPLOAD_DIR, name);
        if (fs.statSync(p).isFile()) uploads[name] = fs.readFileSync(p).toString("base64");
      }
    }
    const payload = JSON.stringify({
      format: "studio-lokal-full-backup",
      version: 2,
      exportedAt: new Date().toISOString(),
      collections,
      uploads,
    });
    const blob = encrypt(payload, passphrase);
    logAudit(me.name, "Backup exportiert", `${Object.keys(collections).length} Sammlungen, ${Object.keys(uploads).length} Dateien`);
    return NextResponse.json({ backup: blob });
  }

  if (action === "import") {
    try {
      const blob = body.backup;
      if (!blob?.data || !blob?.salt) return NextResponse.json({ error: "Ungültige Backup-Datei." }, { status: 400 });
      const json = JSON.parse(decrypt(blob, passphrase));

      let restoredCollections = 0;
      let restoredUploads = 0;

      if (json.version >= 2 && json.collections) {
        // Vollbackup: alles wiederherstellen.
        for (const file of Object.keys(COLLECTIONS) as CollectionFile[]) {
          if (file in json.collections) {
            writeJson(file, json.collections[file]); // schreibt atomar + aktualisiert Cache
            restoredCollections++;
          }
        }
        if (json.uploads && typeof json.uploads === "object") {
          if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
          for (const [name, b64] of Object.entries(json.uploads as Record<string, string>)) {
            if (!/^[a-z0-9._-]+$/i.test(name)) continue; // Path-Traversal verhindern
            fs.writeFileSync(path.join(UPLOAD_DIR, name), Buffer.from(b64, "base64"));
            restoredUploads++;
          }
        }
      } else {
        // Altes Format (v1): nur users/inquiries/settings.
        if (Array.isArray(json.users)) { writeJson("users.json", json.users); restoredCollections++; }
        if (Array.isArray(json.inquiries)) { writeJson("inquiries.json", json.inquiries); restoredCollections++; }
        if (json.settings) { writeJson("settings.json", json.settings); restoredCollections++; }
      }

      logAudit(me.name, "Backup wiederhergestellt", `${restoredCollections} Sammlungen, ${restoredUploads} Dateien`);
      return NextResponse.json({ ok: true, restoredCollections, restoredUploads });
    } catch {
      return NextResponse.json({ error: "Entschlüsselung fehlgeschlagen — falsche Passphrase oder beschädigte Datei." }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
