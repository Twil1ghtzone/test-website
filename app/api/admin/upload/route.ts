import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { requirePermission } from "@/lib/server/auth";
import { pruefeUpload, anzeigeName, BILD_TYPEN } from "@/lib/server/upload";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
const MAX = 8 * 1024 * 1024;

// Bild hochladen (nur mit Blog-Berechtigung). Speichert im Docker-Volume.
//
// Geprüft wird der tatsächliche Dateiinhalt (Magic Bytes), nicht der vom
// Browser behauptete MIME-Typ und nicht die Dateiendung — beides ist
// fälschbar. SVG bleibt gesperrt (kann <script> enthalten → Stored XSS).
export async function POST(req: NextRequest) {
  if (!(await requirePermission("blog"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || !(file instanceof File)) return NextResponse.json({ error: "Keine Datei." }, { status: 400 });
  if (file.size > MAX) return NextResponse.json({ error: "Datei zu groß (max. 8 MB)." }, { status: 413 });

  const buf = Buffer.from(await file.arrayBuffer());
  const pruefung = pruefeUpload(buf, file.name, BILD_TYPEN, MAX);
  if (!pruefung.ok) {
    return NextResponse.json({ error: `„${anzeigeName(file.name)}": ${pruefung.fehler}` }, { status: pruefung.status ?? 415 });
  }

  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, pruefung.dateiname!), buf);

  return NextResponse.json({ url: `/api/uploads/${pruefung.dateiname!}` }, { status: 201 });
}
