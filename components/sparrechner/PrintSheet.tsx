import type { berechne, Wohnform, ServerKey } from "@/lib/sparrechner";
import { HEIZARTEN, STROM_MASSNAHMEN, WAERME_MASSNAHMEN, SERVER, CLOUD } from "@/lib/sparrechner";
import { nf, eur, eur2, komma, type Kontakt } from "./format";
import { PrintRow } from "./Primitives";

type Ergebnis = ReturnType<typeof berechne>;

/**
 * Druckbogen (nur im PDF/Ausdruck sichtbar über die `printonly`-Klasse).
 * Rein präsentational — bekommt alle Werte fertig berechnet als Props, damit
 * sich diese Ansicht unabhängig vom restlichen Formular pflegen lässt.
 */
export function PrintSheet({
  kontakt, r, wohnform, flaeche, personen, heute,
  verbrauch, strompreis, stromMass, waermeMass, serverKey,
  pvAktiv, pvWp, pvSpezErtrag, pvEigenverbrauch, abos, preissteigerung,
}: {
  kontakt: Kontakt;
  r: Ergebnis;
  wohnform: Wohnform;
  flaeche: number;
  personen: number;
  heute: string;
  verbrauch: number;
  strompreis: number;
  stromMass: Set<string>;
  waermeMass: Set<string>;
  serverKey: ServerKey;
  pvAktiv: boolean;
  pvWp: number;
  pvSpezErtrag: number;
  pvEigenverbrauch: number;
  abos: Set<string>;
  preissteigerung: number;
}) {
  return (
    <div className="printonly print-exact">
      <header className="print-keep flex items-start justify-between gap-6 border-b-2 border-[#211c17] pb-4">
        <div>
          <p className="text-[8pt] uppercase tracking-[0.22em] text-[#8a8076]">{kontakt.companyName}</p>
          <h1 className="mt-1 font-display text-[20pt] font-semibold leading-tight text-[#211c17]">
            Energie-Spar-Analyse
          </h1>
          <p className="mt-1 text-[9pt] text-[#4d453c]">
            {wohnform === "haus" ? "Einfamilienhaus" : "Wohnung"} · {flaeche} m² · {personen} {personen === 1 ? "Person" : "Personen"} · erstellt am {heute}
          </p>
        </div>
        <div className="text-right text-[8.5pt] leading-snug text-[#4d453c]">
          <p>{kontakt.email}</p>
          <p>{kontakt.phone}</p>
          <p>{kontakt.region}</p>
        </div>
      </header>

      {/* Ergebnis groß */}
      <section className="print-keep mt-6 rounded-[3mm] border-[0.4mm] border-[#b0543a] bg-[#ecd9cf] px-6 py-5">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="text-[8pt] uppercase tracking-[0.22em] text-[#8d4129]">Ihre jährliche Entlastung (unverbindliche Schätzung)</p>
            <p className="mt-1 font-display text-[28pt] font-semibold leading-none text-[#211c17]">
              {eur.format(Math.max(0, r.netto))}
            </p>
            <p className="mt-1 text-[9pt] text-[#4d453c]">weniger Kosten pro Jahr — Strom, Wärme und Abos zusammen</p>
          </div>
          <div className="text-right">
            <p className="text-[9pt] text-[#4d453c]">CO₂-Einsparung</p>
            <p className="font-display text-[15pt] font-semibold tabular-nums text-[#8d4129]">
              {nf.format(Math.max(0, r.co2))} kg / Jahr
            </p>
            <p className="mt-1 text-[9pt] text-[#4d453c]">wie {nf.format(r.co2Vergleich.baeume)} junge Bäume</p>
          </div>
        </div>
      </section>

      <div className="mt-6 grid grid-cols-2 gap-5">
        {/* Eingaben */}
        <section className="print-card print-keep p-4">
          <h2 className="font-display text-[11pt] font-semibold text-[#211c17]">Ihre Angaben</h2>
          <table className="mt-2 w-full text-[9pt]">
            <tbody className="align-top">
              <PrintRow label="Stromverbrauch" wert={`${nf.format(verbrauch)} kWh / Jahr`} />
              <PrintRow label="Strompreis" wert={`${komma(strompreis, 2)} €/kWh`} />
              {r.waermeDetail.map((d) => (
                <PrintRow key={d.id} label={HEIZARTEN[d.art].label} wert={`${eur.format(d.jahreskosten)} / Jahr · ${nf.format(d.kwh)} kWh`} />
              ))}
              {r.waermeDetail.length === 0 && <PrintRow label="Wärme" wert="keine Angabe" />}
              <PrintRow label="Strommaßnahmen" wert={STROM_MASSNAHMEN.filter((m) => stromMass.has(m.key)).map((m) => m.label).join(", ") || "keine"} />
              <PrintRow label="Wärmemaßnahmen" wert={WAERME_MASSNAHMEN.filter((m) => waermeMass.has(m.key)).map((m) => m.label).join(", ") || "keine"} />
              <PrintRow label="Server" wert={`${SERVER.find((s) => s.key === serverKey)!.label} · ${r.serverWatt} W`} />
              <PrintRow
                label="Balkonkraftwerk"
                wert={pvAktiv ? `${nf.format(pvWp)} Wp · ${nf.format(pvSpezErtrag)} kWh/kWp · ${Math.round(pvEigenverbrauch * 100)} % Eigenverbrauch` : "nicht eingeplant"}
              />
              <PrintRow label="Abos, die wegfallen" wert={CLOUD.filter((c) => abos.has(c.key)).map((c) => c.label).join(", ") || "keine"} />
              <PrintRow label="Preissteigerung" wert={`${komma(preissteigerung * 100)} % pro Jahr`} />
            </tbody>
          </table>
        </section>

        {/* Ersparnis */}
        <section className="print-card print-keep p-4">
          <h2 className="font-display text-[11pt] font-semibold text-[#211c17]">Jahresersparnis</h2>
          <table className="mt-2 w-full text-[9pt]">
            <tbody>
              <PrintRow label={`Strom (−${Math.round(r.stromPct * 100)} %)`} wert={`${eur.format(r.stromEuro)} · ${nf.format(r.stromKwh)} kWh`} />
              <PrintRow label={`Wärme (−${Math.round(r.waermePct * 100)} %)`} wert={`${eur.format(r.waermeEuro)} · ${nf.format(r.waermeKwh)} kWh`} />
              {pvAktiv && <PrintRow label="Balkonkraftwerk" wert={`${eur.format(r.pvEuro)} · ${nf.format(r.pvKwhEigen)} kWh selbst genutzt`} />}
              <PrintRow label="Wegfallende Abos" wert={`${eur.format(r.aboEuro)} · ${eur2.format(r.aboMonat)}/Monat`} />
              <PrintRow label="Strom für den Server" wert={`−${eur.format(r.serverEuro)} · ${nf.format(r.serverKwh)} kWh`} />
              <tr className="border-t-[0.3mm] border-[#211c17]">
                <td className="pt-2 font-semibold text-[#211c17]">Netto im ersten Jahr</td>
                <td className="pt-2 text-right font-semibold tabular-nums text-[#211c17]">{eur.format(r.netto)}</td>
              </tr>
            </tbody>
          </table>

          <h2 className="mt-5 font-display text-[11pt] font-semibold text-[#211c17]">CO₂-Bilanz</h2>
          <p className="mt-1 text-[9pt] leading-relaxed text-[#4d453c]">
            <strong className="text-[#211c17]">{nf.format(Math.max(0, r.co2))} kg CO₂</strong> weniger pro Jahr — so viel binden
            rund {nf.format(r.co2Vergleich.baeume)} junge Bäume in einem Jahr, oder so viel entsteht
            auf {nf.format(r.co2Vergleich.autoKm)} Autokilometern. Das entspricht {komma(r.co2Vergleich.anteilProKopf)} %
            des durchschnittlichen Pro-Kopf-Ausstoßes in Deutschland.
          </p>
        </section>
      </div>

      {/* Investition */}
      <section className="print-card print-keep mt-5 p-4">
        <h2 className="font-display text-[11pt] font-semibold text-[#211c17]">Investition — vollständiges Paket</h2>
        <table className="mt-2 w-full text-[9pt]">
          <tbody>
            {r.posten.map((p) => (
              <PrintRow key={p.label} label={p.label} wert={eur.format(p.betrag)} />
            ))}
            <tr className="border-t-[0.3mm] border-[#211c17]">
              <td className="pt-2 font-semibold text-[#211c17]">Gesamt</td>
              <td className="pt-2 text-right font-semibold tabular-nums text-[#211c17]">{eur.format(r.invest)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[8pt] leading-relaxed text-[#8a8076]">
          Unverbindlich: grobe, preisliche Einschätzung für Material, Fachmontage und Inbetriebnahme —
          je nach Gegebenheit vor Ort kann der endgültige Preis abweichen. Im persönlichen Gespräch
          erstellen wir Ihnen ein individuelles, verbindliches Angebot.
        </p>
      </section>

      {/* Verlauf als Tabelle — zeigt wachsende Ersparnisse */}
      <section className="print-card print-keep mt-5 p-4">
        <h2 className="font-display text-[11pt] font-semibold text-[#211c17]">Ihre Ersparnis wächst</h2>
        <table className="mt-2 w-full text-[8.5pt]">
          <thead>
            <tr className="border-b-[0.2mm] border-[#d3c8b5] text-left text-[#8a8076]">
              <th className="pb-1 font-medium">Jahr</th>
              {[1, 3, 5, 7, 10].map((j) => (
                <th key={j} className="pb-1 text-right font-medium">{j}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="pt-1.5 text-[#4d453c]">Gesamtersparnis</td>
              {[1, 3, 5, 7, 10].map((j) => (
                <td key={j} className="pt-1.5 text-right tabular-nums font-semibold text-[#211c17]">
                  {eur.format(r.kumuliertOhneInvest(j))}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[8pt] text-[#8a8076]">
          Kumulierte Einsparung über die Jahre, inklusive {komma(preissteigerung * 100)} % Energiepreissteigerung pro Jahr.
          Die Werte steigen, weil gesparte Energie mit der Zeit immer wertvoller wird.
        </p>
      </section>

      {/* Fuß mit Kontakt und Handlungsaufforderung */}
      <footer className="print-keep mt-6 border-t-2 border-[#211c17] pt-4">
        <div className="flex items-start justify-between gap-6">
          <div className="max-w-[60%]">
            <p className="font-display text-[12pt] font-semibold text-[#211c17]">Sollen wir das gemeinsam durchrechnen?</p>
            <p className="mt-1 text-[9pt] leading-relaxed text-[#4d453c]">
              Wir sehen uns Ihr Zuhause vor Ort an, prüfen die Zahlen an Ihrer echten Abrechnung
              und machen Ihnen ein verbindliches Angebot. Die Anmeldung des Balkonkraftwerks bei
              Bundesnetzagentur und Netzbetreiber übernehmen wir komplett.
            </p>
          </div>
          <div className="text-right text-[9pt] leading-relaxed text-[#4d453c]">
            <p className="font-semibold text-[#211c17]">{kontakt.companyName}</p>
            <p>{kontakt.email}</p>
            <p>{kontakt.phone}</p>
            <p>{kontakt.region}</p>
          </div>
        </div>
        <p className="mt-3 text-[7.5pt] leading-snug text-[#8a8076]">
          Grobe Orientierung auf Basis Ihrer Angaben — die tatsächlichen Einsparungen können je
          nach Situation auch höher ausfallen. Installationskosten variieren je nach örtlichen
          Gegebenheiten. Wir beraten Sie gerne persönlich und unverbindlich.
        </p>
      </footer>
    </div>
  );
}
