import crypto from "crypto";
import { readInvoices, INVOICE_STATUS_LABELS, type Review, type Invoice } from "./store";

// Rechnungsnummern normalisieren (Groß-/Kleinschreibung, Leerzeichen).
export function normalizeInvoiceNumber(n: string): string {
  return n.trim().toUpperCase().replace(/\s+/g, "");
}

// Nur im System registrierte Rechnungen sind gültig.
export function findInvoice(number: string): Invoice | undefined {
  const n = normalizeInvoiceNumber(number);
  return readInvoices().find((i) => i.number === n);
}

export function phaseLabel(inv: Invoice): string {
  return INVOICE_STATUS_LABELS[inv.status];
}

// Vor Abschluss = Teilbewertung, danach = Endbewertung.
export function reviewKind(inv: Invoice): "teil" | "end" {
  return inv.status === "abgeschlossen" ? "end" : "teil";
}

// Prozessweites Zufalls-Secret als Produktions-Fallback (siehe lib/server/auth.ts).
const runtimeSecret = crypto.randomBytes(32).toString("hex");

function secret(): string {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  return process.env.NODE_ENV === "production" ? runtimeSecret : "studio-lokal-dev-secret-bitte-aendern";
}

// HMAC-Siegel über die unveränderlichen Felder einer Bewertung.
// Nur der Server kennt das Secret → Einträge können nicht "ausgedacht"
// oder nachträglich manipuliert werden, ohne dass das Siegel bricht.
export function sealReview(r: Pick<Review, "id" | "name" | "rating" | "text" | "createdAt" | "invoiceNumber" | "phase" | "kind">): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${r.id}|${r.name}|${r.rating}|${r.text}|${r.createdAt}|${r.invoiceNumber}|${r.phase}|${r.kind}`)
    .digest("hex");
}

// Altes Siegel-Format (vor Rechnungs-Pflicht) weiter akzeptieren.
function sealReviewV1(r: Pick<Review, "id" | "name" | "rating" | "text" | "createdAt">): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${r.id}|${r.name}|${r.rating}|${r.text}|${r.createdAt}`)
    .digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  try {
    return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export function verifyReview(r: Review): boolean {
  return safeEqual(r.seal, sealReview(r)) || safeEqual(r.seal, sealReviewV1(r));
}

// IP nur gehasht speichern (Datenschutz) — reicht fürs Rate-Limit.
export function hashIp(ip: string): string {
  return crypto.createHmac("sha256", secret()).update(`ip:${ip}`).digest("hex").slice(0, 32);
}
