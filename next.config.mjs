/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Erzeugt einen schlanken, eigenständigen Server-Build für Docker.
  output: "standalone",

  /*
   * Die Sicherheits-Header stehen NICHT mehr hier, sondern in proxy.ts.
   *
   * Grund: Die Content-Security-Policy enthält jetzt einen Nonce, der pro
   * Antwort neu erzeugt werden muss. `headers()` wird zur Build-Zeit
   * ausgewertet und kann nur konstante Werte liefern — ein Nonce von hier
   * wäre für alle Besucher identisch und damit vollkommen wertlos.
   *
   * Zwei Quellen für denselben Header wären außerdem gefährlich: Setzen
   * Konfiguration UND Proxy `Content-Security-Policy`, gewinnt am Ende
   * eine von beiden, ohne dass man es im Code sieht. Deshalb liegt die
   * Header-Hoheit vollständig beim Proxy.
   *
   * Hier bleiben nur Header für Pfade, die der Proxy bewusst
   * überspringt — dort gibt es kein Skript zu schützen.
   */
  async headers() {
    // Das Caching der gebauten Assets gilt NUR in Produktion. Im Dev-Modus
    // warnte Next.js zu Recht: "Setting a custom Cache-Control header can
    // break Next.js development behavior" — mit einem Jahr immutable-Cache
    // holt der Browser geänderte Chunks nicht mehr nach und Hot Reload
    // liefert veralteten Code aus.
    if (process.env.NODE_ENV !== "production") return [];

    return [
      {
        // Gebaute Assets tragen einen Hash im Namen und sind unveränderlich.
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      // Die enge Policy für ausgelieferte Uploads steht in proxy.ts, NICHT hier.
      // Ein hier gesetzter CSP-Header würde vom Proxy überschrieben werden —
      // beim ersten Versuch kam die Upload-Policy dadurch nie beim Browser an.
    ];
  },
};

export default nextConfig;
