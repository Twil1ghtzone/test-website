/*
 * Sprunglink zum Hauptinhalt („Skip to content").
 *
 * Warum das hier gebraucht wird: Die Navigation ist fest oben verankert und
 * enthält bis zu neun Einträge plus das Mega-Dropdown „Dienstleistungen".
 * Wer mit der Tastatur oder einem Screenreader arbeitet, musste sich auf
 * JEDER Unterseite erst komplett durch diese Leiste tabben, bevor der
 * eigentliche Text erreichbar war.
 *
 * Der Link ist das erste fokussierbare Element im Dokument und bleibt
 * unsichtbar, bis er den Fokus bekommt — Mausnutzer sehen ihn nie,
 * Tastaturnutzer sofort beim ersten Tab.
 *
 * `sr-only` versteckt ihn zugänglich (nicht `display:none`, sonst wäre er
 * auch für Screenreader weg); `focus:not-sr-only` holt ihn bei Fokus zurück.
 *
 * Barrierefreiheit ist hier nicht nur gut gemeint: Für viele gewerbliche
 * Websites in Deutschland gelten seit Juni 2025 die Anforderungen des
 * Barrierefreiheitsstärkungsgesetzes (BFSG).
 */
export default function SkipLink() {
  return (
    <a
      href="#inhalt"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-accent focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
    >
      Zum Hauptinhalt springen
    </a>
  );
}
