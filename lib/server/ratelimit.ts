// Leichter In-Memory-Rate-Limiter für öffentliche Endpunkte.
// Pro Schlüssel (z. B. "chat:<ip>") maximal `max` Treffer je `windowMs`.
// In-Memory reicht hier: Einzelprozess-Deployment, Schutzziel ist Missbrauchs-
// Bremse (LLM-Kosten, Spam), keine exakte Abrechnung.
//
// WICHTIG FÜRS DEPLOYMENT: Die Schlüssel enthalten die Client-IP aus dem
// Header `X-Forwarded-For`. Dieser Header ist frei setzbar — wer ihn bei
// jeder Anfrage ändert, umgeht jedes Limit. Der Reverse-Proxy (nginx,
// Caddy, Traefik) MUSS ihn deshalb überschreiben statt anzuhängen:
//   nginx : proxy_set_header X-Forwarded-For $remote_addr;
//   Caddy : setzt es standardmäßig korrekt
// Ohne vorgeschalteten Proxy sind alle Limits dieser Datei wirkungslos.

const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const rec = hits.get(key);
  if (!rec || rec.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  rec.count++;
  if (rec.count > max) {
    return { ok: false, retryAfterSec: Math.ceil((rec.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

// Gelegentliches Aufräumen, damit die Map nicht unbegrenzt wächst.
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
}, 10 * 60 * 1000).unref?.();
