import crypto from "crypto";
import { readJson, writeJson } from "./store.ts";
import { serverSecret } from "./secret.ts";

/* ════════════════════════════════════════════════════════════════════════
   SCHLÜSSELVERWALTUNG DES KI-CHATS — HÜLLENVERSCHLÜSSELUNG (RSA + AES)

   Die Schlüsselkette von außen nach innen:

     SESSION_SECRET (Umgebungsvariable)
       └─ scrypt ─→ KEK (Key Encryption Key)
            └─ verschlüsselt den MASTER-SCHLÜSSEL  ← im Admin neu erzeugbar
                 └─ verschlüsselt den privaten RSA-Schlüssel JE SITZUNG
                      └─ dessen öffentlicher Teil verschlüsselt den
                         Inhalts-Schlüssel (AES-256) der Sitzung
                              └─ verschlüsselt jede Nachricht (eigener IV)

   WARUM ÜBERHAUPT RSA? Ehrliche Einordnung, damit niemand mehr erwartet als
   drin ist:

   1. RSA kann keine Chatnachrichten verschlüsseln. RSA-2048 mit OAEP-Padding
      schafft maximal 190 Byte. Deshalb ist das hier — wie bei PGP, TLS und
      JWE — HYBRIDE Verschlüsselung: AES verschlüsselt den Text, RSA nur den
      kurzen AES-Schlüssel. Ein "reiner RSA-Chat" ist technisch unmöglich.

   2. RSA verbirgt die Nachrichten NICHT vor diesem Server. Er hält beide
      Schlüsselhälften, weil er die Nachrichten der KI vorlegen muss. Wer das
      Gegenteil verspricht, verspricht etwas Unmögliches.

   3. Was die Kette WIRKLICH bringt:
      • Master-Rotation in Sekunden: Beim Wechsel des Master-Schlüssels müssen
        nur die kurzen privaten Sitzungsschlüssel neu eingehüllt werden — die
        Nachrichten selbst bleiben unangetastet. Ohne diese Schicht müsste
        jede einzelne Nachricht neu verschlüsselt werden.
      • Krypto-Schreddern: Wird der private Schlüssel EINER Sitzung gelöscht,
        ist genau dieses Gespräch endgültig unlesbar — selbst mit
        Master-Schlüssel und Datenbankzugriff.
      • Sauberer Schnitt für später: Der öffentliche Schlüssel genügt zum
        SCHREIBEN. Ein künftiger, getrennter Prozess könnte Nachrichten
        annehmen, ohne alte lesen zu können.

   Der Master-Schlüssel liegt NICHT im Klartext auf der Platte, sondern von
   der KEK eingehüllt. Wurzel des Vertrauens bleibt damit SESSION_SECRET aus
   der Umgebung — der richtige Ort für ein Wurzelgeheimnis.
   ════════════════════════════════════════════════════════════════════════ */

const KEY_FILE = "chat-keys.json";
export const RSA_BITS = 2048;

export interface EncBlob {
  iv: string;
  tag: string;
  data: string;
}

interface KeyStore {
  /** Kennung des aktuellen Master-Schlüssels — wandert in jede Sitzung mit. */
  masterId: string;
  createdAt: string;
  /** Master-Schlüssel, eingehüllt von der aus SESSION_SECRET abgeleiteten KEK. */
  wrapped: EncBlob;
  /** Wie oft wurde bereits rotiert (nur zur Anzeige im Admin). */
  rotations: number;
}

/* ─────────────────────── Ebene 1: KEK aus der Umgebung ─────────────────────── */

/**
 * Anders als beim Backup-Export (dort: menschliche Passphrase + Zufalls-Salt,
 * weil ein von Menschen gewähltes Passwort Schutz gegen Rainbow-Tables
 * braucht) genügt hier ein fester Kontext-String: SESSION_SECRET ist bereits
 * hochentropisch. Vorteil: kein Salt muss mitgespeichert werden.
 */
function kek(): Buffer {
  return crypto.scryptSync(serverSecret(), "studio-lokal-chat-kek-v2", 32);
}

function sealWith(key: Buffer, plain: Buffer): EncBlob {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([c.update(plain), c.final()]);
  return { iv: iv.toString("base64"), tag: c.getAuthTag().toString("base64"), data: data.toString("base64") };
}

function openWith(key: Buffer, blob: EncBlob): Buffer {
  const d = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(blob.iv, "base64"));
  d.setAuthTag(Buffer.from(blob.tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(blob.data, "base64")), d.final()]);
}

