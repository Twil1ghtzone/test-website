// Zentrale Inhalte der Website. Marke = Platzhalter, leicht austauschbar.
// Sprache: klar und verständlich für jedes Alter. Fokus: Energie sparen,
// unabhängig werden, keine Abos, Daten bleiben zuhause.
export const brand = {
  name: "STUDIO//LOKAL",
  nameShort: "S//L",
  tagline: "Elektrohandwerk + IT aus einer Hand",
  email: "kontakt@studio-lokal.de",
  phone: "+49 000 000000",
  region: "Ihre Region",
};

// Werte-Band (keine erfundenen Zahlen — verständliche Versprechen)
export const values = [
  { value: "Weniger", label: "Energiekosten im Alltag" },
  { value: "0 €", label: "monatliche Gebühren" },
  { value: "Privat", label: "Ihre Daten bleiben im Haus" },
  { value: "Unabhängig", label: "von Cloud & Konzernen" },
];

// Hero
export const hero = {
  eyebrow: "Elektrohandwerk + IT aus einer Hand",
  // *Wort* wird kursiv/akzentuiert dargestellt
  titleLead: "Ein Zuhause, das spart —",
  titleEmph: "und Ihnen gehört.",
  body:
    "Wir verbinden sauberes Elektrohandwerk mit moderner Technik. So entsteht ein Zuhause, das Energie spart, Ihre Daten schützt und ganz ohne monatliche Gebühren funktioniert. Verständlich erklärt, sauber installiert.",
  ctaPrimary: "Unverbindlich anfragen",
  ctaSecondary: "So arbeiten wir",
  imageCaption: "Platzhalter — Foto: Installation vor Ort",
};

// Über uns / unser Team — bewusst nicht auf einzelne Personen zugeschnitten,
// sondern auf die Bandbreite der Fachbereiche, die aus einer Hand kommen.
export const about = {
  eyebrow: "Über uns",
  titleLead: "Mehrere Gewerke,",
  titleEmph: "ein",
  titleTail: "eingespieltes Team.",
  body:
    "Unser Betrieb bündelt mehrere Fachbereiche, die sonst einzeln beauftragt werden müssten: Elektrotechnik, IT-Infrastruktur, Smart-Home-Integration und individuelle Fertigung per 3D-Druck. Für Sie bedeutet das eine durchgängige Betreuung aus einer Hand — von der Planung über die fachgerechte Installation bis zum eingerichteten, dokumentierten System. Klar erklärt, verlässlich umgesetzt.",
  imageCaption: "Werkstatt: Werkzeug, Material und Technik an einem Ort",
  image: "/about-werkstatt.webp",
  imageAlt: "Werkbank mit Werkzeugwand, Kabelrollen, 3D-gedruckten Halterungen und einem Laptop mit Netzwerk-Dashboard",
  roles: [
    {
      role: "Elektrotechnik",
      sub: "Gebäudetechnik & Verkabelung",
      body: "Planung, Verkabelung und fachgerechte Montage — saubere Ausführung nach anerkannten Regeln der Technik.",
      imageCaption: "Verdrahtung im Schaltschrank",
      image: "/rolle-elektro.webp",
      imageAlt: "Hände mit Arbeitshandschuhen verdrahten Reihenklemmen in einem Schaltschrank mit DGUV-V3-Prüfplakette",
    },
    {
      role: "IT & Netzwerke",
      sub: "Server & Datensicherheit",
      body: "Server, Netzwerk-Trennung und Datensicherheit — sicher konfiguriert, verständlich dokumentiert und langfristig wartbar.",
      imageCaption: "Netzwerk-Rack, sauber gepatcht",
      image: "/rolle-it.webp",
      imageAlt: "Wandmontiertes Netzwerk-Rack mit farblich sortierten Patchkabeln, Switch, NAS und Mini-Server",
    },
    {
      role: "Smart-Home-Integration",
      sub: "Automatisierung im Alltag",
      body: "Lokale Automatisierung für Heizung, Licht und Kameras — spürbar mehr Komfort, ganz ohne Cloud-Anbindung.",
      imageCaption: "Steuerung, die im Alltag mitdenkt",
      image: "/rolle-smarthome.webp",
      imageAlt: "Hand stellt ein rundes Smart-Home-Thermostat an der Wohnzimmerwand auf 22 Grad",
    },
    {
      role: "3D-Druck & Fertigung",
      sub: "Individuelle Lösungen",
      body: "Passgenaue Halterungen, Gehäuse und Adapter — konstruiert und gedruckt für genau Ihre Räume.",
      imageCaption: "Fertigung in der eigenen Werkstatt",
      image: "/rolle-3ddruck.webp",
      imageAlt: "3D-Drucker fertigt eine blaue Wandhalterung, daneben Filamentrolle und Werkzeug",
    },
  ],
};

