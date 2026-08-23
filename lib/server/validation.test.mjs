/* Tests für die Zod-Schemas der öffentlichen API-Routen.
   Lauf: node --experimental-strip-types --no-warnings lib/server/validation.test.mjs */

import {
  inquirySchema, loginSchema, subscribeSchema, reviewBodySchema,
  chatBodySchema, supportCreateSchema, supportReplySchema,
} from "./validation.ts";

let bestanden = 0;
let fehlgeschlagen = 0;

function ok(name, bedingung, detail = "") {
  if (bedingung) {
    bestanden++;
    console.log(`  OK   ${name}${detail ? `  — ${detail}` : ""}`);
  } else {
    fehlgeschlagen++;
    console.log(` FAIL  ${name}${detail ? `  — ${detail}` : ""}`);
  }
}
const section = (t) => console.log(`\n=== ${t} ===`);

/* ─────────────────────────────────────────────────────────── */
section("1) inquirySchema — Kontaktformular (app/api/inquiries)");

ok("Gültige Anfrage besteht", inquirySchema.safeParse({
  name: "Max Mustermann", email: "max@example.de", message: "Bitte um Rückruf.",
}).success);

ok("Fehlender Name schlägt fehl", !inquirySchema.safeParse({
  email: "max@example.de", message: "Text",
}).success);

ok("Ungültige E-Mail schlägt fehl", !inquirySchema.safeParse({
  name: "Max", email: "keine-email", message: "Text",
}).success);

ok("Leere Nachricht schlägt fehl", !inquirySchema.safeParse({
  name: "Max", email: "max@example.de", message: "",
}).success);

ok("Optionale Felder dürfen fehlen", inquirySchema.safeParse({
  name: "Max", email: "max@example.de", message: "Text",
}).success);

ok("Zu lange Nachricht (>4000 Zeichen) schlägt fehl", !inquirySchema.safeParse({
  name: "Max", email: "max@example.de", message: "x".repeat(4001),
}).success);

/* ─────────────────────────────────────────────────────────── */
section("2) loginSchema — Admin-Login (app/api/auth/login)");

ok("Benutzername + Passwort reichen", loginSchema.safeParse({
  username: "admin", password: "geheim123",
}).success);

ok("Fehlendes Passwort schlägt fehl", !loginSchema.safeParse({
  username: "admin",
}).success);

ok("Leerer Benutzername schlägt fehl", !loginSchema.safeParse({
  username: "", password: "geheim123",
}).success);

ok("2FA-Code ist optional", loginSchema.safeParse({
  username: "admin", password: "geheim123", code: "123456",
}).success);

/* ─────────────────────────────────────────────────────────── */
section("3) subscribeSchema — Blog-Abo (app/api/blog/subscribe)");

ok("Gültige E-Mail besteht", subscribeSchema.safeParse({ email: "leser@example.de" }).success);
ok("Ungültige E-Mail schlägt fehl", !subscribeSchema.safeParse({ email: "keine-email" }).success);
ok("Honeypot-Feld ist optional", subscribeSchema.safeParse({ email: "leser@example.de", website: "" }).success);

/* ─────────────────────────────────────────────────────────── */
section("4) reviewBodySchema — Bewertungen (app/api/reviews)");

ok("Verify-Aktion mit Rechnungsnummer besteht", reviewBodySchema.safeParse({
  action: "verify", invoice: "RE-2026-001",
}).success);

ok("Vollständige Bewertung besteht", reviewBodySchema.safeParse({
  invoice: "RE-2026-001", name: "Max", rating: 5, text: "Sehr zufrieden.",
}).success);

ok("Leeres Objekt besteht (Felder sind alle optional, Fachlogik prüft weiter)",
  reviewBodySchema.safeParse({}).success);

ok("Falscher Typ (Array statt Objekt) schlägt fehl", !reviewBodySchema.safeParse([]).success);
ok("Falscher Typ für rating (Objekt) schlägt fehl", !reviewBodySchema.safeParse({ rating: {} }).success);

