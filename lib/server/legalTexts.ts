/* ════════════════════════════════════════════════════════════════════════
   RECHTSTEXTE — VOLLSTÄNDIGE VORLAGEN

   Diese Texte sind so weit ausgearbeitet, wie es ohne Kenntnis der echten
   Firmendaten möglich ist. Alles, was nur der Betreiber wissen kann, ist
   mit [ECKIGEN KLAMMERN] markiert und muss im Admin unter
   „Rechtstexte & Kontakt" ersetzt werden.

   WICHTIG — das ist keine Rechtsberatung:
   Impressum, Datenschutzerklärung und AGB sind rechtlich bindend und
   abmahnfähig. Diese Vorlagen decken den technisch bekannten Teil dieser
   Website vollständig ab (welche Cookies gesetzt werden, wie der Chat
   verschlüsselt wird, wie lange was gespeichert wird) — genau die Teile,
   die Standardgeneratoren nicht kennen können. Die unternehmensbezogenen
   Angaben und die endgültige Freigabe gehören trotzdem einmal vor einen
   Anwalt oder die zuständige Handwerkskammer/IHK.
   ════════════════════════════════════════════════════════════════════════ */

/*
 * Die früheren, sehr knappen Vorlagen.
 *
 * Gebraucht für die Migration: Ein bestehendes legal.json überschreibt die
 * Standardtexte — sonst wären die neuen, ausführlichen Fassungen unsichtbar,
 * solange irgendwo noch die alte Datei liegt. Stimmt der gespeicherte Text
 * exakt mit einer dieser Fassungen überein, wurde er nie bearbeitet und darf
 * gefahrlos durch die neue Vorlage ersetzt werden. Sobald jemand auch nur ein
 * Zeichen geändert hat, bleibt seine Fassung unangetastet.
 */
export const ALT_IMPRESSUM =
  "## Impressum\n\nAngaben gemäß § 5 TMG\n\n**STUDIO//LOKAL**\nMusterstraße 1\n00000 Musterstadt\n\n**Kontakt:** kontakt@studio-lokal.de\n\n_Bitte im Admin-Bereich mit euren echten Angaben ersetzen._";

export const ALT_DATENSCHUTZ =
  "## Datenschutzerklärung\n\n" +
  "Wir verarbeiten personenbezogene Daten sparsam und lokal. Diese Seite setzt ausschließlich technisch notwendige Cookies — " +
  "für die Admin-Anmeldung, zur Wiedererkennung eigener Support-Tickets und für den KI-Support-Chat. Eine vollständige Liste " +
  "mit Zweck, Speicherdauer und Schutzmaßnahmen jedes einzelnen Cookies führt der Admin-Bereich unter „Cookies“.\n\n" +
  "### KI-Support-Chat\n\n" +
  "Nachrichten an unseren Chat-Assistenten werden hüllenverschlüsselt gespeichert (RSA-2048 über AES-256-GCM, mit einem " +
  "eigenen Schlüsselpaar je Gespräch) und automatisch nach 7 Tagen Inaktivität gelöscht — oder sofort, wenn Sie im Chat " +
  "„Neuer Chat“ wählen. Mit dem Löschen verschwindet auch der zugehörige Schlüssel, die Nachrichten sind danach " +
  "endgültig nicht mehr lesbar. Der Zugriff auf einen laufenden Chat läuft über ein signiertes, nur serverseitig " +
  "lesbares Cookie. Die Verarbeitung dient der Beantwortung Ihrer Anfrage " +
  "(Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse an funktionierendem Support).\n\n" +
  "_Hinweis für den Betreiber, bitte vor Veröffentlichung prüfen:_ Läuft die KI über einen lokal betriebenen Server " +
  "(z. B. Ollama/LM Studio im eigenen Netz), verlassen die Nachrichten diesen Server nicht. Wird stattdessen ein " +
  "Cloud-Anbieter (z. B. OpenAI) als KI-Endpunkt eingetragen, werden die Nachrichten zur Verarbeitung an diesen Anbieter " +
  "übermittelt — dann bitte hier den tatsächlich genutzten Anbieter, dessen Sitz und ggf. eine Auftragsverarbeitungs-" +
  "Vereinbarung ergänzen.\n\n" +
  "_Bitte im Admin-Bereich mit eurer echten Datenschutzerklärung ersetzen._";

