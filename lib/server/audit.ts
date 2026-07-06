import { readAudit, writeAudit } from "./store";

// Aktivitätslog: jede Admin-Aktion wird protokolliert (max. 2000 Einträge).
export function logAudit(actor: string, action: string, detail = ""): void {
  try {
    const log = readAudit();
    log.unshift({
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      actor,
      action,
      detail: detail.slice(0, 300),
      createdAt: new Date().toISOString(),
    });
    writeAudit(log.slice(0, 2000));
  } catch {
    // Logging darf nie eine Aktion blockieren.
  }
}
