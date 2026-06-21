"use client";

import { usePathname } from "next/navigation";

// Blendet die öffentliche Seiten-Hülle (Nav, Footer, Support) im Admin-Bereich aus.
export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;
  return <>{children}</>;
}
