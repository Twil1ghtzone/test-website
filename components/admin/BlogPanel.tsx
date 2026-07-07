"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, Trash2, Pencil, X, Loader2, Check, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Link2, ImagePlus, Quote, Code, Eye, ExternalLink, Strikethrough, Minus, SquareCode, Tag,
  Users, Send, Mail, MailCheck, Columns2,
} from "lucide-react";

type Post = {
  id: string; slug: string; title: string; excerpt: string; content: string;
  coverImage?: string; tags?: string[]; seoDescription?: string;
  status: "draft" | "published"; author: string; createdAt: string; updatedAt: string; notifiedAt?: string;
};
type Subscriber = { id: string; email: string; verified: boolean; createdAt: string };

export default function BlogPanel() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [edit, setEdit] = useState<Post | "new" | null>(null);
  const [err, setErr] = useState("");
  const [notifyBusy, setNotifyBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [showSubs, setShowSubs] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/blog", { cache: "no-store" });
    if (r.ok) setPosts((await r.json()).posts);
    const s = await fetch("/api/admin/blog/subscribers", { cache: "no-store" });
    if (s.ok) setSubs((await s.json()).subscribers);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function del(p: Post) {
    if (!confirm(`Beitrag „${p.title}" löschen?`)) return;
    const r = await fetch(`/api/admin/blog?id=${p.id}`, { method: "DELETE" });
    if (!r.ok) { setErr((await r.json()).error || "Fehler"); return; }
    setErr(""); load();
  }

  async function delSub(s: Subscriber) {
    if (!confirm(`Abonnent ${s.email} entfernen?`)) return;
    await fetch(`/api/admin/blog/subscribers?id=${s.id}`, { method: "DELETE" });
    load();
  }

  // Newsletter an alle bestätigten Abonnenten (wie novum notify).
  async function notify(p: Post) {
    if (!confirm(`„${p.title}" jetzt an alle bestätigten Abonnenten (${subs.filter((s) => s.verified).length}) senden?`)) return;
    setNotifyBusy(p.id); setMsg("");
    const r = await fetch("/api/admin/blog/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ postId: p.id }) });
    const d = await r.json().catch(() => ({}));
    setNotifyBusy("");
    setMsg(r.ok ? `Newsletter versendet ✓ (${d.sent} zugestellt${d.failed ? `, ${d.failed} fehlgeschlagen` : ""})` : d.error || "Versand fehlgeschlagen.");
    setTimeout(() => setMsg(""), 5000);
    if (r.ok) load();
  }

  const verified = subs.filter((s) => s.verified).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold tracking-tight">Blog</h2>
          <p className="text-sm text-muted">{posts.length} Beiträge · {verified} bestätigte Abonnenten</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowSubs((v) => !v)} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:border-ink cursor-pointer">
            <Users className="h-4 w-4" /> Abonnenten ({subs.length})
          </button>
          <button onClick={() => setEdit("new")} className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-ink cursor-pointer">
            <Plus className="h-4 w-4" /> Neuer Beitrag
          </button>
        </div>
      </div>
      {err && <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      {msg && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{msg}</p>}

      {showSubs && (
        <div className="rounded-3xl border border-line bg-surface p-5">
          <h3 className="eyebrow text-muted">Blog-Abonnenten (kostenlos)</h3>
          {subs.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Noch keine Abonnenten. Das Abo-Formular ist unten auf der Blog-Seite.</p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {subs.map((s) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-line bg-canvas px-3.5 py-2.5">
                  {s.verified ? <MailCheck className="h-4 w-4 shrink-0 text-emerald-600" /> : <Mail className="h-4 w-4 shrink-0 text-amber-500" />}
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">{s.email}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${s.verified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{s.verified ? "bestätigt" : "unbestätigt"}</span>
                  <span className="hidden text-xs text-muted sm:block">{new Date(s.createdAt).toLocaleDateString("de-DE")}</span>
                  <button onClick={() => delSub(s)} aria-label="Entfernen" className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {posts.length === 0 ? (
        <div className="rounded-3xl border border-line bg-surface p-10 text-center text-muted">Noch keine Beiträge. Schreiben Sie den ersten!</div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-line bg-surface">
          {posts.map((p, i) => (
            <div key={p.id} className={`flex items-center gap-4 p-4 ${i > 0 ? "border-t border-line" : ""}`}>
              {p.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.coverImage} alt="" className="h-12 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid h-12 w-16 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><Pencil className="h-4 w-4" /></span>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-ink">{p.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-surface-2 text-ink-soft"}`}>
                    {p.status === "published" ? "veröffentlicht" : "Entwurf"}
                  </span>
                  {p.notifiedAt && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">Newsletter ✓</span>}
                  {(p.tags || []).slice(0, 3).map((t) => <span key={t} className="rounded-full bg-canvas px-2 py-0.5 text-xs text-ink-soft">#{t}</span>)}
                </div>
                <div className="truncate text-sm text-muted">/{p.slug} · {new Date(p.updatedAt).toLocaleDateString("de-DE")}</div>
              </div>
              {p.status === "published" && (
                <>
                  <button onClick={() => notify(p)} disabled={notifyBusy === p.id} title="Newsletter an Abonnenten senden" className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-accent-ink disabled:opacity-50 cursor-pointer">
                    {notifyBusy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                  <a href={`/blog/${p.slug}`} target="_blank" rel="noreferrer" aria-label="Ansehen" className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink cursor-pointer"><ExternalLink className="h-4 w-4" /></a>
                </>
              )}
              <button onClick={() => setEdit(p)} aria-label="Bearbeiten" className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink cursor-pointer"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => del(p)} aria-label="Löschen" className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}

      {edit && <PostEditor post={edit === "new" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} />}
    </div>
  );
}

/* ── Ausführlicher Web-Editor: Vollbild, Side-by-Side-Vorschau, große Toolbar, Tags & SEO ── */
function PostEditor({ post, onClose, onSaved }: { post: Post | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !post;
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [coverImage, setCoverImage] = useState(post?.coverImage ?? "");
  const [tags, setTags] = useState((post?.tags || []).join(", "));
  const [seoDescription, setSeoDescription] = useState(post?.seoDescription ?? "");
  const [status, setStatus] = useState<"draft" | "published">(post?.status ?? "draft");
  const [split, setSplit] = useState(true); // Side-by-Side-Vorschau
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);
  const inlineInput = useRef<HTMLInputElement>(null);

  const words = content.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));

  function wrap(before: string, after = before, placeholder = "") {
    const el = ta.current;
    if (!el) return;
    const s = el.selectionStart, e = el.selectionEnd;
    const sel = content.slice(s, e) || placeholder;
    const next = content.slice(0, s) + before + sel + after + content.slice(e);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = s + before.length;
      el.selectionEnd = s + before.length + sel.length;
    });
  }
  function insertLine(text: string) {
    const el = ta.current;
    if (!el) { setContent((c) => c + "\n" + text); return; }
    const s = el.selectionStart;
    setContent(content.slice(0, s) + text + content.slice(s));
  }

  async function upload(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(d.error || "Upload fehlgeschlagen."); return null; }
    return d.url as string;
  }
  async function onCover(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true); setErr("");
    const url = await upload(f);
    setUploading(false);
    if (url) setCoverImage(url);
    e.target.value = "";
  }
  async function onInlineImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true); setErr("");
    const url = await upload(f);
    setUploading(false);
    if (url) insertLine(`\n![${f.name}](${url})\n`);
    e.target.value = "";
  }

  async function save(publish?: boolean) {
    if (!title.trim()) { setErr("Titel erforderlich."); return; }
    setBusy(true); setErr("");
    const finalStatus = publish === undefined ? status : (publish ? "published" : "draft");
    const payload = {
      title, slug, excerpt, content, coverImage, seoDescription,
      tags: tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
      status: finalStatus,
    };
    const r = isNew
      ? await fetch("/api/admin/blog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      : await fetch("/api/admin/blog", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: post!.id, ...payload }) });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setErr(d.error || "Speichern fehlgeschlagen."); return; }
    onSaved();
  }

  const field = "w-full rounded-xl border border-line bg-canvas px-4 py-3 text-ink outline-none focus:border-accent focus:bg-surface";
  const lbl = "mb-1.5 block eyebrow text-muted";
  const tool = "grid h-9 w-9 place-items-center rounded-lg text-ink-soft transition-colors hover:bg-canvas hover:text-accent-ink cursor-pointer";

  return (
    <div className="fixed inset-0 z-[120] bg-ink/55 p-2 backdrop-blur-sm sm:p-4">
      <div className="mx-auto flex h-full max-w-6xl flex-col rounded-3xl border border-line bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4 sm:p-5">
          <h3 className="font-display text-lg font-semibold tracking-tight sm:text-xl">{isNew ? "Neuer Beitrag" : "Beitrag bearbeiten"}</h3>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted sm:block">{words} Wörter · ~{minutes} Min. Lesezeit</span>
            <button onClick={() => setSplit((v) => !v)} title="Vorschau ein-/ausblenden" className={`hidden h-9 w-9 place-items-center rounded-lg lg:grid ${split ? "bg-accent-soft text-accent-ink" : "text-muted hover:bg-canvas"} cursor-pointer`}><Columns2 className="h-4 w-4" /></button>
            <button onClick={onClose} aria-label="Schließen" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-canvas hover:text-ink cursor-pointer"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2"><label className={lbl}>Titel</label><input value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="Überschrift des Beitrags" /></div>
            <div><label className={lbl}>URL-Kürzel (optional)</label><input value={slug} onChange={(e) => setSlug(e.target.value)} className={field} placeholder="wird aus Titel erzeugt" /></div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2"><label className={lbl}>Kurzbeschreibung (Teaser)</label><textarea rows={2} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={`${field} resize-none`} /></div>
            <div>
              <label className={lbl}>Titelbild</label>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => coverInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-canvas px-4 py-3 text-sm font-medium text-ink hover:border-accent cursor-pointer">
                  <ImagePlus className="h-4 w-4" /> {coverImage ? "Ändern" : "Hochladen"}
                </button>
                {coverImage && <button type="button" onClick={() => setCoverImage("")} className="text-sm text-muted hover:text-red-600 cursor-pointer">entfernen</button>}
                <input ref={coverInput} type="file" accept="image/*" onChange={onCover} className="hidden" />
              </div>
              {coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverImage} alt="" className="mt-2 h-16 w-full rounded-xl border border-line object-cover" />
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <label className={lbl}><Tag className="mr-1 inline h-3 w-3" />Tags (Komma-getrennt)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className={field} placeholder="smart-home, energie, server" />
            </div>
            <div>
              <label className={lbl}>SEO-Beschreibung ({seoDescription.length}/200)</label>
              <input value={seoDescription} onChange={(e) => setSeoDescription(e.target.value.slice(0, 200))} className={field} placeholder="Beschreibung für Suchmaschinen (meta description)" />
            </div>
          </div>

          {/* ── Editor + Live-Vorschau ── */}
          <div className="mt-5">
            <div className="mb-1.5 flex flex-wrap gap-1 rounded-xl border border-line bg-canvas p-1">
              <button type="button" title="Überschrift 1" onClick={() => insertLine("\n# Überschrift\n")} className={tool}><Heading1 className="h-4 w-4" /></button>
              <button type="button" title="Überschrift 2" onClick={() => insertLine("\n## Überschrift\n")} className={tool}><Heading2 className="h-4 w-4" /></button>
              <button type="button" title="Überschrift 3" onClick={() => insertLine("\n### Überschrift\n")} className={tool}><Heading3 className="h-4 w-4" /></button>
              <span className="mx-1 my-auto h-5 w-px bg-line" />
              <button type="button" title="Fett" onClick={() => wrap("**", "**", "fett")} className={tool}><Bold className="h-4 w-4" /></button>
              <button type="button" title="Kursiv" onClick={() => wrap("*", "*", "kursiv")} className={tool}><Italic className="h-4 w-4" /></button>
              <button type="button" title="Durchgestrichen" onClick={() => wrap("~~", "~~", "text")} className={tool}><Strikethrough className="h-4 w-4" /></button>
              <span className="mx-1 my-auto h-5 w-px bg-line" />
              <button type="button" title="Aufzählung" onClick={() => insertLine("\n- Punkt\n- Punkt\n")} className={tool}><List className="h-4 w-4" /></button>
              <button type="button" title="Nummerierte Liste" onClick={() => insertLine("\n1. Erstens\n2. Zweitens\n")} className={tool}><ListOrdered className="h-4 w-4" /></button>
              <button type="button" title="Zitat" onClick={() => insertLine("\n> Zitat\n")} className={tool}><Quote className="h-4 w-4" /></button>
              <button type="button" title="Trennlinie" onClick={() => insertLine("\n---\n")} className={tool}><Minus className="h-4 w-4" /></button>
              <span className="mx-1 my-auto h-5 w-px bg-line" />
              <button type="button" title="Inline-Code" onClick={() => wrap("`", "`", "code")} className={tool}><Code className="h-4 w-4" /></button>
              <button type="button" title="Code-Block" onClick={() => insertLine("\n```\ncode\n```\n")} className={tool}><SquareCode className="h-4 w-4" /></button>
              <button type="button" title="Link" onClick={() => wrap("[", "](https://)", "Linktext")} className={tool}><Link2 className="h-4 w-4" /></button>
              <button type="button" title="Bild einfügen" onClick={() => inlineInput.current?.click()} className={tool}><ImagePlus className="h-4 w-4" /></button>
              <input ref={inlineInput} type="file" accept="image/*" onChange={onInlineImage} className="hidden" />
              {uploading && <span className="ml-1 inline-flex items-center gap-1 px-2 text-xs text-muted"><Loader2 className="h-3.5 w-3.5 animate-spin" /> lädt…</span>}
            </div>

            <div className={`grid gap-3 ${split ? "lg:grid-cols-2" : ""}`}>
              <textarea
                ref={ta}
                rows={18}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`${field} min-h-[24rem] resize-y font-mono text-sm leading-relaxed`}
                placeholder="Schreiben Sie hier… **Markdown** wird unterstützt."
              />
              {split && (
                <div className="hidden min-h-[24rem] overflow-y-auto rounded-xl border border-line bg-canvas p-4 lg:block">
                  <p className="mb-2 flex items-center gap-1.5 eyebrow text-muted"><Eye className="h-3 w-3" /> Live-Vorschau</p>
                  <div dangerouslySetInnerHTML={{ __html: renderPreview(content) }} />
                </div>
              )}
            </div>
          </div>

          {err && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line p-4 sm:p-5">
          <label className="mr-auto inline-flex items-center gap-2 text-sm text-ink-soft">
            <input type="checkbox" checked={status === "published"} onChange={(e) => setStatus(e.target.checked ? "published" : "draft")} className="h-4 w-4 accent-[var(--color-accent)]" />
            veröffentlicht
          </label>
          <button type="button" disabled={busy} onClick={() => save(false)} className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:border-ink disabled:opacity-60 cursor-pointer">
            Als Entwurf speichern
          </button>
          <button type="button" disabled={busy} onClick={() => save(true)} className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-ink disabled:opacity-60 cursor-pointer">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Veröffentlichen
          </button>
        </div>
      </div>
    </div>
  );
}

// Client-Vorschau (nähert das Server-Rendering an).
function renderPreview(md: string): string {
  const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escape(md)
    .replace(/^### (.*)$/gm, '<h3 class="mt-4 font-display text-lg font-semibold">$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 class="mt-5 font-display text-xl font-semibold">$1</h2>')
    .replace(/^# (.*)$/gm, '<h1 class="mt-5 font-display text-2xl font-semibold">$1</h1>')
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, '<img src="$2" alt="$1" class="my-3 rounded-xl border border-line" />')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" class="text-accent underline">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/`([^`]+)`/g, '<code class="rounded bg-surface px-1">$1</code>')
    .replace(/^> (.*)$/gm, '<blockquote class="my-2 border-l-4 border-accent pl-3 italic text-ink-soft">$1</blockquote>')
    .replace(/^(-{3,})$/gm, '<hr class="my-4 border-line" />')
    .replace(/^\d+[.)] (.*)$/gm, '<li class="ml-5 list-decimal">$1</li>')
    .replace(/^[-*] (.*)$/gm, '<li class="ml-5 list-disc">$1</li>')
    .replace(/\n{2,}/g, "<br/><br/>");
}
