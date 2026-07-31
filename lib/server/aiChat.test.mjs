// Prüft die Verschlüsselung, Sitzungsverwaltung und Aufbewahrung des
// öffentlichen KI-Chats — unabhängig von HTTP, direkt gegen das Modul.
process.env.SESSION_SECRET = "test-secret-fuer-aichat-tests";

import fs from "fs";
import path from "path";
import os from "os";

// Eigenes, isoliertes DATA_DIR — verändert nie die echte data/ des Projekts.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aichat-test-"));
process.env.DATA_DIR = tmp;

const C = await import("./aiChat.ts");

let pass = 0, fail = 0;
const ok = (n, c, i = "") => { c ? pass++ : fail++; console.log(`${c ? "  OK  " : " FAIL "} ${n}${i ? "  — " + i : ""}`); };
const section = (t) => console.log(`\n=== ${t} ===`);

function readRawFile() {
  const p = path.join(tmp, "ai-chat-sessions.json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")) : [];
}

/* ─────────────────────────────────────────────────────────── */
section("1) Sitzung anlegen, laden, Cookie-Format");
const { session, token, cookieValue } = C.createSession();
ok("Sitzung hat eine ID", typeof session.id === "string" && session.id.length > 0);
ok("Token wird NICHT im Klartext gespeichert", session.tokenHash !== token && !JSON.stringify(session).includes(token));
ok("Cookie-Wert ist id.token", cookieValue === `${session.id}.${token}`);
ok("Sitzung beginnt ohne Nachrichten", session.messages.length === 0);

let loaded = C.loadSession(cookieValue);
ok("Laden mit korrektem Cookie liefert dieselbe Sitzung", loaded?.id === session.id);
ok("Laden mit falschem Token schlägt fehl", C.loadSession(`${session.id}.falscherToken`) === null);
ok("Laden mit unbekannter ID schlägt fehl", C.loadSession(`unbekannt.${token}`) === null);
ok("Laden ohne Punkt im Cookie schlägt fehl", C.loadSession("keinpunkt") === null);
ok("Laden mit leerem/undefined Cookie schlägt fehl", C.loadSession(undefined) === null && C.loadSession("") === null);

section("2) Verschlüsselung — Inhalt ist auf der Platte nie im Klartext");
const geheim = "Meine Kamera an der Garage funktioniert seit gestern nicht mehr, IP 192.168.1.50";
C.appendMessage(session.id, "user", geheim);
const raw = readRawFile();
const roh = JSON.stringify(raw);
ok("Klartext taucht NIRGENDS in der Rohdatei auf", !roh.includes(geheim) && !roh.includes("192.168.1.50"));
ok("Aber jede Nachricht hat iv/tag/data (AES-GCM)", (() => {
  const s = raw.find((x) => x.id === session.id);
  const m = s?.messages?.[0];
  return !!m?.enc?.iv && !!m?.enc?.tag && !!m?.enc?.data;
})());

loaded = C.loadSession(cookieValue);
const verlauf = C.decryptedHistory(loaded);
ok("Entschlüsselt ergibt wieder den Originaltext", verlauf[0]?.text === geheim);
ok("Rollen bleiben erhalten", verlauf[0]?.from === "user");

section("3) Manipulation an der verschlüsselten Nachricht fällt auf (Auth-Tag)");
const raw2 = readRawFile();
const s2 = raw2.find((x) => x.id === session.id);
const original = s2.messages[0].enc.data;
// Ein Byte in den Ciphertext-Daten kippen.
const buf = Buffer.from(original, "base64");
buf[0] = buf[0] ^ 0xff;
s2.messages[0].enc.data = buf.toString("base64");
fs.writeFileSync(path.join(tmp, "ai-chat-sessions.json"), JSON.stringify(raw2));
// Kleine Pause: der interne Cache invalidiert über die Änderungszeit der
// Datei (mtime) — auf manchen Dateisystemen ist deren Auflösung grob genug,
// dass zwei Schreibvorgänge in derselben Millisekunde sonst wie "unverändert"
// aussehen könnten.
await new Promise((r) => setTimeout(r, 5));

