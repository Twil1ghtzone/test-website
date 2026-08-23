import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowIcon } from "@/components/icons";
import { MotionLink, pressable } from "@/components/ui/motion";
import { formatDate } from "@/lib/blog";
import { brand } from "@/lib/data";
import { readPosts, type BlogPost } from "@/lib/server/store";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

function published(): BlogPost[] {
  return readPosts().filter((p) => p.status === "published");
}
function getPost(slug: string): BlogPost | undefined {
  return published().find((p) => p.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return { title: `${post.title} — ${brand.name}`, description: post.seoDescription || post.excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const more = published().filter((p) => p.slug !== post.slug).slice(0, 2);

  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <article className="mx-auto max-w-3xl">
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <Link href="/blog" className="transition-colors hover:text-ink cursor-pointer">Blog</Link>
          <span>/</span>
          <span className="truncate text-ink-soft">{post.title}</span>
        </nav>

        <header className="mt-8">
          <span className="flex items-center gap-2 text-sm text-muted">
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">{post.tags?.[0] || "Journal"}</span>
            {formatDate(post.createdAt.slice(0, 10))} · {post.author}
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.12] tracking-tight text-balance sm:text-[2.6rem]">{post.title}</h1>
          {post.excerpt && <p className="mt-4 text-lg leading-relaxed text-ink-soft">{post.excerpt}</p>}
        </header>

        {post.coverImage && (
          /*
           * Das Titelbild ist auf einer Blogseite fast immer das größte
           * Element und damit der Largest Contentful Paint. Über `next/image`
           * statt `<img>`: automatische WebP/AVIF-Auslieferung, passende
           * Größe je Bildschirm statt immer das Original, und `priority`,
           * weil es oberhalb des ersten Bildschirmrands steht (Lazy Loading
           * wäre hier kontraproduktiv — es würde den LCP verzögern).
           *
           * `sizes` ist Pflicht bei `fill`: Ohne die Angabe lädt der Browser
           * vorsichtshalber die größte Variante. Der Artikel ist auf
           * `max-w-3xl` (768 px) begrenzt, darunter volle Breite.
           */
          <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-3xl border border-line">
            <Image
              src={post.coverImage}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        )}

        <div className="mt-8 text-lg" dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }} />

        <div className="mt-10 rounded-3xl border border-line bg-surface p-7 text-center">
          <h2 className="font-display text-xl font-semibold tracking-tight">Klingt interessant für Ihr Zuhause?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Wir beraten Sie unverbindlich — jedes Haus ist anders.</p>
          <MotionLink href="/kontakt" {...pressable} className="group mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-pointer">
            Kontakt aufnehmen <ArrowIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </MotionLink>
        </div>

        {more.length > 0 && (
          <div className="mt-14">
            <span className="eyebrow text-accent">Weitere Beiträge</span>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {more.map((m) => (
                <Link key={m.slug} href={`/blog/${m.slug}`} className="group rounded-2xl border border-line bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_22px_50px_-24px_rgba(176,84,58,0.4)] cursor-pointer">
                  <span className="text-xs text-muted">{m.tags?.[0] || "Journal"}</span>
                  <h3 className="mt-1 font-display text-lg font-semibold leading-tight tracking-tight">{m.title}</h3>
                  <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent">Lesen <ArrowIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </main>
  );
}