// Drei Wege / Leistungs-Überblick (wie „Choose your path")
// `more` = Zusatztext beim Aufklappen, `link` = farblich hervorgehobener Weiterleitungs-Link.
export const paths = [
  {
    no: "01",
    title: "Sicherheit & Smart Home",
    body: "Sehen, was rund ums Haus passiert — ohne dass Ihre Bilder ins Internet wandern. Heizung und Licht steuern sich clever und sparen Energie.",
    more: "Hochwertige Kameras, sauber verkabelt, mit lokaler KI-Erkennung auf Ihrem eigenen Server — und einem vom Internet getrennten Netzwerk gegen Hackerangriffe.",
    link: { label: "Alles zu Sicherheit & Smart Home", href: "/leistungen/sicherheit-smart-home" },
    imageCaption: "Platzhalter — Foto: Kamera / Smart Home",
    image: "/weg-sicherheit.webp",
  },
  {
    no: "02",
    title: "Ihr eigener Server",
    body: "Fotos, Backups und ein Werbeblocker fürs ganze Haus — auf einem sparsamen Gerät bei Ihnen daheim, statt in teuren Cloud-Abos.",
    more: "Ein stromsparender Linux-Server übernimmt private Foto-Backups (statt iCloud & Google) und sichert Ihre Daten ausfallsicher — alles in Ihrer Hand.",
    link: { label: "Alles zum eigenen Heimserver", href: "/leistungen/eigener-server" },
    imageCaption: "Platzhalter — Foto: Heimserver",
    image: "/weg-server.webp",
  },
  {
    no: "03",
    title: "Maßanfertigung per 3D-Druck",
    body: "Passgenaue Halterungen und Gehäuse, gefertigt für genau Ihre Räume — auch dann, wenn es das im Handel nicht gibt.",
    more: "Wir konstruieren und drucken individuelle Halterungen, Gehäuse und Adapter — perfekt an Ihre Gegebenheiten vor Ort angepasst.",
    link: { label: "Alles zu 3D-Druck & Hardware", href: "/leistungen/3d-druck" },
    imageCaption: "Platzhalter — Foto: 3D-Druck",
    image: "/weg-3ddruck.webp",
  },
];

