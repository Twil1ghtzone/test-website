/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Erzeugt einen schlanken, eigenständigen Server-Build für Docker.
  output: "standalone",
  // Sicherheits-Header für alle Antworten (Clickjacking, MIME-Sniffing, Referrer, Sensoren).
  async headers() {
    // Content-Security-Policy: zweite Verteidigungslinie gegen XSS.
    // 'unsafe-inline'/'unsafe-eval' bei script-src sind für Next.js nötig
    // (Hydration-Payload + Dev-HMR). In Produktion entfällt 'unsafe-eval'.
    // connect-src erlaubt bewusst KEINE fremden Hosts — die KI-Anfragen laufen
    // serverseitig über /api/chat, nie direkt aus dem Browser.
    const isDev = process.env.NODE_ENV !== "production";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self'${isDev ? " ws: http://localhost:*" : ""}`,
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