/* ─────────────────────── Ebene 2: Master-Schlüssel ─────────────────────── */

// Im Speicher gehaltener Master — spart pro Anfrage eine scrypt-Ableitung
// (die absichtlich rechenintensiv ist). Wird bei Rotation verworfen.
let masterCache: { id: string; key: Buffer } | null = null;

function loadStore(): KeyStore | null {
  const s = readJson<KeyStore | null>(KEY_FILE, null);
  return s && s.wrapped && s.masterId ? s : null;
}

let recoveredWarned = false;

/**
 * Master-Schlüssel holen — beim allerersten Aufruf wird er erzeugt.
 *
 * Wichtiger Sonderfall: Wurde SESSION_SECRET geändert (Rotation, neue
 * Umgebung, oder erstmalig gesetzt nachdem die Seite ohne lief), lässt sich
 * der gespeicherte Master nicht mehr auspacken. Dann wird ein NEUER erzeugt,
 * statt eine Ausnahme zu werfen.
 *
 * Warum das so sein MUSS: Ohne diesen Zweig scheiterte jede
 * Chat-Anfrage dauerhaft mit einem Serverfehler — nicht nur das Lesen alter
 * Gespräche, sondern auch das Anlegen neuer. Der Chat wäre komplett tot,
 * bis jemand die Datei von Hand löscht. Alte Gespräche sind in diesem Fall
 * unvermeidlich verloren (ihre Schlüssel hingen am alten Geheimnis) — der
 * Dienst selbst muss aber weiterlaufen.
 */
export function master(): { id: string; key: Buffer } {
  const store = loadStore();
  if (!store) return createMaster(0).unwrapped;
  if (masterCache?.id === store.masterId) return masterCache;

  try {
    const key = openWith(kek(), store.wrapped);
    masterCache = { id: store.masterId, key };
    return masterCache;
  } catch {
    if (!recoveredWarned) {
      console.warn(
        "[Chat-Verschlüsselung] Der gespeicherte Master-Schlüssel lässt sich nicht mehr auspacken — " +
        "SESSION_SECRET hat sich offenbar geändert. Es wird ein neuer Master erzeugt; bisherige " +
        "Chat-Verläufe sind damit endgültig unlesbar. Neue Gespräche funktionieren normal weiter."
      );
      recoveredWarned = true;
    }
    // Rotationszähler fortführen, damit im Admin sichtbar bleibt, dass hier
    // etwas passiert ist.
    return createMaster(store.rotations + 1).unwrapped;
  }
}

function createMaster(rotations: number): { store: KeyStore; unwrapped: { id: string; key: Buffer } } {
  const key = crypto.randomBytes(32);
  const id = crypto.randomBytes(6).toString("hex").toUpperCase();
  const store: KeyStore = {
    masterId: id,
    createdAt: new Date().toISOString(),
    wrapped: sealWith(kek(), key),
    rotations,
  };
  writeJson(KEY_FILE, store);
  masterCache = { id, key };
  return { store, unwrapped: masterCache };
}

/** Status für die Anzeige im Admin — gibt NIE Schlüsselmaterial heraus. */
export function masterStatus(): { id: string; createdAt: string; rotations: number; fingerprint: string } {
  const m = master();
  const store = loadStore()!;
  return {
    id: m.id,
    createdAt: store.createdAt,
    rotations: store.rotations,
    // Fingerabdruck statt Schlüssel: erlaubt den Vergleich "ist das noch
    // derselbe Schlüssel?", ohne das Geheimnis selbst zu zeigen.
    fingerprint: crypto.createHash("sha256").update(m.key).digest("hex").slice(0, 16).replace(/(.{4})/g, "$1 ").trim().toUpperCase(),
  };
}

/**
 * Neuen Master-Schlüssel erzeugen. Der Aufrufer liefert eine Funktion, die
 * alle vorhandenen privaten Sitzungsschlüssel mit dem neuen Master neu
 * einhüllt — dadurch bleiben laufende Gespräche lesbar.
 *
 * Reihenfolge ist bewusst so: erst mit dem ALTEN Master alles auspacken, dann
 * den neuen schreiben. Bricht das Auspacken ab, bleibt der alte Zustand
 * unverändert bestehen.
 */
