import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings, type Settings } from "@/lib/server/store";
import { requirePermission, verifyPassword } from "@/lib/server/auth";
import { readUsers } from "@/lib/server/store";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Liefert Einstellungen — API-Key wird NICHT zurückgegeben (nur ob gesetzt).
export async function GET() {
  if (!(await requirePermission("settings"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const s = readSettings();
  const { apiKey, ...aiSafe } = s.ai;
  const { pass, ...smtpSafe } = s.smtp;
  return NextResponse.json({ settings: { ...s, ai: { ...aiSafe, apiKeySet: !!apiKey }, smtp: { ...smtpSafe, passSet: !!pass } } });
}

export async function POST(req: NextRequest) {
  const me = await requirePermission("settings");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });

  const cur = readSettings();
  const ai = body.ai || {};
  const rv = body.reviews || {};
  const sm = body.smtp || {};

  // Sicherheitsstufe: Änderung des KI-Endpunkts nur mit Admin-Passwort.
  const newEndpoint = typeof ai.endpoint === "string" ? ai.endpoint.trim() : cur.ai.endpoint;
  if (newEndpoint !== cur.ai.endpoint) {
    const full = readUsers().find((u) => u.id === me.id);
    const pw = String(body.adminPassword || "");
    if (!full || !pw || !(await verifyPassword(pw, full.passwordHash))) {
      return NextResponse.json({ error: "Endpunkt-Änderung erfordert Ihr Admin-Passwort.", needPassword: true }, { status: 403 });
    }
  }
  const next: Settings = {
    siteName: typeof body.siteName === "string" ? body.siteName : cur.siteName,
    ai: {
      enabled: typeof ai.enabled === "boolean" ? ai.enabled : cur.ai.enabled,
      endpoint: typeof ai.endpoint === "string" ? ai.endpoint.trim() : cur.ai.endpoint,
      // Key: leerer String = aktiv entfernen, undefined = unverändert, sonst neuer Key.
      apiKey: typeof ai.apiKey === "string" ? ai.apiKey : cur.ai.apiKey,
      apiKeyEnabled: typeof ai.apiKeyEnabled === "boolean" ? ai.apiKeyEnabled : cur.ai.apiKeyEnabled,
      requireApiKey: typeof ai.requireApiKey === "boolean" ? ai.requireApiKey : cur.ai.requireApiKey,
      model: typeof ai.model === "string" ? ai.model.trim() : cur.ai.model,
      systemPrompt: typeof ai.systemPrompt === "string" ? ai.systemPrompt : cur.ai.systemPrompt,
      temperature: typeof ai.temperature === "number" ? Math.max(0, Math.min(2, ai.temperature)) : cur.ai.temperature,
      maxTokens: typeof ai.maxTokens === "number" ? Math.max(50, Math.min(4000, Math.round(ai.maxTokens))) : cur.ai.maxTokens,
      greeting: typeof ai.greeting === "string" ? ai.greeting : cur.ai.greeting,
      fallback: typeof ai.fallback === "string" ? ai.fallback : cur.ai.fallback,
    },
    reviews: {
      enabled: typeof rv.enabled === "boolean" ? rv.enabled : cur.reviews.enabled,
      autoApprove: typeof rv.autoApprove === "boolean" ? rv.autoApprove : cur.reviews.autoApprove,
      maxPerDay: typeof rv.maxPerDay === "number" ? Math.max(1, Math.min(20, Math.round(rv.maxPerDay))) : cur.reviews.maxPerDay,
    },
    smtp: {
      host: typeof sm.host === "string" ? sm.host.trim() : cur.smtp.host,
      port: typeof sm.port === "number" ? Math.max(1, Math.min(65535, Math.round(sm.port))) : cur.smtp.port,
      user: typeof sm.user === "string" ? sm.user.trim() : cur.smtp.user,
      pass: typeof sm.pass === "string" && sm.pass.length > 0 ? sm.pass : cur.smtp.pass,
      from: typeof sm.from === "string" ? sm.from.trim() : cur.smtp.from,
    },
  };

  // Key-Pflicht aktiv, aber kein (aktiver) Key vorhanden → ablehnen statt kaputt speichern.
  if (next.ai.enabled && next.ai.requireApiKey && (!next.ai.apiKey || !next.ai.apiKeyEnabled)) {
    return NextResponse.json({ error: "API-Key-Pflicht ist aktiv, aber kein aktiver Key gesetzt." }, { status: 400 });
  }

  writeSettings(next);
  logAudit(me.name, "Einstellungen gespeichert", `KI ${next.ai.enabled ? "an" : "aus"} · Key-Pflicht ${next.ai.requireApiKey ? "an" : "aus"} · Bewertungen ${next.reviews.enabled ? "an" : "aus"}`);
  return NextResponse.json({ ok: true });
}
