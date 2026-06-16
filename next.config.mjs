/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Erzeugt einen schlanken, eigenständigen Server-Build für Docker.
  output: "standalone",
};

export default nextConfig;