export function rotateMaster(rewrap: (alt: Buffer, neu: Buffer) => void): { id: string; rotations: number } {
  const alt = master();
  const store = loadStore();
  const neuKey = crypto.randomBytes(32);
  rewrap(alt.key, neuKey);

  const id = crypto.randomBytes(6).toString("hex").toUpperCase();
  const next: KeyStore = {
    masterId: id,
    createdAt: new Date().toISOString(),
    wrapped: sealWith(kek(), neuKey),
    rotations: (store?.rotations ?? 0) + 1,
  };
  writeJson(KEY_FILE, next);
  masterCache = { id, key: neuKey };
  return { id, rotations: next.rotations };
}

/* ─────────────────── Ebene 3: RSA-Schlüsselpaar je Sitzung ─────────────────── */

export interface SessionKeys {
  /** Öffentlicher Schlüssel (SPKI, DER, base64) — kein Geheimnis. */
  pub: string;
  /** Privater Schlüssel (PKCS#8, DER), eingehüllt vom Master-Schlüssel. */
  privWrapped: EncBlob;
  /** Inhalts-Schlüssel (AES-256), verschlüsselt mit dem öffentlichen RSA-Schlüssel. */
  cekWrapped: string;
  /** Mit welchem Master wurde privWrapped eingehüllt (erkennt veraltete Sitzungen). */
  masterId: string;
}

/**
 * Frisches Schlüsselpaar + Inhalts-Schlüssel für eine neue Sitzung.
 * RSA-Erzeugung kostet je nach Maschine 50–200 ms — deshalb einmal pro
 * GESPRÄCH, nicht pro Nachricht. Pro Nachricht wäre der Chat unbenutzbar
 * langsam und sicherheitstechnisch kein Gewinn.
 */
export function createSessionKeys(): SessionKeys {
  const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: RSA_BITS,
    publicKeyEncoding: { type: "spki", format: "der" },
    privateKeyEncoding: { type: "pkcs8", format: "der" },
  });

  const cek = crypto.randomBytes(32);
  const m = master();
  return {
    pub: publicKey.toString("base64"),
    privWrapped: sealWith(m.key, privateKey),
    cekWrapped: rsaSeal(publicKey, cek).toString("base64"),
    masterId: m.id,
  };
}

function rsaSeal(spkiDer: Buffer, plain: Buffer): Buffer {
  const key = crypto.createPublicKey({ key: spkiDer, format: "der", type: "spki" });
  return crypto.publicEncrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, plain);
}

function rsaOpen(pkcs8Der: Buffer, cipher: Buffer): Buffer {
  const key = crypto.createPrivateKey({ key: pkcs8Der, format: "der", type: "pkcs8" });
  return crypto.privateDecrypt({ key, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" }, cipher);
}

/**
 * Inhalts-Schlüssel einer Sitzung auspacken: Master → privater RSA-Schlüssel
 * → Inhalts-Schlüssel. Zwei Auspack-Schritte, danach laufen alle Nachrichten
 * der Sitzung rein symmetrisch (schnell).
 */
export function sessionCek(keys: SessionKeys): Buffer {
  const priv = openWith(master().key, keys.privWrapped);
  return rsaOpen(priv, Buffer.from(keys.cekWrapped, "base64"));
}

/** Für die Rotation: privaten Schlüssel mit altem Master öffnen, mit neuem einhüllen. */
export function rewrapPrivate(keys: SessionKeys, alt: Buffer, neu: Buffer, neuId: string): SessionKeys {
  const priv = openWith(alt, keys.privWrapped);
  return { ...keys, privWrapped: sealWith(neu, priv), masterId: neuId };
}

/* ───────────────────── Ebene 4: Nachrichten (AES-256-GCM) ───────────────────── */

export function encryptMessage(cek: Buffer, text: string): EncBlob {
  return sealWith(cek, Buffer.from(text, "utf8"));
}

export function decryptMessage(cek: Buffer, blob: EncBlob): string {
  return openWith(cek, blob).toString("utf8");
}

/* ───────────────────────────── Altbestand ───────────────────────────── */

/**
 * Erste Fassung dieses Features verschlüsselte Nachrichten direkt mit einem
 * aus SESSION_SECRET abgeleiteten Schlüssel, ohne RSA-Hülle. Solche Sitzungen
 * bleiben lesbar, damit niemandem ein laufendes Gespräch abreißt; neue
 * Sitzungen entstehen nur noch im neuen Format.
 */
export function legacyKey(): Buffer {
  return crypto.scryptSync(serverSecret(), "studio-lokal-ai-chat-v1", 32);
}
export function legacyDecrypt(blob: EncBlob): string {
  return openWith(legacyKey(), blob).toString("utf8");
}
