import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requirePermission } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

// Bewusst OHNE SVG: SVG kann eingebettete Skripte enthalten (Stored XSS).
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Bild hochladen (nur mit Blog-Berechtigung). Speichert im Docker-Volume.
export async function POST(req: NextRequest) {
  if (!(await requirePermission("blog"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) return NextResponse.json({ error: "Keine Datei." }, { status: 400 });

  const ext = ALLOWED[file.type];
  if (!ext) return NextResponse.json({ error: "Nur PNG, JPG, WEBP oder GIF." }, { status: 415 });
  if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Datei zu groß (max. 8 MB)." }, { status: 413 });

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);

  return NextResponse.json({ url: `/api/uploads/${name}` }, { status: 201 });
}
