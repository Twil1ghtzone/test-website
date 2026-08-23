import type { Role, Permissions } from "@/lib/permissions";

/*
 * Gemeinsame Typen des Admin-Bereichs.
 *
 * Bewusst eigene, schlankere Definitionen statt der Server-Typen aus
 * lib/server/store.ts: Der Client bekommt NICHT alle Felder — `passwordHash`,
 * `totpSecret` und `totpRecovery` verlassen den Server nie (siehe
 * `publicUser()` in lib/server/auth.ts). Würde hier der Server-Typ verwendet,
 * sähe der Code so aus, als stünden diese Felder zur Verfügung.
 */

export type User = {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permissions;
  active: boolean;
  createdAt: string;
};

export type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  topic?: string;
  building?: string;
  message: string;
  packages?: string[];
  status: "neu" | "gelesen" | "erledigt";
  createdAt: string;
};

/** Alle Bereiche des Admin-Panels — steuert die Seitenleiste und das aktive Panel. */
export type Tab =
  | "overview" | "users" | "inquiries" | "blog" | "settings" | "backup" | "cookies"
  | "reviews" | "tickets" | "chat" | "orders" | "finance" | "activity" | "database" | "account"
  | "invoices" | "assistant" | "support" | "legal" | "chatkeys";