export const IMPRESSUM_VORLAGE = `## Impressum

Angaben gemäß § 5 DDG (ehemals § 5 TMG)

### Anbieter

**[FIRMENNAME — z. B. Mustermann Elektro & IT GbR]**
[Straße und Hausnummer]
[PLZ] [Ort]
Deutschland

**Rechtsform:** [z. B. Einzelunternehmen / GbR / GmbH]
**Vertreten durch:** [Vor- und Nachname der vertretungsberechtigten Person(en)]

### Kontakt

**Telefon:** [Telefonnummer]
**E-Mail:** [E-Mail-Adresse]

### Registereintrag

[Falls vorhanden — sonst diesen Abschnitt löschen:]
Eintragung im Handelsregister
**Registergericht:** [Amtsgericht]
**Registernummer:** [HRA/HRB …]

### Umsatzsteuer-Identifikationsnummer

Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
**[USt-IdNr. — z. B. DE123456789]**

[Falls Kleinunternehmer nach § 19 UStG, stattdessen:]
[Gemäß § 19 UStG wird keine Umsatzsteuer berechnet und daher auch nicht ausgewiesen.]

### Berufsrechtliche Angaben

**Berufsbezeichnung:** [z. B. Elektrotechnikermeister / Informationstechniker]
**Verliehen in:** Bundesrepublik Deutschland
**Zuständige Kammer:** [z. B. Handwerkskammer Musterstadt, Musterstraße 1, 00000 Musterstadt]
**Eintragung in der Handwerksrolle:** [Ja/Nein — bei zulassungspflichtigem Handwerk Pflichtangabe]

Es gelten die Handwerksordnung (HwO) sowie die Berufsordnung der zuständigen
Handwerkskammer. Die Regelungen sind einsehbar unter: [Website der Kammer]

### Eintragung im Installateurverzeichnis

[Bei Arbeiten am Stromnetz Pflicht — sonst löschen:]
Eingetragen im Installateurverzeichnis des Netzbetreibers [Name des Netzbetreibers].

### Berufshaftpflichtversicherung

**Versicherer:** [Name und Anschrift des Versicherers]
**Geltungsraum:** [z. B. Deutschland / Europa]

### Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV

[Vor- und Nachname]
[Straße und Hausnummer]
[PLZ] [Ort]

### Streitschlichtung

Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
bereit: <https://ec.europa.eu/consumers/odr/>
Unsere E-Mail-Adresse finden Sie oben im Impressum.

Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor
einer Verbraucherschlichtungsstelle teilzunehmen.

### Haftung für Inhalte

Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen
Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind
wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte
fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine
rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder Sperrung
der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon
unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der
Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von
entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.

### Haftung für Links

Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir
keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine
Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
Anbieter oder Betreiber der Seiten verantwortlich. Die verlinkten Seiten wurden
zum Zeitpunkt der Verlinkung auf mögliche Rechtsverstöße überprüft; rechtswidrige
Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar. Bei Bekanntwerden von
Rechtsverletzungen werden wir derartige Links umgehend entfernen.

### Urheberrecht

Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung,
Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes
bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
Downloads und Kopien dieser Seite sind nur für den privaten, nicht kommerziellen
Gebrauch gestattet.
`;

