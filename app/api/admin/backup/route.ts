import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { readJson, writeJson, collectionStats, COLLECTIONS, readUsers, type CollectionFile } from "@/lib/server/store";
import { requirePermission, verifyPassword } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";
import {
  BACKUP_FORMAT, istHuelleGueltig, istBekanntesFormat, pruefeForm,
  verweigerteSammlungen, zusammenfuehren, istGueltigerSnapshotName,
  ueberzaehligeSnapshots, snapshotName, SNAPSHOTS_BEHALTEN, SNAPSHOT_MUSTER,
} from "@/lib/server/backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const SNAPSHOT_DIRNAME = "backups";

/**
 * Obergrenze für eine hochgeladene Sicherung.
 *
 * Der Inhalt wird komplett in den Speicher gelesen, base64-dekodiert und
 * durch `JSON.parse` geschickt. Ohne Grenze reicht eine große Datei, um den
 * Server über den Arbeitsspeicher lahmzulegen.
 */
const MAX_IMPORT_BYTES = 200 * 1024 * 1024;

/*
 * ── RAID-Schutz (gespiegelte Sicherung) ──
 *
 * Echtes RAID entsteht auf Platten-/Volume-Ebene und ist Sache des Betriebs
 * (z. B. ein gespiegeltes Docker-Volume) — das kann eine Next.js-App nicht
 * herstellen. Was die App beitragen kann: bei jeder Sicherung automatisch
 * ZWEI unabhängige Kopien schreiben, damit der Ausfall EINES Datenträgers
 * nicht die einzige Sicherung mitreißt.
 */
const MIRROR_DIR = process.env.BACKUP_MIRROR_DIR || "";

const primaerVerzeichnis = () => path.join(DATA_DIR, SNAPSHOT_DIRNAME);
const spiegelVerzeichnis = () => (MIRROR_DIR ? path.join(MIRROR_DIR, SNAPSHOT_DIRNAME) : "");

export interface SnapshotEintrag {
  name: string;
  bytes: number;
  createdAt: string;
  /** Liegt zusätzlich eine Kopie im gespiegelten Verzeichnis? */
  gespiegelt: boolean;
}

