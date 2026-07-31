// Prüft die Hüllenverschlüsselung des KI-Chats: RSA-2048 über AES-256-GCM,
// Master-Rotation ohne Datenverlust, Krypto-Schreddern, Altbestand.
process.env.SESSION_SECRET = "test-secret-fuer-chatkeys";

import fs from "fs";
import path from "path";
import os from "os";
import crypto from "crypto";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "chatkeys-test-"));
process.env.DATA_DIR = tmp;

const K = await import("./chatKeys.ts");
const C = await import("./aiChat.ts");

let pass = 0, fail = 0;
const ok = (n, c, i = "") => { c ? pass++ : fail++; console.log(`${c ? "  OK  " : " FAIL "} ${n}${i ? "  — " + i : ""}`); };
const section = (t) => console.log(`\n=== ${t} ===`);
const rawFile = (f) => { const p = path.join(tmp, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : null; };
const sessionsRaw = () => rawFile("ai-chat-sessions.json") || [];

/* ─────────────────────────────────────────────────────────── */
section("1) Master-Schlüssel");
const m1 = K.master();
ok("Master wird beim ersten Zugriff erzeugt", Buffer.isBuffer(m1.key) && m1.key.length === 32);
ok("Hat eine Kennung", typeof m1.id === "string" && m1.id.length > 0, m1.id);
ok("Liegt NICHT im Klartext auf der Platte", (() => {
  const store = rawFile("chat-keys.json");
  return !JSON.stringify(store).includes(m1.key.toString("base64")) && !JSON.stringify(store).includes(m1.key.toString("hex"));
})());
ok("Ist von der KEK eingehüllt (iv/tag/data)", (() => {
  const w = rawFile("chat-keys.json")?.wrapped;
  return !!w?.iv && !!w?.tag && !!w?.data;
})());
ok("Wiederholter Zugriff liefert denselben Schlüssel", K.master().key.equals(m1.key));

const status = K.masterStatus();
ok("Status zeigt einen Fingerabdruck", /^[0-9A-F]{4}( [0-9A-F]{4}){3}$/.test(status.fingerprint), status.fingerprint);
ok("Status enthält KEIN Schlüsselmaterial",
   !JSON.stringify(status).includes(m1.key.toString("hex")) && !JSON.stringify(status).includes(m1.key.toString("base64")));

section("2) RSA-Schlüsselpaar je Sitzung");
const keys = K.createSessionKeys();
ok("Öffentlicher Schlüssel ist vorhanden (SPKI/DER, base64)", typeof keys.pub === "string" && keys.pub.length > 300);
ok("Es ist wirklich ein RSA-2048-Schlüssel", (() => {
  const pk = crypto.createPublicKey({ key: Buffer.from(keys.pub, "base64"), format: "der", type: "spki" });
  return pk.asymmetricKeyType === "rsa" && pk.asymmetricKeyDetails.modulusLength === 2048;
})());
ok("Privater Schlüssel ist eingehüllt, nicht im Klartext", !!keys.privWrapped?.iv && !!keys.privWrapped?.tag);
ok("Inhalts-Schlüssel ist RSA-verschlüsselt (256 Byte bei RSA-2048)",
   Buffer.from(keys.cekWrapped, "base64").length === 256, `${Buffer.from(keys.cekWrapped, "base64").length} Byte`);
ok("Master-Kennung ist vermerkt", keys.masterId === m1.id);

const cek = K.sessionCek(keys);
ok("Inhalts-Schlüssel lässt sich auspacken (Master → RSA → CEK)", Buffer.isBuffer(cek) && cek.length === 32);

ok("Jede Sitzung bekommt ein EIGENES Schlüsselpaar", (() => {
  const a = K.createSessionKeys(), b = K.createSessionKeys();
  return a.pub !== b.pub && !K.sessionCek(a).equals(K.sessionCek(b));
})());

section("3) Nachrichten-Verschlüsselung");
const geheim = "Meine Kamera an der Garage, IP 192.168.1.50, Passwort Sommer2026";
const blob = K.encryptMessage(cek, geheim);
ok("Klartext steckt nicht im Chiffrat", !JSON.stringify(blob).includes("Garage") && !JSON.stringify(blob).includes("192.168"));
ok("Entschlüsselt ergibt das Original", K.decryptMessage(cek, blob) === geheim);
ok("Gleicher Text → unterschiedliche Chiffrate (eigener IV je Nachricht)",
   K.encryptMessage(cek, geheim).data !== K.encryptMessage(cek, geheim).data);
ok("Fremder Inhalts-Schlüssel kann nicht entschlüsseln", (() => {
  try { K.decryptMessage(crypto.randomBytes(32), blob); return false; } catch { return true; }
})());
ok("Manipuliertes Chiffrat wird erkannt (GCM-Auth-Tag)", (() => {
  const b = Buffer.from(blob.data, "base64"); b[0] ^= 0xff;
  try { K.decryptMessage(cek, { ...blob, data: b.toString("base64") }); return false; } catch { return true; }
})());
ok("Auch ein langer Text funktioniert (RSA allein könnte das nie)", (() => {
  const lang = "x".repeat(5000);
  return K.decryptMessage(cek, K.encryptMessage(cek, lang)) === lang;
})());

section("4) Ende-zu-Ende durch die volle Kette (echte Sitzungen)");
const s1 = C.createSession();
C.appendMessage(s1.session.id, "user", "Hallo, ich heisse Andrej.");
C.appendMessage(s1.session.id, "assistant", "Guten Tag, Andrej!");
C.appendMessage(s1.session.id, "user", "Wie heisse ich?");

let loaded = C.loadSession(s1.cookieValue);
let hist = C.decryptedHistory(loaded);
ok("Alle drei Nachrichten kommen entschlüsselt zurück", hist.length === 3);
ok("Reihenfolge stimmt", hist.map((h) => h.from).join(",") === "user,assistant,user");
ok("Klartext ist korrekt", hist[0].text === "Hallo, ich heisse Andrej.");
ok("Die KI würde also den Verlauf sehen — genau das braucht sie",
   hist.every((h) => typeof h.text === "string" && h.text.length > 0));
ok("Auf der Platte steht nichts davon im Klartext",
   !JSON.stringify(sessionsRaw()).includes("Andrej"));
ok("Sitzung trägt ein RSA-Schlüsselpaar", !!sessionsRaw().find((x) => x.id === s1.session.id)?.keys?.pub);

section("5) Master-Rotation — Gespräche müssen lesbar BLEIBEN");
const s2 = C.createSession();
C.appendMessage(s2.session.id, "user", "Zweites Gespraech, bitte erhalten.");
const vorherId = K.masterStatus().id;
const vorherFinger = K.masterStatus().fingerprint;

const rot = C.rotateChatMaster();
ok("Rotation meldet Erfolg", typeof rot.id === "string" && rot.id !== vorherId, `${vorherId} → ${rot.id}`);
ok("Beide Sitzungen wurden neu eingehüllt", rot.sessions >= 2, `${rot.sessions} Sitzungen`);
ok("Keine wurde übersprungen", rot.skipped === 0);
ok("Fingerabdruck hat sich geändert", K.masterStatus().fingerprint !== vorherFinger);
ok("Rotationszähler ist gestiegen", K.masterStatus().rotations === 1);

hist = C.decryptedHistory(C.loadSession(s1.cookieValue));
ok("Gespräch 1 ist nach der Rotation WEITER lesbar", hist.length === 3 && hist[0].text === "Hallo, ich heisse Andrej.");
hist = C.decryptedHistory(C.loadSession(s2.cookieValue));
ok("Gespräch 2 ebenfalls", hist.length === 1 && /bitte erhalten/.test(hist[0].text));
ok("Alle Sitzungen verweisen auf den neuen Master",
   sessionsRaw().filter((x) => x.keys).every((x) => x.keys.masterId === rot.id));

C.appendMessage(s1.session.id, "user", "Nach der Rotation geschrieben.");
hist = C.decryptedHistory(C.loadSession(s1.cookieValue));
ok("Neue Nachrichten nach der Rotation funktionieren", hist.length === 4 && /Nach der Rotation/.test(hist[3].text));

section("6) Zweite Rotation (Wiederholbarkeit)");
const rot2 = C.rotateChatMaster();
ok("Auch die zweite Rotation läuft durch", rot2.rotations === 2 && rot2.skipped === 0);
ok("Gespräch 1 immer noch lesbar", C.decryptedHistory(C.loadSession(s1.cookieValue)).length === 4);

section("7) Krypto-Schreddern — gelöschtes Gespräch bleibt unlesbar");
const geschreddert = sessionsRaw().find((x) => x.id === s2.session.id);
const kopieDerNachrichten = JSON.parse(JSON.stringify(geschreddert.messages));
C.deleteSession(s2.session.id);
ok("Sitzung ist aus der Datei entfernt", !sessionsRaw().some((x) => x.id === s2.session.id));
ok("Die Chiffrate lagen vorher noch vor", kopieDerNachrichten.length === 1);
ok("Ohne den privaten Sitzungsschlüssel sind sie nicht mehr zu öffnen — auch mit Master nicht",
   (() => {
     // Selbst mit korrektem Master fehlt der zu diesen Nachrichten gehörende
     // private RSA-Schluessel; ein anderer Sitzungsschlüssel hilft nicht.
     const andere = sessionsRaw().find((x) => x.keys);
     try {
       const fremderCek = K.sessionCek(andere.keys);
       K.decryptMessage(fremderCek, kopieDerNachrichten[0].enc);
       return false;
     } catch { return true; }
   })());

section("8) Altbestand aus der ersten Fassung bleibt lesbar");
// Eine Sitzung im ALTEN Format nachbauen (direkt mit dem Legacy-Schlüssel).
const altCek = K.legacyKey();
const altIv = crypto.randomBytes(12);
const altC = crypto.createCipheriv("aes-256-gcm", altCek, altIv);
const altData = Buffer.concat([altC.update("Alte Nachricht ohne RSA", "utf8"), altC.final()]);
const alle = sessionsRaw();
alle.push({
  id: "legacy-test",
  tokenHash: "unbenutzt",
  messages: [{ from: "user", at: new Date().toISOString(), enc: { iv: altIv.toString("base64"), tag: altC.getAuthTag().toString("base64"), data: altData.toString("base64") } }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 6e8).toISOString(),
});
fs.writeFileSync(path.join(tmp, "ai-chat-sessions.json"), JSON.stringify(alle));
await new Promise((r) => setTimeout(r, 5));
const legacySession = sessionsRaw().find((x) => x.id === "legacy-test");
ok("Sitzung ohne Schlüsselpaar wird über den Altpfad gelesen",
   C.decryptedHistory(legacySession)[0]?.text === "Alte Nachricht ohne RSA");

section("9) Unlesbare Nachrichten brechen nicht die ganze Anfrage ab");
const s3 = C.createSession();
C.appendMessage(s3.session.id, "user", "Gut lesbar.");
const kaputt = sessionsRaw();
const ziel = kaputt.find((x) => x.id === s3.session.id);
// Eine zweite, absichtlich beschädigte Nachricht anhängen.
ziel.messages.push({ from: "assistant", at: new Date().toISOString(), enc: { iv: "AAAAAAAAAAAAAAAA", tag: "AAAAAAAAAAAAAAAAAAAAAA==", data: "AAAA" } });
fs.writeFileSync(path.join(tmp, "ai-chat-sessions.json"), JSON.stringify(kaputt));
await new Promise((r) => setTimeout(r, 5));
const gemischt = C.decryptedHistory(C.loadSession(s3.cookieValue));
ok("Die lesbare Nachricht kommt trotzdem durch", gemischt.length === 1 && gemischt[0].text === "Gut lesbar.");

section("10) Alles löschen (Notbremse) + Kennzahlen");
const vorAllemLoeschen = C.chatStats();
ok("Kennzahlen melden Sitzungen und Nachrichten", vorAllemLoeschen.sessions > 0 && vorAllemLoeschen.messages > 0,
   `${vorAllemLoeschen.sessions} Sitzungen / ${vorAllemLoeschen.messages} Nachrichten`);
ok("Kennzahlen enthalten KEINE Inhalte", !JSON.stringify(vorAllemLoeschen).match(/Andrej|lesbar|Garage/));
const geloescht = C.deleteAllSessions();
ok("Alle Sitzungen gelöscht", geloescht === vorAllemLoeschen.sessions && sessionsRaw().length === 0);
ok("Kennzahlen danach bei null", C.chatStats().sessions === 0 && C.chatStats().messages === 0);

console.log(`\n──────────────────────────────\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen\n`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