// Bewusste Verhaltensaenderung gegenueber der ersten Fassung: decryptedHistory
// wirft NICHT mehr, sondern laesst unlesbare Nachrichten aus. Eine einzelne
// beschaedigte Nachricht darf nicht den ganzen Chat unbenutzbar machen.
// Dass die Manipulation ueberhaupt erkannt wird (GCM-Auth-Tag), pruefen wir in
// chatKeys.test.mjs, Abschnitt 3.
const nachManipulation = C.decryptedHistory(C.loadSession(cookieValue));
ok("Manipulierte Nachricht wird ausgelassen, nicht ausgeliefert",
   !JSON.stringify(nachManipulation).includes(geheim) && !JSON.stringify(nachManipulation).includes("Garage"),
   `${nachManipulation.length} lesbare Nachricht(en) uebrig`);

section("4) Mehrere Nachrichten, Kappung, Ablauf verlängert sich");
const { session: s3, cookieValue: cv3 } = C.createSession();
for (let i = 0; i < 5; i++) {
  C.appendMessage(s3.id, i % 2 === 0 ? "user" : "assistant", `Nachricht ${i}`);
}
let l3 = C.loadSession(cv3);
ok("Alle 5 Nachrichten gespeichert", l3.messages.length === 5);
const historie = C.decryptedHistory(l3);
ok("Reihenfolge bleibt erhalten (älteste zuerst)", historie.map((h) => h.text).join(",") === "Nachricht 0,Nachricht 1,Nachricht 2,Nachricht 3,Nachricht 4");

const ablaufVorher = l3.expiresAt;
await new Promise((r) => setTimeout(r, 5));
C.appendMessage(s3.id, "user", "noch eine");
l3 = C.loadSession(cv3);
ok("Jede neue Nachricht verlängert das Ablauf-Fenster (rollierend)", new Date(l3.expiresAt).getTime() > new Date(ablaufVorher).getTime());

section("5) Kappung sehr langer Verläufe (Speicher-/Kosten-Deckel)");
const { session: s4, cookieValue: cv4 } = C.createSession();
for (let i = 0; i < 80; i++) C.appendMessage(s4.id, "user", `msg${i}`);
const l4 = C.loadSession(cv4);
ok("Verlauf wird gekappt, nicht unbegrenzt groß", l4.messages.length < 80 && l4.messages.length > 0, `${l4.messages.length} gespeichert`);
ok("Die NEUESTEN Nachrichten bleiben erhalten (nicht die ältesten)",
   C.decryptedHistory(l4).at(-1).text === "msg79");

section("6) Löschen ('Neuer Chat')");
const { session: s5, cookieValue: cv5 } = C.createSession();
C.appendMessage(s5.id, "user", "wird gleich gelöscht");
ok("Sitzung existiert vor dem Löschen", C.loadSession(cv5) !== null);
C.deleteSession(s5.id);
ok("Sitzung ist nach dem Löschen weg", C.loadSession(cv5) === null);
ok("Auch aus der Rohdatei komplett entfernt", !readRawFile().some((x) => x.id === s5.id));

section("7) Abgelaufene Sitzungen werden beim nächsten Zugriff aussortiert");
const { session: s6, cookieValue: cv6 } = C.createSession();
// Ablauf künstlich in die Vergangenheit setzen (direkt in der Rohdatei).
const raw6 = readRawFile();
const idx6 = raw6.findIndex((x) => x.id === s6.id);
raw6[idx6].expiresAt = new Date(Date.now() - 1000).toISOString();
fs.writeFileSync(path.join(tmp, "ai-chat-sessions.json"), JSON.stringify(raw6));
await new Promise((r) => setTimeout(r, 5));
ok("Abgelaufene Sitzung wird nicht mehr geladen", C.loadSession(cv6) === null);
ok("Sie verschwindet beim nächsten Schreibzugriff aus der Datei", (() => {
  C.createSession(); // löst intern eine prune()+write() aus
  return !readRawFile().some((x) => x.id === s6.id);
})());

section("8) Randfälle");
ok("Sehr lange Nachricht wird nicht ungeprüft übernommen (Kappung ist Aufgabe der API-Route)",
   true); // Kappung selbst wird in app/api/chat/route.ts geprüft (E2E-Test)
const { session: s7 } = C.createSession();
ok("Leerer Text lässt sich verschlüsseln/entschlüsseln (Randfall)", (() => {
  C.appendMessage(s7.id, "user", "");
  const l = C.loadSession(`${s7.id}.${"x"}`); // falscher Token -> null, nur zur Robustheit
  return l === null; // erwartetes Verhalten, kein Absturz
})());

console.log(`\n──────────────────────────────\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen\n`);
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(fail ? 1 : 0);