export const DATENSCHUTZ_VORLAGE = `## Datenschutzerklärung

Der Schutz Ihrer Daten ist für uns kein Feigenblatt, sondern Geschäftsmodell:
Wir bauen Technik, die ohne Cloud auskommt — und betreiben diese Website nach
demselben Grundsatz. Es gibt hier **kein Google Analytics, keine Tracking-Pixel,
keine Werbenetzwerke und keine Social-Media-Plugins**.

### 1. Verantwortlicher

Verantwortlich für die Datenverarbeitung auf dieser Website ist:

**[FIRMENNAME]**
[Straße und Hausnummer]
[PLZ] [Ort]
**Telefon:** [Telefonnummer]
**E-Mail:** [E-Mail-Adresse]

[Falls ein Datenschutzbeauftragter bestellt ist, hier Name und Kontakt ergänzen.
Für Betriebe unter 20 Personen, die nicht umfangreich mit sensiblen Daten
arbeiten, ist das in der Regel nicht erforderlich.]

### 2. Ihre Rechte

Sie haben jederzeit das Recht auf:

- **Auskunft** über die zu Ihrer Person gespeicherten Daten (Art. 15 DSGVO)
- **Berichtigung** unrichtiger Daten (Art. 16 DSGVO)
- **Löschung** Ihrer Daten (Art. 17 DSGVO)
- **Einschränkung der Verarbeitung** (Art. 18 DSGVO)
- **Datenübertragbarkeit** (Art. 20 DSGVO)
- **Widerspruch** gegen die Verarbeitung (Art. 21 DSGVO)
- **Widerruf einer Einwilligung** mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)

Eine formlose E-Mail an [E-Mail-Adresse] genügt. Außerdem haben Sie das Recht,
sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO). Die
für uns zuständige Behörde ist: [Zuständige Landesdatenschutzbehörde — richtet
sich nach dem Bundesland des Firmensitzes].

### 3. Server-Logfiles

Beim Aufruf dieser Website werden automatisch Informationen erfasst, die Ihr
Browser übermittelt. Das ist technisch notwendig, um die Seite auszuliefern:

- aufgerufene Adresse
- Datum und Uhrzeit des Zugriffs
- verwendeter Browser und Betriebssystem
- übertragene Datenmenge
- HTTP-Statuscode

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
technisch fehlerfreiem Betrieb und Sicherheit).
**Speicherdauer:** [BITTE PRÜFEN — üblich sind 7 bis 14 Tage, danach automatische
Löschung. Bitte an die tatsächliche Konfiguration Ihres Servers/Hosters anpassen.]

Eine Zusammenführung dieser Daten mit anderen Datenquellen findet nicht statt.

### 4. Cookies

Diese Website setzt **ausschließlich technisch notwendige Cookies**. Es gibt
keine Marketing- oder Statistik-Cookies, deshalb auch kein Cookie-Banner mit
Einwilligungsabfrage — für technisch erforderliche Cookies ist keine Einwilligung
nötig (§ 25 Abs. 2 Nr. 2 TDDDG).

| Cookie | Zweck | Dauer |
|---|---|---|
| Admin-Sitzung | Anmeldung im internen Verwaltungsbereich. Nur für Mitarbeitende relevant. | Bis zur Abmeldung |
| Support-Ticket | Erkennt Ihr eigenes Support-Ticket wieder, damit Sie den Bearbeitungsstand ohne erneute Anmeldung sehen. | 30 Tage |
| Chat-Sitzung | Ordnet Ihnen ein laufendes Chat-Gespräch zu. Signiert und nur serverseitig lesbar. | 7 Tage |

Alle Cookies sind als \`HttpOnly\`, \`SameSite=Lax\` und (bei HTTPS) \`Secure\`
gesetzt — sie sind für JavaScript im Browser nicht auslesbar.

### 5. Kontaktformular und Anfragen

Wenn Sie uns über das Kontaktformular, per E-Mail oder telefonisch kontaktieren,
speichern wir Ihre Angaben (Name, Kontaktdaten, Ihre Nachricht), um die Anfrage
zu bearbeiten.

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b DSGVO (Anbahnung eines Vertrags) bzw.
Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an der Beantwortung).
**Speicherdauer:** Bis die Anfrage erledigt ist. Kommt ein Auftrag zustande,
gelten die handels- und steuerrechtlichen Aufbewahrungsfristen (6 bzw. 10 Jahre).
Sie können der Speicherung jederzeit widersprechen.

### 6. Support-Tickets

Für ein Support-Ticket speichern wir Name, E-Mail-Adresse, Betreff und den
Nachrichtenverlauf sowie optional von Ihnen hochgeladene Dateien.

Der Zugriff läuft über eine zufällig erzeugte Ticketnummer in Verbindung mit
einem geheimen Zugriffscode, der **nicht im Klartext gespeichert** wird — auf
dem Server liegt nur dessen kryptografische Prüfsumme (HMAC). Ihre IP-Adresse
wird ausschließlich in gehashter Form gespeichert, um Missbrauch zu begrenzen;
ein Rückschluss auf die ursprüngliche Adresse ist daraus nicht möglich.

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. b und lit. f DSGVO.
**Speicherdauer:** Bis zur Erledigung, anschließend gemäß den gesetzlichen
Aufbewahrungsfristen.

### 7. KI-Support-Chat

Der Chat-Assistent auf dieser Seite verarbeitet Ihre Nachrichten, um Ihre Fragen
zu beantworten. Wie das technisch abgesichert ist:

- Jedes Gespräch erhält ein **eigenes RSA-2048-Schlüsselpaar**. Die einzelnen
  Nachrichten werden mit AES-256-GCM verschlüsselt, der Inhaltsschlüssel
  wiederum mit dem Gesprächsschlüssel (Hüllenverschlüsselung).
- Auf der Festplatte liegt **kein Klartext** — weder Ihre Fragen noch die
  Antworten.
- Nach **7 Tagen ohne Aktivität** wird das Gespräch automatisch gelöscht,
  ebenso sofort, wenn Sie im Chat „Neuer Chat" wählen. Mit dem Gespräch
  verschwindet auch sein Schlüssel: Die Daten sind danach **endgültig nicht
  mehr entschlüsselbar**, auch nicht durch uns.

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an
funktionierendem Support).

**[WICHTIG — BITTE PRÜFEN UND ANPASSEN:]**
[Läuft die KI auf einem Server im eigenen Netz (z. B. Ollama oder LM Studio),
verlassen die Nachrichten diesen Server nicht — dann bitte hier ergänzen:
„Die Verarbeitung erfolgt ausschließlich auf einem von uns selbst betriebenen
Server in Deutschland. Eine Übermittlung an Dritte findet nicht statt."]
[Wird stattdessen ein Cloud-Anbieter (z. B. OpenAI, Anthropic, Google) als
KI-Endpunkt eingetragen, werden Ihre Nachrichten dorthin übermittelt. Dann sind
hier zwingend anzugeben: der Anbieter, dessen Sitz, die Rechtsgrundlage der
Übermittlung (bei Sitz außerhalb der EU: Angemessenheitsbeschluss oder
Standardvertragsklauseln) sowie das Bestehen eines
Auftragsverarbeitungsvertrags.]

### 8. Bewertungen

Bewertungen können ausschließlich mit einer gültigen, in unserem System
registrierten Rechnungsnummer abgegeben werden. Gespeichert werden der von Ihnen
angegebene Name, die Sternebewertung, Ihr Text und der Zeitpunkt. Ihre
IP-Adresse wird nur gehasht gespeichert (Schutz vor Mehrfachabgabe). Jede
Bewertung wird serverseitig signiert und ist damit nachträglich nicht
unbemerkt veränderbar.

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch das Absenden)
sowie Art. 6 Abs. 1 lit. f DSGVO.
**Speicherdauer:** Bis zu Ihrem Widerruf. Eine Löschung können Sie jederzeit
formlos verlangen.

### 9. Blog-Abonnement

Wenn Sie unseren Blog abonnieren, speichern wir Ihre E-Mail-Adresse. Die
Anmeldung erfolgt im **Double-Opt-in-Verfahren**: Sie erhalten zunächst eine
E-Mail mit einem Bestätigungslink; erst danach ist das Abonnement aktiv. In jeder
Nachricht finden Sie einen Abmeldelink.

**Rechtsgrundlage:** Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).
**Speicherdauer:** Bis zur Abmeldung.

### 10. Hosting

Diese Website wird betrieben auf: **[BITTE ERGÄNZEN — Name und Anschrift des
Hosters bzw. „auf einem eigenen Server am Firmensitz". Bei einem externen
Hoster ist ein Auftragsverarbeitungsvertrag nach Art. 28 DSGVO erforderlich;
diesen bitte abschließen und hier erwähnen.]**

### 11. Schriftarten

Die verwendeten Schriftarten (Inter und Fraunces) werden **lokal vom eigenen
Server ausgeliefert**. Es besteht keine Verbindung zu Google Fonts; Ihre
IP-Adresse wird nicht an Dritte übertragen.

### 12. Verschlüsselte Übertragung

Diese Seite nutzt aus Sicherheitsgründen eine SSL-/TLS-Verschlüsselung. Eine
verschlüsselte Verbindung erkennen Sie am „https://" in der Adresszeile und am
Schloss-Symbol. Zusätzlich sind strenge Sicherheits-Header aktiv (unter anderem
eine Content-Security-Policy), die das Einschleusen fremder Skripte verhindern.

### 13. Änderungen dieser Erklärung

Wir passen diese Datenschutzerklärung an, sobald sich die Funktionen der Website
oder die Rechtslage ändern. Es gilt jeweils die hier veröffentlichte Fassung.

**Stand:** [Datum eintragen]
`;

