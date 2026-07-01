import { NextResponse } from "next/server";
import { readPosts } from "@/lib/server/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Öffentlich: nur veröffentlichte Beiträge, ohne Rohdaten der Entwürfe.
export async function GET() {
  const posts = readPosts()
    .filter((p) => p.status === "published")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return NextResponse.json({ posts });
}
