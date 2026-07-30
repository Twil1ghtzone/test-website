import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { readJson, writeJson, collectionStats, COLLECTIONS, readUsers, type CollectionFile } from "@/lib/server/store";
import { requirePermission, verifyPassword } from "@/lib/server/auth";
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
  return {
    v: 3,
    alg: "aes-256-gcm",
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: enc.toString("base64"),
  };
}

function decrypt(blob: { salt: string; iv: string; tag: string; data: string }, passphrase: string): string {
  const key = crypto.scryptSync(passphrase, Buffer.from(blob.salt, "base64"), 32);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(blob.iv, "base64"));
  decipher.setAuthTag(Buffer.from(blob.tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(blob.data, "base64")), decipher.final()]).toString("utf8");
}

// GET → Übersicht: welche Sammlungen gibt es, wie groß, wie viele Uploads.
// Damit kann das Panel die Auswahl-Checkboxen füllen.
export async function GET() {
  if (!(await requirePermission("backup"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const uploads = fs.existsSync(UPLOAD_DIR)
    ? fs.readdirSync(UPLOAD_DIR).filter((n) => /^[a-z0-9._-]+$/i.test(n)).length
    : 0;
  return NextResponse.json({ collections: collectionStats(), uploads });
}

export async function POST(req: NextRequest) {
  const me = await requirePermission("backup");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const passphrase: string = body?.passphrase || "";
  if (passphrase.length < 8) {
    return NextResponse.json({ error: "Passphrase muss mindestens 8 Zeichen lang sein." }, { status: 400 });
  }

  /* ── EXPORT: frei wählbarer Umfang ── */
  if (action === "export") {
    // Auswahl: welche Sammlungen? (leer/fehlend = alle)
    const wanted: CollectionFile[] = Array.isArray(body.collections) && body.collections.length > 0
      ? body.collections.filter((f: string): f is CollectionFile => f in COLLECTIONS)
      : (Object.keys(COLLECTIONS) as CollectionFile[]);
    const withUploads = body.includeUploads !== false;

    const collections: Record<string, unknown> = {};
    for (const file of wanted) {
      const raw = readJson<unknown>(file, null);
      if (raw !== null) collections[file] = raw;
    }

    const uploads: Record<string, string> = {};
    if (withUploads && fs.existsSync(UPLOAD_DIR)) {
      for (const name of fs.readdirSync(UPLOAD_DIR)) {
        if (!/^[a-z0-9._-]+$/i.test(name)) continue;
        const p = path.join(UPLOAD_DIR, name);
        if (fs.statSync(p).isFile()) uploads[name] = fs.readFileSync(p).toString("base64");
      }
    }

    const payload = JSON.stringify({
      format: "studio-lokal-backup",
      version: 3,
      exportedAt: new Date().toISOString(),
      // Manifest: was steckt drin? (Panel zeigt das beim Import an)
      manifest: {
        collections: Object.keys(collections),
        counts: Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, Array.isArray(v) ? v.length : 1])),
        uploads: Object.keys(uploads).length,
      },
      collections,
      uploads,
    });
    logAudit(me.name, "Backup exportiert", `${Object.keys(collections).length} Sammlungen, ${Object.keys(uploads).length} Dateien`);
    return NextResponse.json({ backup: encrypt(payload, passphrase) });
  }

  /* ── INSPECT: Backup nur entschlüsseln und Inhalt anzeigen (kein Schreiben) ── */
  if (action === "inspect") {
    try {
      const blob = body.backup;
      if (!blob?.data || !blob?.salt) return NextResponse.json({ error: "Ungültige Backup-Datei." }, { status: 400 });
      const json = JSON.parse(decrypt(blob, passphrase));
      const collections = json.collections && typeof json.collections === "object"
        ? Object.keys(json.collections)
        : Object.keys(json).filter((k) => ["users", "inquiries", "settings"].includes(k)).map((k) => `${k}.json`);
      const counts = json.manifest?.counts
        ?? Object.fromEntries(Object.entries(json.collections || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 1]));
      return NextResponse.json({
        ok: true,
        version: json.version ?? 1,
        exportedAt: json.exportedAt ?? null,
        collections,
        counts,
        uploads: json.uploads ? Object.keys(json.uploads).length : 0,
        labels: COLLECTIONS,
      });
    } catch {
      return NextResponse.json({ error: "Entschlüsselung fehlgeschlagen — falsche Passphrase oder beschädigte Datei." }, { status: 400 });
    }
  }

  /* ── IMPORT: Modus „merge" (anfügen) oder „overwrite" (ersetzen, Passwort nötig) ── */
  if (action === "import") {
    const mode: "merge" | "overwrite" = body.mode === "overwrite" ? "overwrite" : "merge";

    // Überschreiben ist destruktiv → Admin-Rolle + Passwort-Bestätigung.
    if (mode === "overwrite") {
      if (me.role !== "admin") {
        return NextResponse.json({ error: "Überschreiben ist der Admin-Rolle vorbehalten." }, { status: 403 });
      }
      const full = readUsers().find((u) => u.id === me.id);
      const pw = String(body.adminPassword || "");
      if (!full || !pw || !(await verifyPassword(pw, full.passwordHash))) {
        return NextResponse.json({ error: "Überschreiben erfordert Ihr Admin-Passwort.", needPassword: true }, { status: 403 });
      }
    }

    try {
      const blob = body.backup;
      if (!blob?.data || !blob?.salt) return NextResponse.json({ error: "Ungültige Backup-Datei." }, { status: 400 });
      const json = JSON.parse(decrypt(blob, passphrase));

      // Auswahl beim Import (leer = alles was drin ist)
      const only: string[] | null = Array.isArray(body.only) && body.only.length > 0 ? body.only : null;

      // v3/v2 (collections-Objekt) und v1 (users/inquiries/settings flach) unterstützen.
      const src: Record<string, unknown> = json.collections && typeof json.collections === "object"
        ? json.collections
        : Object.fromEntries(
            (["users", "inquiries", "settings"] as const)
              .filter((k) => json[k] !== undefined)
              .map((k) => [`${k}.json`, json[k]])
          );

      let restored = 0;
      const details: string[] = [];
      for (const file of Object.keys(src) as CollectionFile[]) {
        if (!(file in COLLECTIONS)) continue;
        if (only && !only.includes(file)) continue;
        const incoming = src[file];

        if (mode === "overwrite") {
          writeJson(file, incoming);
          restored++;
          details.push(`${COLLECTIONS[file]} ersetzt`);
          continue;
        }

        // MERGE: Arrays per id/number zusammenführen (nichts verlieren),
        // Objekte (settings/legal) beim Mergen NICHT anfassen.
        if (Array.isArray(incoming)) {
          const existing = readJson<unknown[]>(file, []);
          const keyOf = (x: unknown) => {
            const o = x as Record<string, unknown>;
            return String(o?.id ?? o?.number ?? o?.email ?? JSON.stringify(x));
          };
          const seen = new Set(existing.map(keyOf));
          const added = incoming.filter((x) => !seen.has(keyOf(x)));
          if (added.length > 0) {
            writeJson(file, [...added, ...existing]);
            restored++;
            details.push(`${COLLECTIONS[file]}: +${added.length}`);
          }
        }
      }

      // Uploads immer additiv (Dateien mit gleichem Namen nur bei overwrite ersetzen).
      let files = 0;
      if (json.uploads && typeof json.uploads === "object" && body.includeUploads !== false) {
        if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        for (const [name, b64] of Object.entries(json.uploads as Record<string, string>)) {
          if (!/^[a-z0-9._-]+$/i.test(name)) continue; // Path-Traversal
          const target = path.join(UPLOAD_DIR, name);
          if (mode === "merge" && fs.existsSync(target)) continue;
          fs.writeFileSync(target, Buffer.from(b64, "base64"));
          files++;
        }
      }

      logAudit(me.name, `Backup ${mode === "overwrite" ? "überschrieben" : "importiert"}`, `${restored} Sammlungen, ${files} Dateien`);
      return NextResponse.json({ ok: true, mode, restoredCollections: restored, restoredUploads: files, details });
    } catch {
      return NextResponse.json({ error: "Entschlüsselung fehlgeschlagen — falsche Passphrase oder beschädigte Datei." }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