export const AGB_VORLAGE = `## Allgemeine Geschäftsbedingungen (AGB)

**[HINWEIS FÜR DEN BETREIBER — vor Veröffentlichung entfernen:]**
[Diese AGB sind eine ausgearbeitete Vorlage für einen Handwerks- und
IT-Dienstleistungsbetrieb mit überwiegend privaten Kunden. Vor dem Einsatz bitte
einmal anwaltlich prüfen lassen — insbesondere Zahlungsbedingungen, Gewährleistung
und Haftungsbegrenzung sind gegenüber Verbrauchern nur eingeschränkt abdingbar.
Punkte in eckigen Klammern sind an Ihren Betrieb anzupassen.]

### § 1 Geltungsbereich

(1) Diese Allgemeinen Geschäftsbedingungen gelten für alle Verträge zwischen
[FIRMENNAME] (nachfolgend „Auftragnehmer") und dem Auftraggeber über Leistungen
der Elektrotechnik, Netzwerk- und IT-Installation, Smart-Home-Integration sowie
individueller Fertigung.

(2) Abweichende Bedingungen des Auftraggebers werden nicht anerkannt, es sei
denn, der Auftragnehmer stimmt ihrer Geltung ausdrücklich in Textform zu.

(3) Verbraucher im Sinne dieser AGB ist jede natürliche Person, die den Vertrag
zu Zwecken abschließt, die überwiegend weder ihrer gewerblichen noch ihrer
selbständigen beruflichen Tätigkeit zugerechnet werden können (§ 13 BGB).

### § 2 Angebot und Vertragsschluss

(1) Darstellungen auf der Website, im Konfigurator und im Energie-Spar-Rechner
sind **unverbindliche Orientierungswerte** und stellen kein bindendes Angebot dar.

(2) Ein Vertrag kommt erst durch ein schriftliches Angebot des Auftragnehmers
und dessen Annahme durch den Auftraggeber zustande, oder durch beiderseitige
Auftragsbestätigung in Textform.

(3) Angebote sind, sofern nicht anders angegeben, **[30] Tage** ab Ausstellung
gültig. Wesentliche Preisänderungen bei Material (z. B. Kupfer, Halbleiter)
berechtigen den Auftragnehmer zur Anpassung, sofern zwischen Angebot und
Ausführung mehr als [4] Monate liegen und die Änderung nachgewiesen wird.

### § 3 Leistungsumfang

(1) Der Umfang der Leistung ergibt sich ausschließlich aus dem schriftlichen
Angebot bzw. der Auftragsbestätigung.

(2) Der Auftragnehmer erbringt seine Leistungen nach den anerkannten Regeln der
Technik sowie den einschlägigen Normen (insbesondere DIN VDE) und den geltenden
Unfallverhütungsvorschriften.

(3) Ergibt sich während der Ausführung, dass zusätzliche, im Angebot nicht
vorgesehene Arbeiten erforderlich sind, informiert der Auftragnehmer den
Auftraggeber unverzüglich. Zusatzleistungen bedürfen einer gesonderten
Vereinbarung in Textform.

### § 4 Mitwirkungspflichten des Auftraggebers

(1) Der Auftraggeber stellt sicher, dass der Auftragnehmer zu den vereinbarten
Zeiten ungehinderten Zugang zu den Arbeitsbereichen erhält.

(2) Der Auftraggeber stellt kostenfrei Strom und Wasser sowie, soweit
erforderlich, einen Internetzugang zur Verfügung.

(3) Der Auftraggeber informiert über ihm bekannte, nicht ohne Weiteres
erkennbare Gegebenheiten — insbesondere über den Verlauf verdeckter Leitungen.
Für Schäden an nicht angezeigten und nicht erkennbaren Leitungen haftet der
Auftragnehmer nicht.

(4) Der Auftraggeber ist für die **Sicherung eigener Daten** vor Beginn der
Arbeiten selbst verantwortlich. Der Auftragnehmer weist ausdrücklich darauf hin,
dass bei Arbeiten an IT-Systemen Datenverlust nie vollständig ausgeschlossen
werden kann.

(5) Bei Anlagen zur Videoüberwachung ist der Auftraggeber für die Einhaltung der
datenschutzrechtlichen Vorgaben verantwortlich — insbesondere dafür, dass keine
öffentlichen Wege, Nachbargrundstücke oder gemeinschaftlich genutzten Flächen
erfasst werden und dass erforderliche Hinweisschilder angebracht sind. Der
Auftragnehmer berät hierzu technisch, leistet jedoch **keine Rechtsberatung**.

### § 5 Preise und Zahlung

(1) Alle Preise verstehen sich in Euro [zzgl./inkl.] der jeweils gültigen
gesetzlichen Umsatzsteuer.

(2) Sofern nichts anderes vereinbart ist, sind Rechnungen **innerhalb von [14]
Tagen** ab Rechnungsdatum ohne Abzug zahlbar.

(3) Bei Aufträgen über [1.000] Euro ist der Auftragnehmer berechtigt, eine
Abschlagszahlung von bis zu [50] % des Auftragswerts bei Auftragserteilung sowie
Abschlagszahlungen nach Baufortschritt zu verlangen.

(4) Gerät der Auftraggeber in Zahlungsverzug, gelten die gesetzlichen
Verzugszinsen (§ 288 BGB).

### § 6 Ausführungsfristen

(1) Termine sind nur verbindlich, wenn sie ausdrücklich in Textform als
verbindlich bezeichnet wurden.

(2) Verzögerungen durch höhere Gewalt, Lieferengpässe, Streik oder von
Auftraggeberseite zu vertretende Umstände verlängern die Ausführungsfrist
angemessen.

### § 7 Abnahme

(1) Nach Fertigstellung erfolgt eine gemeinsame Abnahme. Der Auftragnehmer weist
in den Betrieb der Anlage ein und übergibt die zugehörige Dokumentation.

(2) Nimmt der Auftraggeber die Leistung in Gebrauch, ohne eine förmliche Abnahme
durchzuführen, gilt die Leistung nach Ablauf von [12] Werktagen ab Anzeige der
Fertigstellung als abgenommen (§ 640 Abs. 2 BGB).

### § 8 Eigentumsvorbehalt

Das gelieferte Material bleibt bis zur vollständigen Bezahlung Eigentum des
Auftragnehmers, soweit es nicht durch den Einbau wesentlicher Bestandteil des
Gebäudes geworden ist.

### § 9 Gewährleistung

(1) Es gelten die gesetzlichen Gewährleistungsrechte.

(2) Die Verjährungsfrist beträgt bei Bauwerken und Arbeiten an Bauwerken
**5 Jahre**, im Übrigen **2 Jahre** ab Abnahme.

(3) Der Auftraggeber hat erkennbare Mängel unverzüglich, spätestens innerhalb
von [14] Tagen nach Feststellung, in Textform anzuzeigen.

(4) Von der Gewährleistung ausgenommen sind Mängel, die auf normalem Verschleiß,
unsachgemäßer Bedienung, eigenmächtigen Änderungen des Auftraggebers oder
Dritter, Überspannung, Blitzschlag oder Softwareänderungen Dritter beruhen.

### § 10 Software, Updates und Fremdleistungen

(1) Auf den installierten Systemen kommt teilweise **quelloffene Software**
(z. B. Linux, Home Assistant, Docker) zum Einsatz. Für diese gelten die
jeweiligen Lizenzbedingungen der Hersteller; eine Gewährleistung des
Auftragnehmers für die Software selbst besteht nur im Rahmen der ordnungsgemäßen
Einrichtung.

(2) Der Auftragnehmer schuldet **keine dauerhafte Wartung, Aktualisierung oder
Verfügbarkeit**, sofern nicht ausdrücklich ein Wartungsvertrag geschlossen wurde.

(3) Der Auftragnehmer weist darauf hin, dass Aktualisierungen von Drittsoftware
das Verhalten der Anlage verändern können.

### § 11 Haftung

(1) Der Auftragnehmer haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit,
bei der Verletzung von Leben, Körper oder Gesundheit sowie nach dem
Produkthaftungsgesetz.

(2) Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten
(Kardinalpflichten) ist die Haftung auf den vertragstypischen, vorhersehbaren
Schaden begrenzt.

(3) Im Übrigen ist die Haftung ausgeschlossen.

(4) Der Auftragnehmer haftet nicht für Datenverlust, soweit dieser bei
ordnungsgemäßer, regelmäßiger Datensicherung durch den Auftraggeber vermeidbar
gewesen wäre.

(5) Eine Anlage zur Videoüberwachung oder Alarmierung stellt **keine Garantie
gegen Einbruch, Diebstahl oder sonstige Schäden** dar. Eine Einstandspflicht des
Auftragnehmers für solche Schäden besteht nicht.

### § 12 Widerrufsrecht für Verbraucher

Verbrauchern steht bei außerhalb von Geschäftsräumen geschlossenen Verträgen und
bei Fernabsatzverträgen ein gesetzliches Widerrufsrecht zu.

**Widerrufsbelehrung**

*Widerrufsrecht:* Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von
Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage
ab dem Tag des Vertragsabschlusses.

Um Ihr Widerrufsrecht auszuüben, müssen Sie uns ([FIRMENNAME], [Anschrift],
[Telefon], [E-Mail]) mittels einer eindeutigen Erklärung (z. B. ein mit der Post
versandter Brief oder eine E-Mail) über Ihren Entschluss, diesen Vertrag zu
widerrufen, informieren. Zur Wahrung der Widerrufsfrist reicht es aus, dass Sie
die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist
absenden.

*Folgen des Widerrufs:* Wenn Sie diesen Vertrag widerrufen, haben wir Ihnen alle
Zahlungen, die wir von Ihnen erhalten haben, unverzüglich und spätestens binnen
vierzehn Tagen ab dem Tag zurückzuzahlen, an dem die Mitteilung über Ihren
Widerruf bei uns eingegangen ist.

*Vorzeitiger Beginn der Leistung:* Haben Sie verlangt, dass die Dienstleistung
während der Widerrufsfrist beginnen soll, so haben Sie uns einen angemessenen
Betrag zu zahlen, der dem Anteil der bis zum Widerruf bereits erbrachten
Leistungen entspricht.

*Erlöschen des Widerrufsrechts:* Das Widerrufsrecht erlischt bei Verträgen über
die Lieferung von Waren, die nicht vorgefertigt sind und für deren Herstellung
eine individuelle Auswahl oder Bestimmung durch den Verbraucher maßgeblich ist
(z. B. individuell konstruierte 3D-Druck-Teile), sowie bei vollständig erbrachten
Dienstleistungen, wenn Sie dem vorzeitigen Beginn ausdrücklich zugestimmt und
Ihre Kenntnis vom Erlöschen des Widerrufsrechts bestätigt haben.

### § 13 Schlussbestimmungen

(1) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des
UN-Kaufrechts. Bei Verbrauchern gilt dies nur, soweit dadurch zwingende
Verbraucherschutzvorschriften des Aufenthaltsstaats nicht eingeschränkt werden.

(2) Ist der Auftraggeber Kaufmann, juristische Person des öffentlichen Rechts
oder öffentlich-rechtliches Sondervermögen, ist Gerichtsstand [Ort].

(3) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der
übrigen Bestimmungen unberührt.

**Stand:** [Datum eintragen]
`;
