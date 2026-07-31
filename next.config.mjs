/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Erzeugt einen schlanken, eigenständigen Server-Build für Docker.
  output: "standalone",

  /*
   * Was NICHT in den Standalone-Build gehört.
   *
   * Der Store liest seine Dateien über `path.join(DATA_DIR, name)` — also mit
   * einem erst zur Laufzeit bekannten Namen. Turbopack kann daraus nicht
   * ableiten, welche Dateien wirklich gebraucht werden, verfolgt deshalb
   * vorsichtshalber das ganze Projekt und warnt beim Build ("Encountered
   * unexpected file in NFT list").
   *
   * Gemessen landeten dadurch im Ergebnis: `data/` (295 KB — mit
   * Passwort-Hashes, Tickets, Chat-Sitzungen und Chat-Schlüsseln!), der
   * Referenzordner `erklärung-und-funktionen/` und ein verwaistes Test1.png.
   *
   * Im Docker-Build fällt das nicht auf, weil `.dockerignore` diese Pfade
   * schon aus dem Build-Kontext nimmt. Wer aber `.next/standalone` von Hand
   * auf einen Server kopiert, hätte die lokale Datenbank mitverteilt.
   * Deshalb hier zusätzlich und unabhängig von Docker ausgeschlossen.
   */
  outputFileTracingExcludes: {
    "*": [
      "./data/**",
      "./erklärung-und-funktionen/**",
      "./Test1.png",
      "./.git/**",
      // Testdateien und Skripte laufen nie im Server.
      "./**/*.test.mjs",
    ],
  },

  /*
   * Hier stehen bewusst KEINE Header.
   *
   * 1. Die Sicherheits-Header (inkl. Content-Security-Policy mit Nonce) setzt
   *    proxy.ts. Ein Nonce muss pro Antwort neu sein — `headers()` wird zur
   *    Build-Zeit ausgewertet und könnte nur einen konstanten, für alle
   *    Besucher identischen und damit wertlosen Nonce liefern. Zwei Quellen
   *    für denselben Header wären außerdem gefährlich: Am Ende gewinnt eine,
   *    ohne dass man es im Code sieht. Genau das passierte einmal mit der
   *    engen Policy für Uploads — sie kam nie beim Browser an.
   *
   * 2. Ein eigener `Cache-Control`-Header für /_next/static stand hier
   *    ebenfalls und war überflüssig: Nachgemessen setzt Next.js von sich aus
   *    `public, max-age=31536000, immutable` für diese Pfade. Der eigene
   *    Header war die einzige Ursache der Build- und Dev-Warnung "Setting a
   *    custom Cache-Control header can break Next.js development behavior" —
   *    im Dev-Modus hätte ein Jahr immutable-Cache Hot Reload veralteten Code
   *    ausliefern lassen.
   */
};

export default nextConfig;
