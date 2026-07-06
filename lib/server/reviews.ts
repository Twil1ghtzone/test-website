import crypto from "crypto";
import type { Review } from "./store";

function secret(): string {
  return process.env.SESSION_SECRET || "studio-lokal-dev-secret-bitte-aendern";
}

// HMAC-Siegel über die unveränderlichen Felder einer Bewertung.
// Nur der Server kennt das Secret → Einträge können nicht "ausgedacht"
// oder nachträglich manipuliert werden, ohne dass das Siegel bricht.
export function sealReview(r: Pick<Review, "id" | "name" | "rating" | "text" | "createdAt">): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${r.id}|${r.name}|${r.rating}|${r.text}|${r.createdAt}`)
    .digest("hex");
}

export function verifyReview(r: Review): boolean {
  const expected = sealReview(r);
  try {
    return crypto.timingSafeEqual(Buffer.from(r.seal, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// IP nur gehasht speichern (Datenschutz) — reicht fürs Rate-Limit.
export function hashIp(ip: string): string {
  return crypto.createHmac("sha256", secret()).update(`ip:${ip}`).digest("hex").slice(0, 32);
}
