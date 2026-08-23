import { NextRequest, NextResponse } from "next/server";
import { readChat, writeChat, type ChatMessage } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Team-Chat: Nachrichten (optional nur die neuen seit ?after=<id>).
export async function GET(req: NextRequest) {
  if (!(await requirePermission("chat"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const after = new URL(req.url).searchParams.get("after");
  const all = readChat();
  if (after) {
    const idx = all.findIndex((m) => m.id === after);
    return NextResponse.json({ messages: idx === -1 ? all : all.slice(idx + 1) });
  }
  return NextResponse.json({ messages: all.slice(-200) });
}

export async function POST(req: NextRequest) {
  const me = await requirePermission("chat");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const text = String(body?.text || "").trim().slice(0, 2000);
  if (!text) return NextResponse.json({ error: "Leere Nachricht." }, { status: 400 });

  const m: ChatMessage = {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: me.id,
    userName: me.name,
    text,
    createdAt: new Date().toISOString(),
  };
  const all = readChat();
  all.push(m);
  writeChat(all.slice(-1000));
  return NextResponse.json({ message: m }, { status: 201 });
}

// Chatverlauf leeren.
export async function DELETE() {
  const me = await requirePermission("chat");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  if (me.role !== "admin") return NextResponse.json({ error: "Nur Admins dürfen den Verlauf leeren." }, { status: 403 });
  writeChat([]);
  return NextResponse.json({ ok: true });
}
