import { eur } from "./format";

/*
 * Verlauf der ERSPARNIS (nicht der Bilanz).
 *
 * Vorher zeigte diese Grafik die kumulierte Bilanz, also Ersparnis MINUS
 * Investition. In den ersten Jahren ist die zwangsläufig negativ, es standen
 * also sechs graue Balken unter der Nulllinie — das Erste, was ein Besucher
 * sah, war „Sie sind im Minus". Als Einstieg ist das abschreckend, obwohl die
 * Anlage vom ersten Tag an Geld spart.
 *
 * Jetzt läuft die Kurve so, wie der Kunde es erlebt: Die Ersparnis wächst
 * Jahr für Jahr, immer positiv. Der Punkt, ab dem die Investition wieder
 * drin ist, bleibt als gestrichelte Linie sichtbar — nichts wird verschwiegen,
 * es steht nur nicht mehr als Drohung am Anfang.
 */
export function ErsparnisChart({
  kumuliertOhneInvest, invest, jahre = 10,
}: {
  kumuliertOhneInvest: (n: number) => number;
  invest: number;
  jahre?: number;
}) {
  const values = Array.from({ length: jahre + 1 }, (_, i) => kumuliertOhneInvest(i));
  // Etwas Luft nach oben: Sonst stößt der höchste Balken exakt an die Kante
  // und die Schwellenlinie hätte bei knapper Amortisation keinen Platz mehr
  // für ihre Beschriftung.
  const max = Math.max(...values, invest, 1) * 1.08;
  // Höhe der Investitions-Linie in Prozent (von unten gemessen).
  const investY = Math.min(100, (invest / max) * 100);
  const investErreicht = values[jahre] >= invest;
  /*
   * Das erste Jahr, in dem die Ersparnis die Investition überholt — der
   * eigentliche Wendepunkt. Genau dieser eine Balken wird hervorgehoben.
   * `-1`, wenn es innerhalb des Zeitraums nicht dazu kommt.
   */
  const wendepunkt = values.findIndex((v) => v >= invest);

  return (
    <div>
      <div className="relative h-28">
        {/*
          Schwelle: ab hier ist die Investition wieder eingespielt.

          `z-20` ist entscheidend. Die Linie steht im Markup VOR den Balken;
          ohne eigene Ebene malen die Balken sie einfach zu — sichtbar blieb
          nur das Stück links, wo die Balken noch niedrig sind. Es sah aus,
          als säße die Linie an der falschen Stelle.

          Die Beschriftung sitzt rechts und trägt einen eigenen Hintergrund,
          damit sie auch über einem Balken lesbar bleibt. `-translate-y-1/2`
          zentriert sie exakt auf der Linie statt darüber.
        */}
        {investErreicht && (
          <div
            className="pointer-events-none absolute inset-x-0 z-20 border-t border-dashed border-amber-300/70"
            style={{ bottom: `${investY}%` }}
          >
            <span className="absolute right-0 -translate-y-1/2 rounded bg-night/85 px-1.5 py-0.5 text-[0.62rem] font-medium leading-none text-amber-200 ring-1 ring-amber-300/30">
              Investition drin
            </span>
          </div>
        )}
        {/* `items-stretch` ist Pflicht: Die Balken sind in ihrer Spalte absolut
            positioniert und beziehen ihre Prozenthöhe auf sie. Mit `items-end`
            schrumpfen die Spalten auf Inhaltshöhe — also null — und aus
            `height: 40%` wurden 40 % von nichts. Die Balken waren unsichtbar. */}
        <div className="relative flex h-full items-stretch gap-[3px]">
          {values.map((v, i) => {
            const h = (v / max) * 100;
            /*
             * Farbgebung erzählt die Geschichte in drei Schritten:
             * Jahr 0 = das Jahr der Investition (Akzentton), danach läuft
             * es grün, und der Wendepunkt — das Jahr, in dem die
             * Investition wieder drin ist — sticht in Gelb heraus.
             */
            const farbe =
              i === 0 ? "bg-accent"
              : i === wendepunkt ? "bg-amber-400"
              : "bg-emerald-400/80";
            return (
              <div key={i} className="group relative flex-1">
                <div
                  className={`absolute bottom-0 w-full rounded-[3px] transition-all duration-500 ${farbe}`}
                  style={{ height: `${Math.max(h, 1.5)}%` }}
                />
                <span className="pointer-events-none absolute -top-1 left-1/2 z-30 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-canvas px-2 py-1 text-[0.7rem] font-medium text-ink opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  Jahr {i}: {eur.format(v)} gespart
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-[0.7rem] text-white/45">
        <span>Jahr 0</span><span>Jahr 5</span><span>Jahr {jahre}</span>
      </div>
    </div>
  );
}
