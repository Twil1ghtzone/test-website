"use client";

import { useMemo, useState } from "react";
import { Search, X, ChevronDown, Inbox } from "lucide-react";
import { normalisieren, filterFaq, type FaqGruppe } from "@/lib/faq";

/*
 * Suche über die häufigen Fragen.
 *
 * Bewusst ohne Suchbibliothek: Bei rund 15 Fragen wäre ein Index Overkill.
 * Gesucht wird über Frage UND Antwort, damit auch Begriffe treffen, die nur
 * im Fließtext stehen ("Miete", "Cloud", "Förderung") — genau danach sucht
 * man ja. Diakritika werden normalisiert, damit "warmepumpe" auch
 * "Wärmepumpe" findet; das erspart dem Nutzer die Umlaut-Tipperei.
 *
 * Treffer werden aufgeklappt und im Text hervorgehoben, sonst müsste man
 * nach der Suche noch jede Karte einzeln öffnen.
 */

/** Text mit hervorgehobenen Fundstellen — arbeitet auf dem Originaltext. */
function Hervorgehoben({ text, suche }: { text: string; suche: string }) {
  if (!suche.trim()) return <>{text}</>;

  const normText = normalisieren(text);
  const normSuche = normalisieren(suche.trim());
  const teile: React.ReactNode[] = [];
  let pos = 0;

  // Die normalisierte Fassung ist zeichenweise deckungsgleich mit dem
  // Original (nur Ersetzungen 1:1, kein Kürzen) — Indizes passen daher.
  for (;;) {
    const treffer = normText.indexOf(normSuche, pos);
    if (treffer === -1 || !normSuche) break;
    if (treffer > pos) teile.push(text.slice(pos, treffer));
    teile.push(
      <mark key={treffer} className="rounded bg-accent-soft px-0.5 text-accent-ink">
        {text.slice(treffer, treffer + normSuche.length)}
      </mark>
    );
    pos = treffer + normSuche.length;
  }
  teile.push(text.slice(pos));
  return <>{teile}</>;
}

export default function FaqSuche({ gruppen }: { gruppen: FaqGruppe[] }) {
  const [suche, setSuche] = useState("");
  const aktiv = suche.trim().length > 0;

  const gefiltert = useMemo(() => filterFaq(gruppen, suche), [gruppen, suche]);

  const treffer = gefiltert.reduce((s, g) => s + g.fragen.length, 0);
  const gesamt = gruppen.reduce((s, g) => s + g.fragen.length, 0);

  return (
    <div>
      {/* Suchfeld */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder={`${gesamt} Fragen durchsuchen — z. B. „Kosten“, „Internetausfall“, „Miete“`}
          aria-label="Häufige Fragen durchsuchen"
          className="h-14 w-full rounded-2xl border border-line bg-surface pl-12 pr-12 text-ink placeholder:text-muted outline-none transition-colors focus:border-accent focus:bg-canvas [&::-webkit-search-cancel-button]:hidden"
        />
        {aktiv && (
          <button
            type="button"
            onClick={() => setSuche("")}
            aria-label="Suche zurücksetzen"
            className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {aktiv && (
        <p aria-live="polite" className="mt-3 text-sm text-muted">
          {treffer === 0
            ? "Keine Treffer"
            : `${treffer} von ${gesamt} Fragen ${treffer === 1 ? "passt" : "passen"}`}
        </p>
      )}

      {/* Ergebnisse */}
      <div className="mt-8 space-y-10">
        {gefiltert.map((g) => (
          <section key={g.key}>
            <h2 className="font-display text-xl font-semibold tracking-tight">{g.titel}</h2>
            <div className="mt-4 space-y-2.5">
              {g.fragen.map((f) => (
                <details
                  // `key` enthält den Suchbegriff: Ändert sich die Suche, baut
                  // React das Element neu auf — nur so greift das `open` unten
                  // auch bei einer bereits gerenderten Frage.
                  key={`${f.frage}-${aktiv}`}
                  open={aktiv}
                  className="group rounded-2xl border border-line bg-surface px-5 transition-all duration-300 hover:border-line-strong hover:shadow-[0_14px_36px_-26px_rgba(33,28,23,0.35)]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-left">
                    <span className="font-medium leading-snug text-ink transition-colors group-open:text-accent-ink">
                      <Hervorgehoben text={f.frage} suche={suche} />
                    </span>
                    <ChevronDown className="h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <p className="pb-4 pr-9 leading-relaxed text-ink-soft">
                    <Hervorgehoben text={f.antwort} suche={suche} />
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}

        {treffer === 0 && (
          <div className="rounded-3xl border border-dashed border-line-strong bg-surface/60 px-6 py-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="mt-4 font-display text-lg font-semibold tracking-tight">
              Dazu haben wir hier noch nichts stehen
            </p>
            <p className="mx-auto mt-2 max-w-sm leading-relaxed text-ink-soft">
              Fragen Sie uns einfach direkt — wir antworten persönlich und nehmen die
              Frage gern mit in diese Liste auf.
            </p>
            <button
              type="button"
              onClick={() => setSuche("")}
              className="mt-5 rounded-full border border-line-strong bg-surface px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-ink cursor-pointer"
            >
              Alle Fragen anzeigen
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
