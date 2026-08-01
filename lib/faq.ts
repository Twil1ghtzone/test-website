/*
 * Häufige Fragen — genau die, die im Erstgespräch immer wieder kommen.
 *
 * Zweck ist doppelt: Sie nehmen dem Kunden vor der Anfrage die Unsicherheit
 * ("Was, wenn das Internet ausfällt?"), und sie sind der ehrlichste Ort, um
 * die Grenzen der eigenen Leistung zu benennen. Eine FAQ, die nur Werbung
 * wiederholt, baut kein Vertrauen auf — deshalb stehen hier auch die
 * unbequemen Antworten (Preisspanne, Wartung, was NICHT geht).
 *
 * Reihenfolge = wahrscheinliche Reihenfolge der Fragen im Kopf des Lesers:
 * erst Geld, dann Alltagstauglichkeit, dann Technik, dann Zusammenarbeit.
 */

export interface FaqGruppe {
  key: string;
  titel: string;
  fragen: { frage: string; antwort: string }[];
}

export const faqGruppen: FaqGruppe[] = [
  {
    key: "kosten",
    titel: "Kosten & Angebot",
    fragen: [
      {
        frage: "Was kostet das Ganze ungefähr?",
        antwort:
          "Das hängt stark davon ab, was gebraucht wird — deshalb gibt es bei uns keine festen Pakete. Als grobe Orientierung: Ein eigener Heimserver mit Foto-Backup und Werbeblocker beginnt im niedrigen vierstelligen Bereich, eine Kamera-Installation richtet sich vor allem nach der Zahl der Kameras und den Kabelwegen. Einen realistischen Eindruck bekommen Sie in wenigen Minuten mit unserem Energie-Spar-Rechner. Verbindlich wird ein Preis erst nach der Besichtigung — vorher wäre jede Zahl geraten.",
      },
      {
        frage: "Kostet das Erstgespräch etwas?",
        antwort:
          "Nein. Gespräch, Besichtigung und Angebot sind kostenlos und unverbindlich. Erst wenn Sie zusagen, entstehen Kosten.",
      },
      {
        frage: "Kommen später monatliche Gebühren dazu?",
        antwort:
          "Nein — das ist der Kern unserer Arbeitsweise. Die Technik läuft bei Ihnen im Haus, es gibt kein Abo und keine Cloud-Gebühr. Laufende Kosten entstehen nur durch den Stromverbrauch des Servers (je nach Gerät etwa 12–45 Watt, das rechnen wir im Energie-Spar-Rechner offen gegen) und optional durch Wartung, wenn Sie diese wünschen.",
      },
      {
        frage: "Gibt es Förderungen?",
        antwort:
          "Für einzelne Maßnahmen — etwa im Bereich Heizungssteuerung — gibt es je nach Bundesland und Programm Zuschüsse. Wir sind keine Förderberatung, weisen Sie im Gespräch aber auf naheliegende Möglichkeiten hin, damit Sie gezielt nachfragen können.",
      },
    ],
  },
  {
    key: "alltag",
    titel: "Im Alltag",
    fragen: [
      {
        frage: "Was passiert, wenn das Internet ausfällt?",
        antwort:
          "Genau hier liegt der Vorteil einer lokalen Lösung: Licht, Heizungssteuerung, Kameraaufzeichnung und Automatisierungen laufen weiter, weil sie im Haus verarbeitet werden und nicht auf einem fremden Server. Ohne Internet fehlt nur der Zugriff von unterwegs — im Haus selbst funktioniert alles unverändert weiter. Bei cloudbasierten Systemen ist dagegen bei einem Ausfall regelmäßig gar nichts mehr steuerbar.",
      },
      {
        frage: "Muss ich mich mit Technik auskennen?",
        antwort:
          "Nein. Bedient wird alles über eine App oder klassische Schalter — wer möchte, muss nie tiefer einsteigen. Bei der Übergabe gehen wir alles in Ruhe mit Ihnen durch und lassen Ihnen eine verständliche Dokumentation da. Wenn Sie tiefer einsteigen möchten, steht Ihnen aber alles offen: Es sind offene Standards, keine geschlossene Blackbox.",
      },
      {
        frage: "Was ist, wenn Sie den Betrieb einmal aufgeben?",
        antwort:
          "Eine faire Frage, die zu selten gestellt wird. Wir setzen bewusst auf offene, verbreitete Standards (Home Assistant, ONVIF/RTSP bei Kameras, Docker, Linux) statt auf proprietäre Systeme. Das heißt: Ihre Anlage funktioniert unabhängig von uns weiter, und jeder andere Fachbetrieb kann sie übernehmen. Sie sind an niemanden gebunden — auch nicht an uns.",
      },
      {
        frage: "Funktioniert das auch in einer Mietwohnung?",
        antwort:
          "Teilweise. Alles, was ohne bauliche Eingriffe auskommt — Heimserver, Werbeblocker fürs ganze Netz, Foto-Backup, funkbasierte Thermostate und Sensoren — ist problemlos möglich und ziehbar, wenn Sie umziehen. Feste Verkabelung, Kameramontage an der Fassade oder Eingriffe im Sicherungskasten brauchen die Zustimmung des Vermieters. Was in Ihrem Fall geht, klären wir bei der Besichtigung.",
      },
    ],
  },
  {
    key: "daten",
    titel: "Daten & Sicherheit",
    fragen: [
      {
        frage: "Wo landen meine Kamerabilder?",
        antwort:
          "Ausschließlich auf Ihrem eigenen Gerät im Haus. Die Kameras hängen in einem eigenen, vom Internet getrennten Netzwerk (VLAN) und können von sich aus gar nichts nach außen senden. Die Auswertung — also das Erkennen von Personen, Tieren und Fahrzeugen — passiert lokal auf Ihrem Server. Es gibt keinen Anbieter, der mitliest, und kein Konto bei einem Hersteller.",
      },
      {
        frage: "Ist Videoüberwachung überhaupt erlaubt?",
        antwort:
          "Auf Ihrem eigenen Grundstück ja — aber nicht grenzenlos. Öffentliche Gehwege, Nachbargrundstücke und gemeinschaftlich genutzte Bereiche dürfen grundsätzlich nicht erfasst werden. Wir richten die Kameras und die Erfassungsbereiche entsprechend aus und weisen Sie auf Ihre Pflichten hin (etwa Hinweisschilder). Eine Rechtsberatung ersetzt das nicht — bei Mehrparteienhäusern oder Grenzfällen sollten Sie zusätzlich juristisch nachfragen.",
      },
      {
        frage: "Haben Sie Zugriff auf mein System?",
        antwort:
          "Nur, wenn Sie es ausdrücklich wünschen — etwa für Fernwartung. Standardmäßig richten wir keinen dauerhaften Fernzugang für uns ein. Wenn Sie Unterstützung möchten, vereinbaren wir einen Zugang, den Sie jederzeit selbst abschalten können.",
      },
    ],
  },
  {
    key: "zusammenarbeit",
    titel: "Zusammenarbeit",
    fragen: [
      {
        frage: "Wie lange dauert so eine Installation?",
        antwort:
          "Ein Heimserver mit Grundeinrichtung ist meist an einem Tag betriebsbereit. Eine komplette Kamera-Installation mit Kabelverlegung braucht je nach Gebäude und Zahl der Kameras ein bis mehrere Tage. Einen konkreten Zeitrahmen nennen wir mit dem Angebot — nicht vorher, weil er stark vom Gebäude abhängt.",
      },
      {
        frage: "Was passiert nach der Installation?",
        antwort:
          "Wir übergeben das System persönlich, zeigen Ihnen alles in Ruhe und lassen eine Dokumentation da. Danach läuft es eigenständig. Wenn später etwas ist, erreichen Sie uns — über das Kontaktformular, per E-Mail, telefonisch oder über unser Support-System, in dem Sie den Stand Ihrer Anfrage jederzeit einsehen können.",
      },
      {
        frage: "Übernehmen Sie auch bestehende Anlagen?",
        antwort:
          "Häufig ja. Wenn Ihre vorhandene Technik offene Standards nutzt, lässt sie sich meist einbinden statt ersetzen — das spart Geld und Material. Bei fest an eine Hersteller-Cloud gebundenen Geräten geht das oft nicht, ohne den Anbieterzwang mitzunehmen. Was sich lohnt, sagen wir Ihnen ehrlich, auch wenn die Antwort einmal „behalten Sie das, das reicht“ lautet.",
      },
      {
        frage: "In welchem Umkreis arbeiten Sie?",
        antwort:
          "Wir arbeiten regional, damit wir bei Bedarf auch kurzfristig vor Ort sein können. Ob Ihre Adresse im Einsatzgebiet liegt, klären wir in einem kurzen Anruf oder über das Kontaktformular.",
      },
    ],
  },
];

/** Alle Fragen flach — für die strukturierten Daten (FAQPage-Schema). */
export const alleFragen = faqGruppen.flatMap((g) => g.fragen);
