// Minimaler, abhängigkeitsfreier Markdown→HTML-Renderer.
// Inhalte stammen aus dem geschützten Admin-Bereich; HTML wird zuerst escaped,
// danach werden nur bekannte Markdown-Muster in Tags umgewandelt.

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  let t = esc(s);
  // Bilder ![alt](url)
  t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_m, alt, url) => `<img src="${url}" alt="${alt}" class="my-4 rounded-2xl border border-line" />`);
  // Links [text](url)
  t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, txt, url) => `<a href="${url}" class="text-accent underline underline-offset-2 hover:text-accent-ink">${txt}</a>`);
  // Fett **x**
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Kursiv *x*
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  // Inline-Code `x`
  t = t.replace(/`([^`]+)`/g, '<code class="rounded bg-canvas px-1.5 py-0.5 text-[0.9em]">$1</code>');
  return t;
}

export function renderMarkdown(md: string): string {
  const lines = (md || "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;
  let inList = false;
  const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };

  while (i < lines.length) {
    const line = lines[i];

    if (/^```/.test(line)) {
      closeList();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(`<pre class="my-4 overflow-x-auto rounded-2xl border border-line bg-canvas p-4 text-sm"><code>${esc(buf.join("\n"))}</code></pre>`);
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const lvl = h[1].length;
      const sizes = ["", "text-3xl", "text-2xl", "text-xl", "text-lg"];
      out.push(`<h${lvl} class="mt-8 mb-3 font-display font-semibold tracking-tight ${sizes[lvl]}">${inline(h[2])}</h${lvl}>`);
      i++; continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inList) { out.push('<ul class="my-3 list-disc space-y-1 pl-6">'); inList = true; }
      out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      i++; continue;
    }
    if (/^>\s?/.test(line)) {
      closeList();
      out.push(`<blockquote class="my-4 border-l-4 border-accent pl-4 italic text-ink-soft">${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
      i++; continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      closeList();
      out.push('<hr class="my-8 border-line" />');
      i++; continue;
    }
    if (line.trim() === "") {
      closeList();
      i++; continue;
    }
    closeList();
    out.push(`<p class="my-3 leading-relaxed text-ink-soft">${inline(line)}</p>`);
    i++;
  }
  closeList();
  return out.join("\n");
}
