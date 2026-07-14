import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Placeholder from "@/components/Placeholder";
import BlogSubscribe from "@/components/BlogSubscribe";
import { ArrowIcon } from "@/components/icons";
import { formatDate, type Post } from "@/lib/blog";
import { brand } from "@/lib/data";
import { readPosts } from "@/lib/server/store";

export const metadata: Metadata = {
  title: `Blog — ${brand.name}`,
  description: "Einblicke, Tipps und Neuigkeiten rund um cloud-freie Technik, Energie sparen und Datenschutz im eigenen Zuhause.",
};

export const dynamic = "force-dynamic";

function readingMinutes(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 200));
}

export default function BlogPage() {
  // Alle Beiträge kommen aus dem Store (inkl. der eingespielten Beispiele).
  // Gelöschte Beiträge sind damit sofort weg — nichts wird mehr fest dazugemischt.
  const posts: Post[] = readPosts()
    .filter((p) => p.status === "published")
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      date: p.createdAt.slice(0, 10),
      category: p.tags?.[0] || "Journal",
      readingMinutes: readingMinutes(p.content),
      imageCaption: p.title,
      image: p.coverImage,
      body: [],
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const [lead, ...rest] = posts;

  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <span className="text-ink-soft">Blog</span>
        </nav>

        <div className="mt-8 max-w-2xl">
          <span className="eyebrow text-accent">Blog</span>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Wissen rund ums <span className="emph">smarte Zuhause.</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            Tipps und Hintergründe zu Energie sparen, Datenschutz und Technik, die im Haus bleibt.
          </p>
        </div>

        {/* Noch keine Beiträge — freundlicher Hinweis statt leerer Seite */}
        {posts.length === 0 && (
          <div className="mt-12 rounded-3xl border border-dashed border-line-strong bg-surface p-10 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-2xl">✍️</span>
            <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">Die ersten Beiträge sind in Arbeit</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-soft">
              Hier erscheinen bald Tipps und Hintergründe rund um Energie sparen, Datenschutz und Technik im eigenen Zuhause.
              Abonnieren Sie unten kostenlos — dann verpassen Sie den Start nicht.
            </p>
          </div>
        )}

        {/* Hervorgehobener Beitrag */}
        {lead && (
          <Link
            href={`/blog/${lead.slug}`}
            className="group mt-12 grid gap-6 overflow-hidden rounded-3xl border border-line bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_28px_60px_-28px_rgba(176,84,58,0.45)] lg:grid-cols-2"
          >
            <div className="relative min-h-[14rem] overflow-hidden">
              {lead.image ? (
                <Image src={lead.image} alt={lead.title} fill sizes="(max-width:1024px) 100vw, 600px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              ) : (
                <Placeholder caption={lead.imageCaption} ratio="h-full min-h-[14rem]" rounded="rounded-none" className="h-full border-0" />
              )}
            </div>
            <div className="flex flex-col justify-center p-7 sm:p-9">
              <span className="flex items-center gap-2 text-xs text-muted">
                <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent-ink">{lead.category}</span>
                {formatDate(lead.date)} · {lead.readingMinutes} Min.
              </span>
              <h2 className="mt-4 font-display text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{lead.title}</h2>
              <p className="mt-3 leading-relaxed text-ink-soft">{lead.excerpt}</p>
              <span className="mt-5 inline-flex items-center gap-2 font-medium text-accent">
                Weiterlesen <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </Link>
        )}

        {/* Weitere Beiträge */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_24px_50px_-26px_rgba(176,84,58,0.45)]"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                {p.image ? (
                  <Image src={p.image} alt={p.title} fill sizes="(max-width:768px) 100vw, 360px" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <Placeholder caption={p.imageCaption} ratio="aspect-[16/10]" rounded="rounded-none" className="border-0" />
                )}
              </div>
              <div className="flex flex-1 flex-col p-6">
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent-ink">{p.category}</span>
                  {p.readingMinutes} Min.
                </span>
                <h3 className="mt-3 font-display text-lg font-semibold leading-tight tracking-tight">{p.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-soft">{p.excerpt}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent">
                  Weiterlesen <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <BlogSubscribe />
      </div>
    </main>
  );
}
