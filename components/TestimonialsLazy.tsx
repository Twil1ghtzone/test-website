"use client";

import dynamic from "next/dynamic";

// Bewertungen client-only laden: die Sektion (framer-motion-Kartenstapel)
// kann so nie die Hydration der restlichen Startseite blockieren.
const Testimonials = dynamic(() => import("./Testimonials"), { ssr: false });

export default Testimonials;
