import type { Metadata } from "next";
import Link from "next/link";
import { readContent } from "@/lib/server/store";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  const c = readContent();
  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <article className="mx-auto max-w-3xl">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <span className="text-ink-soft">Impressum</span>
        </nav>
        <div className="mt-8 text-lg" dangerouslySetInnerHTML={{ __html: renderMarkdown(c.impressum) }} />
      </article>
    </main>
  );
}