/* ─────────────────────────────────────────────────────────── */
section("5) chatBodySchema — KI-Chat (app/api/chat)");

ok("Aktuelles Format { text } besteht", chatBodySchema.safeParse({ text: "Hallo" }).success);

// Das ist der Grund, warum das Schema locker sein MUSS: Ein Browser-Tab mit
// altem JavaScript-Bundle sendet noch dieses Format. Würde es abgelehnt,
// wirkte der Chat für diese Besucher kaputt.
ok("Altes Format { messages } besteht weiterhin", chatBodySchema.safeParse({
  messages: [{ role: "user", text: "Hallo" }, { role: "assistant", text: "Hi" }],
}).success);

ok("Alte Schreibweise from/content besteht ebenfalls", chatBodySchema.safeParse({
  messages: [{ from: "user", content: "Hallo" }],
}).success);

ok("Leeres Objekt besteht (Route meldet dann selbst: keine Nachricht dabei)",
  chatBodySchema.safeParse({}).success);

ok("messages als Nicht-Array schlägt fehl", !chatBodySchema.safeParse({ messages: "Hallo" }).success);
ok("text als Zahl schlägt fehl", !chatBodySchema.safeParse({ text: 42 }).success);
ok("Mehr als 200 Nachrichten schlagen fehl (Speicher-Bremse)",
  !chatBodySchema.safeParse({ messages: Array(201).fill({ role: "user", text: "x" }) }).success);

/* ─────────────────────────────────────────────────────────── */
section("6) supportCreateSchema — neues Ticket (app/api/support)");

const gueltigesTicket = {
  name: "Max Mustermann",
  email: "max@example.de",
  subject: "Drucker offline",
  message: "Der Drucker im Büro reagiert seit heute früh nicht mehr.",
};
ok("Gültiges Ticket besteht", supportCreateSchema.safeParse(gueltigesTicket).success);
ok("Zu kurzer Name schlägt fehl", !supportCreateSchema.safeParse({ ...gueltigesTicket, name: "M" }).success);
ok("Ungültige E-Mail schlägt fehl", !supportCreateSchema.safeParse({ ...gueltigesTicket, email: "keine" }).success);
ok("Fehlender Betreff schlägt fehl", !supportCreateSchema.safeParse({ ...gueltigesTicket, subject: "" }).success);
ok("Zu kurze Nachricht (<10 Zeichen) schlägt fehl",
  !supportCreateSchema.safeParse({ ...gueltigesTicket, message: "kaputt" }).success);

// Kürzen statt Ablehnen — bisheriges .slice()-Verhalten, bewusst beibehalten:
// eine etwas zu lange Nachricht soll das Formular nicht scheitern lassen.
const langesTicket = supportCreateSchema.safeParse({ ...gueltigesTicket, message: "x".repeat(5000) });
ok("Überlange Nachricht wird gekürzt statt abgelehnt",
  langesTicket.success && langesTicket.data.message.length === 4000,
  `${langesTicket.success ? langesTicket.data.message.length : "abgelehnt"} Zeichen`);

/* ─────────────────────────────────────────────────────────── */
section("7) supportReplySchema — Kundenantwort");

ok("Antwort mit Nummer und Text besteht",
  supportReplySchema.safeParse({ number: "TK-1234-5678-9ABC", text: "Danke!" }).success);
ok("Fehlende Ticketnummer schlägt fehl",
  !supportReplySchema.safeParse({ number: "", text: "Danke!" }).success);
// Leerer Text ist erlaubt: Die Route lässt eine Antwort zu, die NUR aus einem
// Dateianhang besteht — die Kombination prüft sie selbst.
ok("Leerer Text besteht (Anhang-only-Antwort möglich)",
  supportReplySchema.safeParse({ number: "TK-1234-5678-9ABC", text: "" }).success);

/* ─────────────────────────────────────────────────────────── */
console.log(`\n${bestanden} bestanden, ${fehlgeschlagen} fehlgeschlagen.`);
if (fehlgeschlagen > 0) process.exit(1);
