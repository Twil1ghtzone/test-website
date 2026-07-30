import type { Metadata } from "next";
import Link from "next/link";
import SupportTickets from "@/components/SupportTickets";
import { brand } from "@/lib/data";

export const metadata: Metadata = {
  title: `Support — ${brand.name}`,
  description: "Support-Ticket erstellen und den Status jederzeit einsehen — mit Ticketnummer, ganz ohne Konto.",
};

export default function SupportPage() {
  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <div className="mx-auto max-w-2xl">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <span className="text-ink-soft">Support</span>
        </nav>

        <div className="mt-8 mb-8 max-w-xl">
          <span className="eyebrow text-accent">Hilfe & Support</span>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Wir sind für Sie <span className="emph">da.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            Erstellen Sie ein Ticket — Sie bekommen eine Ticketnummer und können den Verlauf jederzeit
            auf diesem Gerät wieder öffnen. Ganz ohne Konto.
          </p>
        </div>

        <SupportTickets />
      </div>
    </main>
  );
}
