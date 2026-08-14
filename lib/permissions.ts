/* ════════════════════════════════════════════════════════════════════════
   ROLLEN UND BERECHTIGUNGEN — die eine Quelle der Wahrheit

   Bewusst OHNE Server-Abhängigkeiten (kein fs, kein path). Nur so kann das
   Admin-Panel als Client-Komponente dieselbe Liste nutzen wie der Server.

   Vorher standen Liste und Beschriftungen doppelt: einmal in
   lib/server/store.ts (Server) und einmal in app/admin/page.tsx (Client),
   weil ein Client-Component nicht aus dem Store importieren darf — der zieht
   `fs` mit in den Browser-Bundle. Beide Kopien waren zufällig deckungsgleich;
   eine neue Berechtigung nur an einer Stelle einzutragen hätte gereicht,
   damit sie in der Oberfläche stillschweigend fehlt (Rechte, die man nicht
   sieht, kann man auch nicht vergeben oder entziehen).
   ════════════════════════════════════════════════════════════════════════ */

export type Role = "admin" | "editor";

export type Permission =
  | "inquiries" | "users" | "settings" | "blog" | "backup" | "cookies"
  | "reviews" | "tickets" | "chat" | "orders" | "finance" | "activity" | "database" | "invoices"
  | "support" | "legal";

/**
 * Reihenfolge = Reihenfolge in der Oberfläche (Rechte-Auswahl beim Benutzer).
 * Grob nach Alltagsnähe sortiert: Tagesgeschäft zuerst, Technik und
 * Gefährliches hinten.
 */
export const ALL_PERMISSIONS: Permission[] = [
  "inquiries", "users", "blog", "reviews", "invoices", "tickets", "chat",
  "orders", "finance", "activity", "settings", "backup", "cookies", "database",
  "support", "legal",
];

export const PERMISSION_LABELS: Record<Permission, string> = {
  inquiries: "Anfragen",
  users: "Benutzer",
  settings: "KI & Einstellungen",
  blog: "Blog",
  backup: "Backup",
  cookies: "Cookies",
  reviews: "Bewertungen",
  tickets: "Tickets",
  chat: "Team-Chat",
  orders: "Aufträge",
  finance: "Finanzen",
  activity: "Aktivität",
  database: "Datenbank",
  invoices: "Rechnungen",
  support: "Support-Tickets",
  legal: "Rechtstexte & Kontakt",
};

export type Permissions = Record<Permission, boolean>;

export const emptyPermissions = (): Permissions =>
  ALL_PERMISSIONS.reduce((a, p) => ({ ...a, [p]: false }), {} as Permissions);

export const fullPermissions = (): Permissions =>
  ALL_PERMISSIONS.reduce((a, p) => ({ ...a, [p]: true }), {} as Permissions);

/** Admins haben immer alle Rechte — unabhängig davon, was gespeichert ist. */
export function hatBerechtigung(
  u: { role: Role; permissions?: Partial<Record<Permission, boolean>> } | null,
  p: Permission
): boolean {
  if (!u) return false;
  return u.role === "admin" || !!u.permissions?.[p];
}
