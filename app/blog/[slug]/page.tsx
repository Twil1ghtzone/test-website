import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import Placeholder from "@/components/Placeholder";
import { ArrowIcon } from "@/components/icons";
import { posts, getPost, formatDate } from "@/lib/blog";
import { brand } from "@/lib/data";
import { readPosts } from "@/lib/server/store";
import { renderMarkdown } from "@/lib/markdown";

export const dynamic = "force-dynamic";

function getDynamic(slug: string) {
  return readPosts().find((p) => p.slug === slug && p.status === "published");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  const dyn = post ? null : getDynamic(slug);
  const title = post?.title ?? dyn?.title;
  const excerpt = post?.excerpt ?? dyn?.excerpt;
  if (!title) return {};
  return { title: `${title} — ${brand.name}`, description: excerpt };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const staticPost = getPost(slug);

  // Im Admin geschriebener Beitrag? Dann Markdown rendern.
  if (!staticPost) {
    const dyn = getDynamic(slug);
    if (!dyn) notFound();
    const more = posts.slice(0, 2);
    return (
      <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
        <article className="mx-auto max-w-3xl">
          <nav className="flex items-center gap-2 text-sm text-muted">
            <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
            <span>/</span>
            <Link href="/blog" className="transition-colors hover:text-ink cursor-pointer">Blog</Link>
            <span>/</span>
            <span className="truncate text-ink-soft">{dyn.title}</span>
          </nav>
          <header className="mt-8">
            <span className="flex items-center gap-2 text-sm text-muted">
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">Journal</span>
              {formatDate(dyn.createdAt.slice(0, 10))} · {dyn.author}
            </span>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.12] tracking-tight text-balance sm:text-[2.6rem]">{dyn.title}</h1>
            {dyn.excerpt && <p className="mt-4 text-lg leading-relaxed text-ink-soft">{dyn.excerpt}</p>}
          </header>
          {dyn.coverImage && (
            <div className="mt-8 overflow-hidden rounded-3xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dyn.coverImage} alt={dyn.title} className="aspect-[16/9] w-full object-cover" />
            </div>
          )}
          <div className="mt-8 text-lg" dangerouslySetInnerHTML={{ __html: renderMarkdown(dyn.content) }} />
          <div className="mt-10 rounded-3xl border border-line bg-surface p-7 text-center">
            <h2 className="font-display text-xl font-semibold tracking-tight">Klingt interessant für Ihr Zuhause?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Wir beraten Sie unverbindlich — jedes Haus ist anders.</p>
            <Link href="/kontakt" className="group mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer">
              Kontakt aufnehmen <ArrowIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          {more.length > 0 && (
            <div className="mt-14">
              <span className="eyebrow text-accent">Weitere Beiträge</span>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {more.map((m) => (
                  <Link key={m.slug} href={`/blog/${m.slug}`} className="group rounded-2xl border border-line bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 cursor-pointer">
                    <span className="text-xs text-muted">{m.category}</span>
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

  const post = staticPost;
  const more = posts.filter((p) => p.slug !== post.slug).slice(0, 2);

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
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-ink">{post.category}</span>
            {formatDate(post.date)} · {post.readingMinutes} Min. Lesezeit
          </span>
          <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.12] tracking-tight text-balance sm:text-[2.6rem]">
            {post.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">{post.excerpt}</p>
        </header>

        <div className="mt-8 overflow-hidden rounded-3xl border border-line">
          {post.image ? (
            <div className="relative aspect-[16/9]">
              <Image src={post.image} alt={post.title} fill sizes="(max-width:768px) 100vw, 768px" className="object-cover" priority />
            </div>
          ) : (
            <Placeholder caption={post.imageCaption} ratio="aspect-[16/9]" rounded="rounded-none" className="border-0" />
          )}
        </div>

        <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-soft">
          {post.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-line bg-surface p-7 text-center">
          <h2 className="font-display text-xl font-semibold tracking-tight">Klingt interessant für Ihr Zuhause?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">Wir beraten Sie unverbindlich — jedes Haus ist anders.</p>
          <Link href="/kontakt" className="group mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 font-medium text-white transition-colors hover:bg-accent-ink cursor-pointer">
            Kontakt aufnehmen <ArrowIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        {more.length > 0 && (
          <div className="mt-14">
            <span className="eyebrow text-accent">Weitere Beiträge</span>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {more.map((m) => (
                <Link key={m.slug} href={`/blog/${m.slug}`} className="group rounded-2xl border border-line bg-surface p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:shadow-[0_22px_50px_-24px_rgba(176,84,58,0.4)] cursor-pointer">
                  <span className="text-xs text-muted">{m.category}</span>
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
