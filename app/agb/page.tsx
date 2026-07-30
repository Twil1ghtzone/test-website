import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { readContent } from "@/lib/server/store";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "AGB" };

export default function AgbPage() {
  const c = readContent();
  // Ohne gepflegten Inhalt gibt es keine AGB-Seite (statt einer leeren Seite).
  if (!c.agb.trim()) notFound();
  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <article className="mx-auto max-w-3xl">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <span className="text-ink-soft">AGB</span>
        </nav>
        <div className="mt-8 text-lg" dangerouslySetInnerHTML={{ __html: renderMarkdown(c.agb) }} />
      </article>
    </main>
  );
}
