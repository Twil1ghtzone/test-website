// Blog-Anzeige-Helfer. Beiträge selbst kommen aus dem Admin-Store
// (lib/server/store.ts, blog.json) — keine vorgefertigten Beiträge im Code.
export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // YYYY-MM-DD
  category: string;
  readingMinutes: number;
  imageCaption: string;
  image?: string; // optionales echtes Bild (/public)
  body: string[]; // Absätze
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}
