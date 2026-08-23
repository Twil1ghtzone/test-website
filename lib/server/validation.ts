import { z } from "zod";

// Zod-Schemas für die öffentlichen, zustandsändernden API-Routen. Eigenes
// Modul (kein next/server-Import), damit sich die Validierung ohne
// Next.js-Laufzeit direkt testen lässt — siehe validation.test.mjs.

// Grenzen entsprechen den bisherigen .slice()-Kappungen in app/api/inquiries/route.ts
// — Verhalten unverändert, nur jetzt an einer Stelle deklariert.
export const inquirySchema = z.object({
  name: z.string().trim().min(1, "Name, E-Mail und Nachricht sind erforderlich.").max(120),
  email: z.string().trim().min(1).max(160).email("Bitte eine gültige E-Mail-Adresse angeben."),
  message: z.string().trim().min(1, "Name, E-Mail und Nachricht sind erforderlich.").max(4000),
  phone: z.string().trim().max(60).optional(),
  topic: z.string().trim().max(120).optional(),
  building: z.string().trim().max(120).optional(),
  packages: z.array(z.unknown()).max(12).optional(),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
  code: z.string().trim().optional(),
});

export const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  // Honeypot: nur Bots füllen dieses Feld aus.
  website: z.string().optional(),
});

// Locker gehalten (alle Felder optional): die zwei Aktionen ("verify" und die
// eigentliche Abgabe) in app/api/reviews/route.ts haben unterschiedliche
// Pflichtfelder, die dort weiterhin fachlich geprüft werden. Dieses Schema
// sichert nur die Grundform (Objekt, richtige Typen) ab.
export const reviewBodySchema = z.object({
  action: z.string().optional(),
  invoice: z.union([z.string(), z.number()]).optional(),
  website: z.string().optional(),
  name: z.string().optional(),
  rating: z.union([z.number(), z.string()]).optional(),
  text: z.string().optional(),
});

/* ─────────────────────────── KI-Chat ─────────────────────────── */

/**
 * Körper von POST /api/chat.
 *
 * Nimmt bewusst ZWEI Formen an:
 *   { text: "…" }                       — aktuell
 *   { messages: [{ role, text }, …] }   — Format vor der Umstellung
 *
 * Die Altlast bleibt, weil ein Browser-Tab mit dem vorherigen JavaScript-
 * Bundle (offener Tab, Cache, Zurück-Navigation) weiterhin das alte Format
 * sendet. Ohne diesen Zweig bekam er „Leere Nachricht." und der Chat wirkte
 * kaputt, obwohl Server und KI einwandfrei liefen.
 *
 * Aus dem alten Format wird ausschließlich die LETZTE Nutzernachricht
 * übernommen — der Verlauf kommt serverseitig aus der verschlüsselten
 * Sitzung, damit niemand über die Konsole erfundene KI-Antworten in den
 * Kontext schieben kann. `role`/`from` und `text`/`content` sind beide
 * erlaubt, weil im Altbestand beide Schreibweisen vorkamen.
 */
export const chatMessageSchema = z.object({
  role: z.string().optional(),
  from: z.string().optional(),
  text: z.string().optional(),
  content: z.string().optional(),
});

export const chatBodySchema = z.object({
  text: z.string().optional(),
  messages: z.array(chatMessageSchema).max(200).optional(),
});

/* ─────────────────────────── Support-Tickets ─────────────────────────── */

/*
 * Support nimmt JSON UND multipart/form-data (mit Anhängen) entgegen. Beide
 * Wege werden in app/api/support/route.ts zuerst in dieselbe flache
 * Feldstruktur überführt — GENAU DORT setzt die Prüfung an, damit für beide
 * Übertragungsarten dieselben Regeln gelten und nicht zwei Prüfpfade
 * auseinanderlaufen können.
 *
 * Die Längen entsprechen den bisherigen `.slice()`-Kappungen. Zu langer Text
 * wird wie zuvor gekürzt statt abgelehnt (`.slice()`-Verhalten über
 * `transform`), damit eine etwas zu lange Nachricht nicht die ganze Anfrage
 * scheitern lässt — das war schon vorher so und ist für ein Support-Formular
 * das freundlichere Verhalten.
 */
const gekuerzt = (max: number) => z.string().transform((s) => s.trim().slice(0, max));

/** Neues Ticket (POST). */
export const supportCreateSchema = z.object({
  name: gekuerzt(80).refine((s) => s.length >= 2, "Bitte einen Namen angeben."),
  email: gekuerzt(160).refine(
    (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s),
    "Bitte eine gültige E-Mail angeben."
  ),
  subject: gekuerzt(160).refine((s) => s.length > 0, "Bitte einen Betreff angeben."),
  message: gekuerzt(4000).refine(
    (s) => s.length >= 10,
    "Bitte beschreiben Sie Ihr Anliegen (min. 10 Zeichen)."
  ),
  prio: z.string().optional(),
});

/** Kundenantwort auf ein bestehendes Ticket (PATCH). */
export const supportReplySchema = z.object({
  number: z.string().trim().min(1, "Ticketnummer fehlt."),
  text: gekuerzt(4000),
});
