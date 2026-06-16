// Zentrale Dienstleistungs-Daten — genutzt von Navigation (Dropdown nach Kategorien),
// den Einzelseiten /leistungen/[slug] und dem Konfigurator inkl. Vorschau.
export type ServiceIcon = "camera" | "server" | "cube" | "bolt" | "shield";
export type CategoryKey = "smart-home" | "energie" | "server" | "hardware";

export interface Category {
  key: CategoryKey;
  label: string;
  description: string;
}

export const categories: Category[] = [
  { key: "smart-home", label: "Smart-Home & Sicherheit", description: "Überwachung und Steuerung, die im Haus bleibt." },
  { key: "energie", label: "Energie-Management", description: "Weniger verbrauchen, clever steuern." },
  { key: "server", label: "Server & Datenschutz", description: "Ihre Daten und Dienste lokal statt in der Cloud." },
  { key: "hardware", label: "3D-Druck & Hardware", description: "Passgenaue Lösungen, vor Ort gefertigt." },
];

export interface Service {
  slug: string;
  no: string;
  category: CategoryKey;
  title: string; // kurz (Nav, Karten)
  pageTitle: string; // Headline auf der Seite
  tagline: string;
  intro: string;
  points: string[]; // „Das ist dabei"
  outcomes: string[]; // „Ihr Vorteil"
  imageCaption: string; // Hauptbild (Platzhalter-Text)
  image?: string; // optionales echtes Hauptbild (/public)
  gallery: string[]; // weitere Bild-Slots
  icon: ServiceIcon;
}

