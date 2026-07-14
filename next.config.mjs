/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Erzeugt einen schlanken, eigenständigen Server-Build für Docker.
  output: "standalone",
  // Sicherheits-Header für alle Antworten (Clickjacking, MIME-Sniffing, Referrer, Sensoren).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
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