function listeSnapshots(): SnapshotEintrag[] {
  const dir = primaerVerzeichnis();
  if (!fs.existsSync(dir)) return [];
  const spiegel = spiegelVerzeichnis();
  const imSpiegel = new Set(
    spiegel && fs.existsSync(spiegel) ? fs.readdirSync(spiegel).filter((n) => SNAPSHOT_MUSTER.test(n)) : []
  );
  return fs.readdirSync(dir)
    .filter((n) => SNAPSHOT_MUSTER.test(n))
    .map((n) => {
      const st = fs.statSync(path.join(dir, n));
      return { name: n, bytes: st.size, createdAt: st.mtime.toISOString(), gespiegelt: imSpiegel.has(n) };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Älteste Sicherungen entfernen, damit das Volume nicht vollläuft. */
function aufraeumen(): number {
  const alle = listeSnapshots();
  const weg = ueberzaehligeSnapshots(alle);
  for (const s of weg) {
    for (const dir of [primaerVerzeichnis(), spiegelVerzeichnis()]) {
      if (!dir) continue;
      const p = path.join(dir, s.name);
      try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch { /* Aufräumen darf die Sicherung nicht scheitern lassen */ }
    }
  }
  return weg.length;
}

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

/*
 * GET → Übersicht für das Panel.
 *
 * Mit `?download=<name>` wird stattdessen eine serverseitige Sicherung
 * ausgeliefert. Der Name ist Nutzereingabe und wird deshalb streng geprüft
 * UND anschließend gegen das Zielverzeichnis aufgelöst — sonst wäre das ein
 * Weg, beliebige Serverdateien herunterzuladen (etwa users.json mit den
 * Passwort-Hashes).
 */
export async function GET(req: NextRequest) {
  const me = await requirePermission("backup");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const gewuenscht = req.nextUrl.searchParams.get("download");
  if (gewuenscht) {
    if (!istGueltigerSnapshotName(gewuenscht)) {
      return NextResponse.json({ error: "Ungültiger Dateiname." }, { status: 400 });
    }
    const dir = primaerVerzeichnis();
    const ziel = path.resolve(dir, gewuenscht);
    // Doppelter Boden: Auch wenn die Namensprüfung je umgangen würde, muss
    // der aufgelöste Pfad im Sicherungsverzeichnis liegen.
    if (!ziel.startsWith(path.resolve(dir) + path.sep) || !fs.existsSync(ziel)) {
      return NextResponse.json({ error: "Sicherung nicht gefunden." }, { status: 404 });
    }
    const daten = fs.readFileSync(ziel);
    logAudit(me.name, "Sicherung heruntergeladen", gewuenscht);
    return new NextResponse(new Uint8Array(daten), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${gewuenscht}"`,
        "Content-Length": String(daten.length),
        "Cache-Control": "no-store",
      },
    });
  }

  const uploads = fs.existsSync(UPLOAD_DIR)
    ? fs.readdirSync(UPLOAD_DIR).filter((n) => /^[a-z0-9._-]+$/i.test(n)).length
    : 0;
  const spiegel = spiegelVerzeichnis();
  return NextResponse.json({
    collections: collectionStats(),
    uploads,
    raid: {
      mirrorConfigured: !!MIRROR_DIR,
      // Das tatsächliche Zielverzeichnis prüfen, nicht dessen Elternordner:
      // `/app` existiert immer und meldete "erreichbar", auch wenn das
      // gespiegelte Volume gar nicht eingehängt war.
      mirrorReachable: !!spiegel && fs.existsSync(spiegel),
      snapshots: listeSnapshots(),
      behalten: SNAPSHOTS_BEHALTEN,
    },
  });
}

export async function POST(req: NextRequest) {
  const me = await requirePermission("backup");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const istAdmin = me.role === "admin";

  const body = await req.json().catch(() => null);
  const action = body?.action;

  /* ── LÖSCHEN einer serverseitigen Sicherung (ohne Passphrase) ── */
  if (action === "delete") {
    const name = String(body?.name || "");
    if (!istGueltigerSnapshotName(name)) {
      return NextResponse.json({ error: "Ungültiger Dateiname." }, { status: 400 });
    }
    let entfernt = 0;
    for (const dir of [primaerVerzeichnis(), spiegelVerzeichnis()]) {
      if (!dir) continue;
      const ziel = path.resolve(dir, name);
      if (!ziel.startsWith(path.resolve(dir) + path.sep)) continue;
      try { if (fs.existsSync(ziel)) { fs.unlinkSync(ziel); entfernt++; } } catch { /* siehe unten */ }
    }
    if (entfernt === 0) return NextResponse.json({ error: "Sicherung nicht gefunden." }, { status: 404 });
    logAudit(me.name, "Sicherung gelöscht", name);
    return NextResponse.json({ ok: true, snapshots: listeSnapshots() });
  }

  const passphrase: string = body?.passphrase || "";
  if (passphrase.length < 8) {
    return NextResponse.json({ error: "Passphrase muss mindestens 8 Zeichen lang sein." }, { status: 400 });
  }

  /* ── EXPORT (Download) / SNAPSHOT (serverseitig ablegen) ── */
  if (action === "export" || action === "snapshot") {
    try {
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
        format: BACKUP_FORMAT,
        version: 3,
        exportedAt: new Date().toISOString(),
        manifest: {
          collections: Object.keys(collections),
          counts: Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, Array.isArray(v) ? v.length : 1])),
          uploads: Object.keys(uploads).length,
        },
        collections,
        uploads,
      });
      const encrypted = encrypt(payload, passphrase);

      if (action === "export") {
        logAudit(me.name, "Backup exportiert", `${Object.keys(collections).length} Sammlungen, ${Object.keys(uploads).length} Dateien`);
        return NextResponse.json({ backup: encrypted });
      }

      // ── SNAPSHOT: primär UND (falls konfiguriert) gespiegelt ablegen.
      const name = snapshotName();
      const json = JSON.stringify(encrypted);

      let primaryOk = false;
      let primaryError = "";
      try {
        fs.mkdirSync(primaerVerzeichnis(), { recursive: true });
        fs.writeFileSync(path.join(primaerVerzeichnis(), name), json, "utf-8");
        primaryOk = true;
      } catch (e) {
        primaryError = e instanceof Error ? e.message : "unbekannter Fehler";
      }

      let mirrorOk = false;
      let mirrorError = "";
      if (MIRROR_DIR) {
        try {
          fs.mkdirSync(spiegelVerzeichnis(), { recursive: true });
          fs.writeFileSync(path.join(spiegelVerzeichnis(), name), json, "utf-8");
          mirrorOk = true;
        } catch (e) {
          mirrorError = e instanceof Error ? e.message : "unbekannter Fehler";
        }
      }

      if (!primaryOk) {
        return NextResponse.json({ error: `Sicherung fehlgeschlagen: ${primaryError}` }, { status: 500 });
      }

      const aufgeraeumt = aufraeumen();
      logAudit(
        me.name,
        "Gespiegelte Sicherung erstellt",
        `${name} — primär ok${MIRROR_DIR ? `, Spiegel ${mirrorOk ? "ok" : "fehlgeschlagen"}` : " (kein Spiegel konfiguriert)"}` +
          (aufgeraeumt ? ` · ${aufgeraeumt} alte entfernt` : "")
      );
      return NextResponse.json({
        ok: true, name, primaryOk,
        mirrorConfigured: !!MIRROR_DIR, mirrorOk,
        mirrorError: mirrorOk ? undefined : mirrorError || undefined,
        aufgeraeumt,
        snapshots: listeSnapshots(),
      });
    } catch (e) {
      return NextResponse.json(
        { error: `${action === "export" ? "Export" : "Sicherung"} fehlgeschlagen: ${e instanceof Error ? e.message : "unbekannter Fehler"}` },
        { status: 500 }
      );
    }
  }

  /* ── INSPECT: nur entschlüsseln und anzeigen (schreibt nichts) ── */
  if (action === "inspect") {
    const blob = body.backup;
    if (!istHuelleGueltig(blob)) return NextResponse.json({ error: "Das ist keine gültige Sicherungsdatei." }, { status: 400 });
    let json: unknown;
    try {
      json = JSON.parse(decrypt(blob, passphrase));
    } catch {
      return NextResponse.json({ error: "Entschlüsselung fehlgeschlagen — falsche Passphrase oder beschädigte Datei." }, { status: 400 });
    }
    if (!istBekanntesFormat(json)) {
      return NextResponse.json({ error: "Die Datei ließ sich entschlüsseln, stammt aber nicht aus dieser Anwendung." }, { status: 400 });
    }
    const j = json as Record<string, never>;
    const collections = j.collections && typeof j.collections === "object"
      ? Object.keys(j.collections)
      : Object.keys(j).filter((k) => ["users", "inquiries", "settings"].includes(k)).map((k) => `${k}.json`);
    const counts = (j.manifest as Record<string, unknown> | undefined)?.counts
      ?? Object.fromEntries(Object.entries(j.collections || {}).map(([k, v]) => [k, Array.isArray(v) ? v.length : 1]));
    return NextResponse.json({
      ok: true,
      version: j.version ?? 1,
      exportedAt: j.exportedAt ?? null,
      collections,
      counts,
      uploads: j.uploads ? Object.keys(j.uploads).length : 0,
      labels: COLLECTIONS,
      // Damit das Panel gleich warnen kann, statt erst beim Absenden.
      gesperrt: verweigerteSammlungen(collections, istAdmin),
    });
  }

  /* ── IMPORT: „merge" (anfügen) oder „overwrite" (ersetzen) ── */
  if (action === "import") {
    const mode: "merge" | "overwrite" = body.mode === "overwrite" ? "overwrite" : "merge";

    if (mode === "overwrite") {
      if (!istAdmin) {
        return NextResponse.json({ error: "Überschreiben ist der Admin-Rolle vorbehalten." }, { status: 403 });
      }
      const full = readUsers().find((u) => u.id === me.id);
      const pw = String(body.adminPassword || "");
      if (!full || !pw || !(await verifyPassword(pw, full.passwordHash))) {
        return NextResponse.json({ error: "Überschreiben erfordert Ihr Admin-Passwort.", needPassword: true }, { status: 403 });
      }
    }

    const blob = body.backup;
    if (!istHuelleGueltig(blob)) return NextResponse.json({ error: "Das ist keine gültige Sicherungsdatei." }, { status: 400 });
    if (typeof blob.data === "string" && blob.data.length > MAX_IMPORT_BYTES) {
      return NextResponse.json({ error: "Die Sicherung ist zu groß." }, { status: 413 });
    }

    let json: Record<string, never>;
    try {
      json = JSON.parse(decrypt(blob, passphrase));
    } catch {
      return NextResponse.json({ error: "Entschlüsselung fehlgeschlagen — falsche Passphrase oder beschädigte Datei." }, { status: 400 });
    }
    if (!istBekanntesFormat(json)) {
      return NextResponse.json({ error: "Die Datei ließ sich entschlüsseln, stammt aber nicht aus dieser Anwendung." }, { status: 400 });
    }

    try {
      const only: string[] | null = Array.isArray(body.only) && body.only.length > 0 ? body.only : null;

      // v3/v2 (collections-Objekt) und v1 (flache Schlüssel) unterstützen.
      const src: Record<string, unknown> = json.collections && typeof json.collections === "object"
        ? json.collections
        : Object.fromEntries(
            (["users", "inquiries", "settings"] as const)
              .filter((k) => json[k] !== undefined)
              .map((k) => [`${k}.json`, json[k]])
          );

      const zuSpielen = (Object.keys(src) as CollectionFile[])
        .filter((f) => f in COLLECTIONS)
        .filter((f) => !only || only.includes(f));

      /*
       * Rechteausweitung über den Import verhindern.
       *
       * Ohne diese Sperre reichte die Berechtigung "backup": Man baut eine
       * eigene Sicherung (die Passphrase kennt man, man erzeugt sie selbst),
       * trägt in users.json einen weiteren Admin ein und spielt sie im Modus
       * „merge" ein — der Eintrag wird angefügt, danach meldet man sich als
       * Admin an. Aus „darf Backups machen" wurde so „darf alles".
       */
      const gesperrt = verweigerteSammlungen(zuSpielen, istAdmin);
      if (gesperrt.length > 0) {
        return NextResponse.json({
          error: `Diese Sammlungen darf nur ein Admin einspielen: ${gesperrt.map((f) => COLLECTIONS[f as CollectionFile] ?? f).join(", ")}.`,
          gesperrt,
        }, { status: 403 });
      }

      // Form prüfen, BEVOR irgendetwas geschrieben wird — ein halb
      // eingespieltes Backup wäre schlimmer als ein abgelehntes.
      const formfehler = zuSpielen
        .map((f) => pruefeForm(f, src[f]))
        .filter((x): x is NonNullable<typeof x> => x !== null);
      if (formfehler.length > 0) {
        return NextResponse.json({
          error: "Die Sicherung hat einen unerwarteten Aufbau und wurde nicht eingespielt: " +
            formfehler.map((f) => `${COLLECTIONS[f.file as CollectionFile] ?? f.file} — ${f.grund}`).join("; "),
        }, { status: 422 });
      }

      let restored = 0;
      const details: string[] = [];
      for (const file of zuSpielen) {
        const incoming = src[file];

        if (mode === "overwrite") {
          writeJson(file, incoming);
          restored++;
          details.push(`${COLLECTIONS[file]} ersetzt`);
          continue;
        }

        // MERGE: Listen zusammenführen (nichts verlieren, nichts überschreiben).
        // Einzelne Objekte (settings/legal) bleiben unangetastet — sie zu
        // „mergen" hieße, bestehende Einstellungen still zu verändern.
        if (Array.isArray(incoming)) {
          const { ergebnis, neu } = zusammenfuehren(readJson<unknown[]>(file, []), incoming);
          if (neu > 0) {
            writeJson(file, ergebnis);
            restored++;
            details.push(`${COLLECTIONS[file]}: +${neu}`);
          }
        }
      }

      // Uploads additiv (gleiche Namen nur beim Überschreiben ersetzen).
      let files = 0;
      if (json.uploads && typeof json.uploads === "object" && body.includeUploads !== false) {
        if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        for (const [name, b64] of Object.entries(json.uploads as Record<string, string>)) {
          // Kein Pfadanteil, kein ".." — der Name landet direkt im Dateisystem.
          if (!/^[a-z0-9._-]+$/i.test(name) || name.includes("..")) continue;
          const target = path.resolve(UPLOAD_DIR, name);
          if (!target.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) continue;
          if (mode === "merge" && fs.existsSync(target)) continue;
          fs.writeFileSync(target, Buffer.from(b64, "base64"));
          files++;
        }
      }

      logAudit(me.name, `Backup ${mode === "overwrite" ? "überschrieben" : "importiert"}`, `${restored} Sammlungen, ${files} Dateien`);
      return NextResponse.json({ ok: true, mode, restoredCollections: restored, restoredUploads: files, details });
    } catch (e) {
      return NextResponse.json(
        { error: `Import fehlgeschlagen: ${e instanceof Error ? e.message : "unbekannter Fehler"}` },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
}
