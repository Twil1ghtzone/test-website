"use client";

import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";

// Template wird bei jeder Navigation neu gemountet → sanfte „Öffnen"-Animation pro Seite.
// Startseite: NUR Opacity (kein Transform), damit position:sticky im Hero nicht bricht.
// Unterseiten: zusätzlich ein dezenter Slide-up.
export default function Template({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const pathname = usePathname();
  const isHome = pathname === "/";

  if (reduced) return <>{children}</>;

  return (
    <motion.div
      initial={isHome ? { opacity: 0 } : { opacity: 0, y: 18 }}
      animate={isHome ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