// Detaillierte Leistungen (die 3 Säulen, faktentreu)
export const pillars = [
  {
    no: "01",
    kicker: "Leistung 01",
    title: "Cloud-freie Videoüberwachung & Smart Home",
    intro:
      "Überwachung, die im Haus bleibt — und Technik, die im Alltag Energie spart.",
    points: [
      "Saubere, physische Verlegung von Netzwerkkabeln (PoE) im und am Gebäude.",
      "Fachgerechte Montage hochwertiger IP-Kameras mit offenen Standards (ONVIF/RTSP).",
      "Lokale KI-Auswertung der Streams über einen eigenen Server mit Home Assistant & Frigate — erkennt Personen, Tiere und Fahrzeuge, ganz ohne Cloud.",
      "Absicherung durch ein eigenes, vom Internet getrenntes Netzwerk (VLAN) für die Kameras — Schutz vor Hackerangriffen.",
      "Intelligente Steuerung von Heizung und Beleuchtung, die aktiv Ihre Energiekosten senkt.",
    ],
    imageCaption: "Saubere PoE-Verlegung bis in den Technikraum",
    image: "/pillar-verkabelung.webp",
    imageAlt: "Sorgfältig gebündelte Netzwerkkabel unter einer Kellerdecke führen zu einem Wandverteiler und einem Rack",
  },
  {
    no: "02",
    kicker: "Leistung 02",
    title: "Lokales Home Hosting & Datensicherheit",
    intro:
      "Ihr eigener, sparsamer Server — die unabhängige Alternative zur Cloud.",
    points: [
      "Aufbau und Einrichtung eines stromsparenden Linux-Servers, auf dem alle Dienste sicher und getrennt laufen (Docker).",
      "„Immich“ für automatische Foto-Backups Ihrer Smartphones über das WLAN — die private Alternative zu iCloud und Google Fotos, ganz ohne Abo.",
      "Werbe- und Tracker-Blocker fürs ganze Haus (Pi-hole / AdGuard Home) — blockiert Werbung auf allen Geräten, sogar am Smart-TV.",
      "Ausfallsichere Backups, die Ihre Daten dauerhaft vor Verlust schützen.",
    ],
    imageCaption: "Stromsparender Linux-Server im Wandschrank",
    image: "/pillar-server.webp",
    imageAlt: "Lüfterloser schwarzer Linux-Server mit grüner Status-LED auf einem Einlegeboden unter einem Patchpanel",
  },
  {
    no: "03",
    kicker: "Leistung 03",
    title: "Maßgeschneiderter 3D-Druck & Hardware",
    intro:
      "Passgenaue Lösungen, gefertigt für genau Ihre Gegebenheiten vor Ort.",
    points: [
      "Konstruktion und 3D-Druck individueller Wand- und Deckenhalterungen für Kameras und Sensoren.",
      "Passgenaue Gehäuse für Server-Komponenten, Schaltschränke oder Steuerungszentralen.",
      "Schnelle Fertigung von Spezial-Adaptern und Problemlösern direkt vor Ort — auch dann, wenn es das im Handel nicht gibt.",
    ],
    imageCaption: "Halterung, gedruckt für genau diese Wand",
    image: "/pillar-halterung.webp",
    imageAlt: "Überwachungskamera auf einer passgenau 3D-gedruckten Halterung an einer Ziegelwand",
  },
];

// Featured Highlight (Energie / Unabhängigkeit)
export const featured = {
  eyebrow: "Warum lokal?",
  title: "Energie sparen. Unabhängig werden.",
  body:
    "Jeden Monat Gebühren für die Cloud, Werbung auf jedem Bildschirm, Daten auf fremden Servern — das muss nicht sein. Wir richten Ihr Zuhause so ein, dass die Technik Ihnen dient: weniger Verbrauch, keine Abos, volle Kontrolle. Einmal sauber gemacht, dauerhaft Ihres.",
  bullets: [
    "Heizung & Licht steuern sich clever — das senkt den Verbrauch.",
    "Keine monatlichen Cloud-Gebühren mehr.",
    "Ihre Fotos und Daten bleiben sicher im Haus.",
  ],
  imageCaption: "Wohnraum am Abend — Licht als Szene statt als Schalter",
  image: "/licht-szene.webp",
  imageAlt: "Warm beleuchtetes Wohnzimmer am Abend mit indirekter Deckenbeleuchtung, Pendelleuchten und Regalbeleuchtung",
};

// Ablauf
export const process = [
  { step: "01", title: "Gespräch & Besichtigung", body: "Wir hören zu und sehen uns alles vor Ort an. Jedes Haus ist anders." },
  { step: "02", title: "Konzept & Angebot", body: "Eine Lösung, die zu Ihnen passt — mit einem klaren Angebot auf Anfrage." },
  { step: "03", title: "Installation", body: "Sauberes Handwerk und Technik-Einrichtung, koordiniert aus einer Hand." },
  { step: "04", title: "Übergabe & Erklärung", body: "Wir zeigen Ihnen alles in Ruhe. Danach läuft es — ohne Abo, ohne Cloud." },
];

export const contact = {
  eyebrow: "Kontakt",
  title: "Sprechen wir über Ihr Zuhause.",
  body:
    "Jedes Haus ist anders — feste Pakete gibt es bei uns deshalb nicht. Erzählen Sie uns kurz, was Sie sich wünschen. Wir melden uns persönlich und erstellen ein unverbindliches Angebot.",
  topics: [
    "Sicherheit & Smart Home",
    "Eigener Server / Datensicherheit",
    "3D-Druck & Hardware",
    "Allgemeine Anfrage",
  ],
};
