/* ════════════════════════════════════════════════════════════════════════
   WER DARF WAS AN BENUTZERKONTEN ÄNDERN

   Reine Entscheidungslogik ohne Datenbank und ohne HTTP — dadurch
   unabhängig prüfbar (lib/server/benutzerRechte.test.mjs).

   Hintergrund: Die Berechtigung "users" erlaubt Benutzerverwaltung. Sie war
   aber versehentlich ein Generalschlüssel — ein Redakteur mit dieser einen
   Berechtigung konnte

     · sich selbst sämtliche übrigen Rechte eintragen (Backup, Datenbank,
       KI-Einstellungen …),
     · das Passwort eines Admin-Kontos überschreiben und sich anschließend
       als Admin anmelden,
     · beim Anlegen ein neues Konto mit allen Rechten erzeugen,
     · Admin-Konten löschen.

   Jeder dieser Wege führt an der Rollenschranke vorbei. Die Regeln hier
   schließen sie; die Routen rufen ausschließlich diese Funktionen auf.
   ════════════════════════════════════════════════════════════════════════ */

import type { Permissions, Role } from "./store.ts";
import { emptyPermissions, fullPermissions } from "./store.ts";

export interface Handelnder {
  id: string;
  role: Role;
}
export interface Ziel {
  id: string;
  role: Role;
}

const istAdmin = (a: Handelnder) => a.role === "admin";
const istSelbst = (a: Handelnder, z: Ziel) => a.id === z.id;

/**
 * Grundsätzlicher Zugriff auf ein Konto.
 * Admin-Konten darf nur ein Admin anfassen — sonst könnte ein Redakteur
 * Vorgesetzte deaktivieren, umbenennen oder aussperren.
 */
export function darfKontoBearbeiten(actor: Handelnder, ziel: Ziel): boolean {
  return ziel.role !== "admin" || istAdmin(actor);
}

/** Die Admin-Rolle vergibt oder entzieht nur ein Admin — und nie sich selbst. */
export function darfRolleAendern(actor: Handelnder, ziel: Ziel): boolean {
  return istAdmin(actor) && !istSelbst(actor, ziel);
}

/** Aktiv/inaktiv schalten: nicht bei sich selbst (Selbst-Aussperren). */
export function darfAktivAendern(actor: Handelnder, ziel: Ziel): boolean {
  return darfKontoBearbeiten(actor, ziel) && !istSelbst(actor, ziel);
}

/**
 * Berechtigungen setzen: nur Admins, und niemals am eigenen Konto —
 * sonst wäre jede Einschränkung mit einem Klick aufhebbar.
 */
export function darfRechteSetzen(actor: Handelnder, ziel: Ziel): boolean {
  return istAdmin(actor) && !istSelbst(actor, ziel);
}

/**
 * Fremdes Passwort zurücksetzen: nur Admins.
 * Das EIGENE Passwort ändert man im Konto-Bereich, dort wird zusätzlich das
 * alte Passwort abgefragt.
 */
export function darfPasswortSetzen(actor: Handelnder, ziel: Ziel): boolean {
  return istAdmin(actor) && darfKontoBearbeiten(actor, ziel);
}

/** Konto löschen: nie sich selbst, Admin-Konten nur durch Admins. */
export function darfLoeschen(actor: Handelnder, ziel: Ziel): boolean {
  if (istSelbst(actor, ziel)) return false;
  return darfKontoBearbeiten(actor, ziel);
}

/**
 * Welche Rechte bekommt ein NEU angelegtes Konto?
 *
 * Admins erhalten immer alles. Rechte frei vergeben darf nur ein Admin —
 * andernfalls startet das Konto ohne Berechtigungen und ein Admin muss sie
 * bewusst freischalten.
 */
export function rechteBeimAnlegen(
  actor: Handelnder,
  neueRolle: Role,
  gewuenscht: Permissions | undefined
): Permissions {
  if (neueRolle === "admin") return fullPermissions();
  if (!istAdmin(actor) || !gewuenscht) return emptyPermissions();
  return gewuenscht;
}

/** Die Admin-Rolle vergibt nur ein Admin — sonst wird daraus "editor". */
export function rolleBeimAnlegen(actor: Handelnder, gewuenscht: unknown): Role {
  return gewuenscht === "admin" && istAdmin(actor) ? "admin" : "editor";
}