export const services: Service[] = [
  {
    slug: "sicherheit-smart-home",
    no: "01",
    category: "smart-home",
    title: "Cloud-freie Videoüberwachung",
    pageTitle: "Cloud-freie Videoüberwachung & Smart Home",
    tagline: "Sehen, was zuhause passiert — ohne dass Ihre Bilder das Haus verlassen.",
    intro:
      "Wir verlegen die Technik sauber, montieren hochwertige Kameras und werten die Bilder lokal auf einem eigenen Server aus. Nichts wandert in die Cloud, und das Kameranetz ist vom Internet getrennt.",
    points: [
      "Saubere, physische Verlegung von Netzwerkkabeln (PoE) im und am Gebäude.",
      "Fachgerechte Montage hochwertiger IP-Kameras mit offenen Standards (ONVIF/RTSP).",
      "Lokale KI-Auswertung mit Home Assistant & Frigate — erkennt Personen, Tiere und Fahrzeuge, ganz ohne Cloud.",
      "Eigenes, vom Internet getrenntes Netzwerk (VLAN) für die Kameras — Schutz vor Hackerangriffen.",
    ],
    outcomes: [
      "Ihre Aufnahmen bleiben zu 100 % im Haus.",
      "Keine monatlichen Cloud-Gebühren.",
      "Schutz vor Hackerangriffen durch Netz-Trennung.",
    ],
    imageCaption: "Hauptbild — Kamera am Gebäude",
    image: "/weg-sicherheit.webp",
    gallery: ["Foto: saubere PoE-Verkabelung", "Foto: montierte IP-Kamera", "Foto: lokale Live-Ansicht"],
    icon: "camera",
  },
  {
    slug: "energie-management",
    no: "02",
    category: "energie",
    title: "Energie sparen",
    pageTitle: "Energie sparen mit smarter Haustechnik",
    tagline: "Heizung und Licht regeln sich clever — das senkt den Verbrauch.",
    intro:
      "Als Elektrotechniker für Gebäudetechnik richten wir eine intelligente Steuerung ein, die Ihre Energiekosten aktiv senkt. Alles läuft lokal über Ihren eigenen Server — ohne Cloud, ohne Abo.",
    points: [
      "Intelligente Steuerung von Heizung und Beleuchtung zur aktiven Senkung der Energiekosten.",
      "Lokale Automatisierung über Home Assistant — ganz ohne Cloud-Anbindung.",
      "Abgestimmt auf Ihren Alltag und Ihre vorhandene Gebäudetechnik.",
    ],
    outcomes: [
      "Spürbar weniger Energieverbrauch im Alltag.",
      "Mehr Komfort durch automatische Abläufe.",
      "Steuerung bleibt lokal und privat.",
    ],
    imageCaption: "Hauptbild — Thermostat / Steuerung",
    image: "/energie.webp",
    gallery: ["Foto: smarte Heizungssteuerung", "Foto: Beleuchtungs-Szene", "Foto: Energie-Übersicht"],
    icon: "bolt",
  },
  {
    slug: "eigener-server",
    no: "03",
    category: "server",
    title: "Eigener Heimserver",
    pageTitle: "Lokales Home Hosting & Datensicherheit",
    tagline: "Ihr eigener, sparsamer Server — die unabhängige Alternative zur Cloud.",
    intro:
      "Ein stromsparender Linux-Server bei Ihnen zuhause übernimmt, wofür andere monatlich Abos zahlen: private Foto-Backups und sichere Datensicherung — alles unter Ihrer Kontrolle, in isolierten Docker-Containern.",
    points: [
      "Aufbau und Einrichtung eines stromsparenden Linux-Servers, alle Dienste sicher getrennt in Docker.",
      "„Immich“ für automatische Foto-Backups Ihrer Smartphones über das WLAN — die private Alternative zu iCloud & Google Fotos.",
      "Ausfallsichere, lokale Backup-Strategie, die Ihre Daten dauerhaft vor Verlust schützt.",
    ],
    outcomes: [
      "Schluss mit Abo-Gebühren für die Cloud.",
      "Ihre Fotos & Daten sicher in Ihrer Hand.",
      "Kein Datenverlust dank Backups.",
    ],
    imageCaption: "Hauptbild — Heimserver",
    image: "/server.webp",
    gallery: ["Foto: Server im Schrank", "Foto: Docker-Übersicht", "Foto: Immich-App am Handy"],
    icon: "server",
  },
  {
    slug: "werbeschutz",
    no: "04",
    category: "server",
    title: "Werbe- & Trackerschutz",
    pageTitle: "Werbe- & Trackerschutz fürs ganze Haus",
    tagline: "Weniger Werbung, weniger Tracking — auf allen Geräten im Haus.",
    intro:
      "Ein netzwerkweiter Filter blockiert Werbung und Tracker, noch bevor sie geladen werden — auf jedem Gerät im Haus, sogar am Smart-TV. Läuft lokal auf Ihrem Server, ganz ohne Abo.",
    points: [
      "Installation netzwerkweiter Werbe- und Tracker-Blocker (Pi-hole oder AdGuard Home).",
      "Blockiert Werbung auf allen Endgeräten im Haus — inklusive Smart-TVs.",
      "Filtert, noch bevor die Werbung überhaupt geladen wird.",
    ],
    outcomes: [
      "Deutlich weniger Werbung & Tracking.",
      "Mehr Tempo und Privatsphäre im Netz.",
      "Wirkt auf allen Geräten, ohne Installation pro Gerät.",
    ],
    imageCaption: "Hauptbild — Netzwerk / Filter",
    gallery: ["Foto: Pi-hole Dashboard", "Foto: Router / Netzwerk", "Foto: werbefreier Smart-TV"],
    icon: "shield",
  },
  {
    slug: "3d-druck",
    no: "05",
    category: "hardware",
    title: "Maßgeschneiderter 3D-Druck",
    pageTitle: "Maßgeschneiderter 3D-Druck & Hardware",
    tagline: "Passgenaue Halterungen und Gehäuse — gefertigt für genau Ihre Räume.",
    intro:
      "Nicht alles gibt es von der Stange. Wir konstruieren und drucken individuelle Halterungen, Gehäuse und Adapter, die perfekt zu Ihren Gegebenheiten vor Ort passen — sauber, robust und durchdacht.",
    points: [
      "Konstruktion und 3D-Druck individueller Wand- und Deckenhalterungen für Kameras und Sensoren.",
      "Passgenaue Gehäuse für Server-Komponenten, Schaltschränke oder Steuerungszentralen.",
      "Schnelle Fertigung von Spezial-Adaptern und Problemlösern direkt vor Ort.",
    ],
    outcomes: [
      "Lösungen, die es im Handel nicht gibt.",
      "Saubere, unauffällige Montage.",
      "Perfekte Passform für Ihr Zuhause.",
    ],
    imageCaption: "Hauptbild — 3D-gedruckte Halterung",
    image: "/druck.webp",
    gallery: ["Foto: 3D-Drucker bei der Arbeit", "Foto: fertiges Bauteil", "Foto: montiertes Ergebnis"],
    icon: "cube",
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function servicesByCategory(): { category: Category; items: Service[] }[] {
  return categories
    .map((category) => ({ category, items: services.filter((s) => s.category === category.key) }))
    .filter((g) => g.items.length > 0);
}
