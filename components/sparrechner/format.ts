export type Kontakt = { companyName: string; email: string; phone: string; region: string };

export const nf = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });
export const eur = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export const eur2 = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
export const komma = (n: number, stellen = 1) => n.toFixed(stellen).replace(".", ",");

/** Amortisationsdauer menschlich: unter 2 Jahren in Monaten, sonst in Jahren. */
export function dauerText(jahre: number): string {
  if (jahre < 2) {
    const monate = Math.round(jahre * 12);
    return `${monate} Monat${monate === 1 ? "" : "en"}`;
  }
  return `${komma(jahre)} Jahren`;
}
