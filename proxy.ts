import { NextRequest, NextResponse } from "next/server";

/* ════════════════════════════════════════════════════════════════════════
   CONTENT-SECURITY-POLICY MIT NONCE (proxy.ts)

   Warum die CSP hier liegt und nicht mehr in next.config.mjs:
   Ein Nonce muss pro Antwort neu und unvorhersagbar sein. `headers()` in der
   Konfiguration ist statisch — dort kann nur ein fester String stehen. Die
   Proxy-Funktion läuft dagegen bei jeder Anfrage.

   Dateiname: Next.js 16 hat `middleware.ts` abgekündigt — die Konvention
   heißt jetzt `proxy.ts` mit einem Default-Export.

   Der Ablauf, damit Next.js mitspielt:
   1. Nonce erzeugen (128 Bit aus der Web-Crypto-API des Edge-Runtimes).
   2. CSP in die REQUEST-Header schreiben. Next.js liest sie dort aus, holt
      sich den Nonce heraus und hängt ihn an seine eigenen <script>-Tags —
      inklusive des Bootstrap-Skripts, das die Seite hydratisiert.
   3. Dieselbe CSP zusätzlich in die RESPONSE-Header, damit der Browser sie
      auch durchsetzt.

   WICHTIG — die Nonce-Falle bei statischen Seiten:
   Eine zur Build-Zeit vorgerenderte HTML-Datei kann keinen Nonce enthalten,
   der zur Antwort von morgen passt. Damit der Nonce überhaupt greifen kann,
   müssen die betroffenen Seiten dynamisch gerendert werden. Das erledigt
   `app/layout.tsx` über `export const dynamic = "force-dynamic"`.
   Ohne diesen Schritt würde der Browser den Bootstrap-Code blockieren und
   die Seite käme nie in den interaktiven Zustand.
   ════════════════════════════════════════════════════════════════════════ */

/** 128 Bit Zufall, base64 — pro Antwort neu. */
function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function buildCsp(nonce: string, isDev: boolean, isHttps: boolean): string {
  return [
    "default-src 'self'",

    // ── Skripte ──
    // Der Nonce ersetzt 'unsafe-inline' vollständig: injizierte Inline-Skripte
    // haben keinen gültigen Nonce und laufen nicht. 'strict-dynamic' erlaubt
    // Next.js, weitere Chunks per createElement('script') nachzuladen, ohne
    // dass wir jeden Pfad einzeln freigeben müssen — moderne Browser ignorieren
    // dann Host-Allowlists, was Umgehungen über offene Redirects ausschließt.
    // In der Entwicklung braucht der Fast-Refresh-Client 'unsafe-eval'.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,

    // ── Stilangaben ──
    // Hier bleibt 'unsafe-inline' bewusst stehen, und zwar aus einem
    // technischen Grund, nicht aus Bequemlichkeit: Nonces gelten nur für
    // <style>-ELEMENTE, nicht für style-ATTRIBUTE. Framer Motion, die
    // Regler-Füllung (--p), die Balkenhöhen im Diagramm und alle
    // Fortschrittsanzeigen schreiben laufend style="…". Ein reines
    // "style-src 'self' 'nonce-x'" würde jede Animation der Seite abschalten.
    // Deshalb präzise getrennt: Stylesheets nur von uns, Attribute erlaubt.
    // Inline-Stile können in modernen Browsern kein JavaScript ausführen —
    // das Risiko ist um Größenordnungen kleiner als bei Skripten.
    "style-src 'self' 'unsafe-inline'",
    "style-src-elem 'self' 'unsafe-inline'",
    "style-src-attr 'unsafe-inline'",

    "img-src 'self' data: blob:",
    "font-src 'self' data:",

    // Keine fremden Hosts: KI-Anfragen laufen serverseitig über /api/chat,
    // nie direkt aus dem Browser.
    `connect-src 'self'${isDev ? " ws: wss: http://localhost:*" : ""}`,

    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",

    // Nur sinnvoll, wenn wirklich über HTTPS ausgeliefert wird. Auf einer
    // HTTP-Installation (lokal, Docker ohne Reverse-Proxy) würde die Direktive
    // Unterressourcen auf https umbiegen und damit ins Leere laufen.
    ...(isHttps ? ["upgrade-insecure-requests"] : []),
  ].join("; ");
}

/**
 * Hochgeladene Dateien bekommen eine eigene, radikal engere Policy.
 *
 * Diese Unterscheidung MUSS hier passieren und nicht in next.config.mjs:
 * Der Proxy setzt den Header bei jeder Antwort und würde eine dort
 * definierte Policy einfach überschreiben. Genau das war beim ersten
 * Versuch der Fall — die Upload-Policy kam nie an.
 */
const UPLOAD_CSP = "default-src 'none'; img-src 'self'; style-src 'none'; sandbox";

export default function proxy(req: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const isHttps =
    (req.headers.get("x-forwarded-proto") || "").split(",")[0].trim() === "https" ||
    req.nextUrl.protocol === "https:";

  // Ausgelieferte Uploads: keine Skripte, kein Styling, nichts. Nur Bilder.
  if (req.nextUrl.pathname.startsWith("/api/uploads/")) {
    const res = NextResponse.next();
    res.headers.set("Content-Security-Policy", UPLOAD_CSP);
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Content-Disposition", "inline");
    res.headers.set("Cross-Origin-Resource-Policy", "same-origin");
    return res;
  }

  const nonce = makeNonce();
  const csp = buildCsp(nonce, isDev, isHttps);

  // Schritt 2: CSP in die Request-Header, damit Next.js den Nonce übernimmt.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("content-security-policy", csp);
  // Zusätzlich einzeln, damit eigener Server-Code den Nonce lesen kann
  // (z. B. für ein <style nonce> in einer Server-Komponente).
  requestHeaders.set("x-nonce", nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  // Schritt 3: CSP in die Antwort, damit der Browser sie durchsetzt.
  res.headers.set("Content-Security-Policy", csp);

  // Die übrigen Härtungs-Header wandern mit hierher, damit alle
  // Sicherheits-Header an einer Stelle stehen.
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups"); // Druckfenster braucht den Zugriff
  res.headers.set("X-DNS-Prefetch-Control", "off");
  if (isHttps) {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }

  return res;
}

export const config = {
  /**
   * Statische Dateien und Bilder brauchen weder Nonce noch CSP — sie durch den
   * Proxy zu schleifen kostet nur Zeit bei jeder Anfrage.
   *
   * `missing` schließt Prefetch-Anfragen von <Link> aus: Next.js holt sich dort
   * nur die RSC-Nutzlast, ein Nonce wäre wirkungslos und würde bei jedem
   * Hover eine neue Antwort erzeugen.
   */
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
