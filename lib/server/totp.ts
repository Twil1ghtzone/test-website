import crypto from "crypto";

// ── TOTP (RFC 6238) ohne externe Abhängigkeit ──
// Kompatibel mit Google Authenticator, Aegis, 1Password, Bitwarden …
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DIGITS = 6;
const PERIOD = 30;

export function generateSecret(byteLength = 20): string {
  const bytes = crypto.randomBytes(byteLength);
  let bits = "";
  for (const b of bytes) bits += b.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) out += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}

function base32Decode(encoded: string): Buffer {
  let bits = "";
  for (const ch of encoded.toUpperCase()) {
    const v = BASE32.indexOf(ch);
    if (v === -1) continue; // Leerzeichen/Padding ignorieren
    bits += v.toString(2).padStart(5, "0");
  }
  const bytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(bits.slice(i * 8, (i + 1) * 8), 2);
  return bytes;
}

export function generateTOTP(secret: string, offset = 0): string {
  const counter = Math.floor(Date.now() / 1000 / PERIOD) + offset;
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hash = crypto.createHmac("sha1", base32Decode(secret)).update(buf).digest();
  const off = hash[hash.length - 1] & 0x0f;
  const bin =
    ((hash[off] & 0x7f) << 24) | ((hash[off + 1] & 0xff) << 16) | ((hash[off + 2] & 0xff) << 8) | (hash[off + 3] & 0xff);
  return (bin % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

// Prüft mit ±1 Zeitfenster (Uhr-Drift). Vergleich zeitkonstant, damit
// Antwortzeiten keinen Hinweis auf Teil-Treffer geben.
export function verifyTOTP(secret: string, token: string, window = 1): boolean {
  const clean = String(token).replace(/\D/g, "");
  if (clean.length !== DIGITS) return false;
  let ok = false;
  for (let i = -window; i <= window; i++) {
    const expected = generateTOTP(secret, i);
    // Kein early-return: immer alle Fenster durchlaufen.
    if (crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(clean))) ok = true;
  }
  return ok;
}

export function totpUri(secret: string, username: string, issuer = "STUDIO//LOKAL"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(username)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&digits=${DIGITS}&period=${PERIOD}&algorithm=SHA1`;
}

// Wiederherstellungs-Codes: einmal anzeigen, nur als Hash speichern.
export function generateRecoveryCodes(count = 8): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(5).toString("hex").toUpperCase().match(/.{1,5}/g)!.join("-")
  );
}
export function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code.replace(/\s|-/g, "").toUpperCase()).digest("hex");
}
export function verifyRecoveryCode(code: string, hashes: string[]): number {
  const h = hashCode(code);
  return hashes.findIndex((x) => x === h);
}
