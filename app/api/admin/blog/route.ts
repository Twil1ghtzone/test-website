import { NextRequest, NextResponse } from "next/server";
import { readPosts, writePosts, type BlogPost } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || `post-${Date.now()}`;
}

function uniqueSlug(base: string, posts: BlogPost[], ignoreId?: string): string {
  let slug = base;
  let n = 2;
  while (posts.some((p) => p.slug === slug && p.id !== ignoreId)) slug = `${base}-${n++}`;
  return slug;
}

// Alle Beiträge (Admin – inkl. Entwürfe).
export async function GET() {
  if (!(await requirePermission("blog"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  return NextResponse.json({ posts: readPosts() });
}

// Neuen Beitrag anlegen.
export async function POST(req: NextRequest) {
  const me = await requirePermission("blog");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body || !body.title) return NextResponse.json({ error: "Titel erforderlich." }, { status: 400 });

  const posts = readPosts();
  const now = new Date().toISOString();
  const base = slugify(body.slug || body.title);
  const post: BlogPost = {
    id: `p-${Date.now()}`,
    slug: uniqueSlug(base, posts),
    title: String(body.title).slice(0, 200),
    excerpt: String(body.excerpt || "").slice(0, 400),
    content: String(body.content || ""),
    coverImage: body.coverImage ? String(body.coverImage) : undefined,
    status: body.status === "published" ? "published" : "draft",
    author: me.name,
    createdAt: now,
    updatedAt: now,
  };
  posts.unshift(post);
  writePosts(posts);
  return NextResponse.json({ post }, { status: 201 });
}

// Beitrag ändern.
export async function PATCH(req: NextRequest) {
  if (!(await requirePermission("blog"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });

  const posts = readPosts();
  const p = posts.find((x) => x.id === body.id);
  if (!p) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  if (typeof body.title === "string") p.title = body.title.slice(0, 200);
  if (typeof body.excerpt === "string") p.excerpt = body.excerpt.slice(0, 400);
  if (typeof body.content === "string") p.content = body.content;
  if (typeof body.coverImage === "string") p.coverImage = body.coverImage || undefined;
  if (body.status === "published" || body.status === "draft") p.status = body.status;
  if (typeof body.slug === "string" && body.slug.trim()) p.slug = uniqueSlug(slugify(body.slug), posts, p.id);
  p.updatedAt = new Date().toISOString();
  writePosts(posts);
  return NextResponse.json({ post: p });
}

// Beitrag löschen.
export async function DELETE(req: NextRequest) {
  if (!(await requirePermission("blog"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  writePosts(readPosts().filter((p) => p.id !== id));
  return NextResponse.json({ ok: true });
}
