/* ════════════════════════════════════════════════════════════════════════
   RATE-LIMITING — EINE SCHNITTSTELLE, AUSTAUSCHBARE SPEICHER

   Pro Schlüssel (z. B. "chat:<ip>") maximal `max` Treffer je `windowMs`.
   Schutzziel ist eine Missbrauchs-Bremse (LLM-Kosten, Spam), keine exakte
   Abrechnung.

   ── Warum die API asynchron ist, obwohl der Standardspeicher es nicht wäre ──
   Der In-Memory-Speicher unten könnte synchron antworten. Genau das war die
   frühere Fassung — und genau das machte einen späteren Wechsel auf Redis/
   Upstash unmöglich, ohne JEDE Aufrufstelle in den Routen anzufassen: Ein
   Netzwerkspeicher kann nun einmal nur ein Promise liefern.
   Die Naht liegt deshalb von Anfang an richtig. Die Kosten dafür sind ein
   `await` pro Aufruf; der Nutzen ist, dass ein Umstieg nur noch das Setzen
   eines anderen Speichers in DIESER Datei bedeutet.

   ── Grenze des Standardspeichers ──
   In-Memory zählt PRO PROZESS. Sobald mehrere Instanzen/Worker laufen, teilt
   sich das Limit entsprechend auf (drei Instanzen = faktisch dreifaches
   Limit). Für das aktuelle Einzelprozess-Deployment ist das korrekt; für
   mehrere Instanzen ist `setRateLimitStore()` der vorgesehene Weg.

   ── WICHTIG FÜRS DEPLOYMENT ──
   Die Schlüssel enthalten die Client-IP aus dem Header `X-Forwarded-For`.
   Dieser Header ist frei setzbar — wer ihn bei jeder Anfrage ändert, umgeht
   jedes Limit. Der Reverse-Proxy MUSS ihn überschreiben statt anzuhängen:
     nginx : proxy_set_header X-Forwarded-For $remote_addr;
     Caddy : setzt es standardmäßig korrekt
   Ohne vorgeschalteten Proxy sind alle Limits dieser Datei wirkungslos.
   ════════════════════════════════════════════════════════════════════════ */

export interface RateLimitErgebnis {
  /** true = Anfrage darf durch. */
  ok: boolean;
  /** Sekunden bis zum Zurücksetzen des Fensters — für den `Retry-After`-Header. */
  retryAfterSec: number;
}

export interface RateLimitStore {
  /**
   * Zählt einen Treffer für `key` und meldet, ob das Limit eingehalten ist.
   * Implementierungen müssen selbst aufräumen (abgelaufene Schlüssel).
   */
  hit(key: string, max: number, windowMs: number): Promise<RateLimitErgebnis>;
}

/** Standardspeicher: eine Map im Prozessspeicher. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor() {
    // Gelegentliches Aufräumen, damit die Map nicht unbegrenzt wächst.
    // `unref()` verhindert, dass dieser Timer den Node-Prozess am Beenden
    // hindert (sonst würden u. a. die Testläufe nie zurückkehren).
    setInterval(() => this.aufraeumen(), 10 * 60 * 1000).unref?.();
  }

  private aufraeumen(): void {
    const now = Date.now();
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }

  async hit(key: string, max: number, windowMs: number): Promise<RateLimitErgebnis> {
    const now = Date.now();
    const rec = this.hits.get(key);
    if (!rec || rec.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + windowMs });
      return { ok: true, retryAfterSec: 0 };
    }
    rec.count++;
    if (rec.count > max) {
      return { ok: false, retryAfterSec: Math.ceil((rec.resetAt - now) / 1000) };
    }
    return { ok: true, retryAfterSec: 0 };
  }
}

let store: RateLimitStore = new MemoryRateLimitStore();

/**
 * Speicher austauschen — der einzige Eingriff, den ein Wechsel auf
 * Redis/Upstash braucht. Beispiel für später:
 *
 *   setRateLimitStore({
 *     async hit(key, max, windowMs) {
 *       const count = await redis.incr(key);
 *       if (count === 1) await redis.pexpire(key, windowMs);
 *       const ttl = await redis.pttl(key);
 *       return { ok: count <= max, retryAfterSec: Math.ceil(ttl / 1000) };
 *     },
 *   });
 *
 * Kein Aufruf in den Routen ändert sich dadurch.
 */
export function setRateLimitStore(neu: RateLimitStore): void {
  store = neu;
}

/** Zählt einen Treffer gegen das Limit. */
export function rateLimit(key: string, max: number, windowMs: number): Promise<RateLimitErgebnis> {
  return store.hit(key, max, windowMs);
}
