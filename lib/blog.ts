// Blog-Beiträge. Neue Beiträge einfach als Objekt zu `posts` hinzufügen.
export interface Post {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // YYYY-MM-DD
  category: string;
  readingMinutes: number;
  imageCaption: string;
  image?: string; // optionales echtes Bild (/public)
  body: string[]; // Absätze
}

export const posts: Post[] = [
  {
    slug: "lokal-statt-cloud",
    title: "Warum lokal hosten besser ist als die Cloud",
    excerpt:
      "Monatliche Gebühren, fremde Server, ungewisse Datenwege — es geht auch anders. Wir zeigen, was ein eigener Server im Haus wirklich bringt.",
    date: "2026-06-10",
    category: "Datenschutz",
    readingMinutes: 4,
    imageCaption: "Foto: Heimserver im Wohnraum",
    image: "/server.webp",
    body: [
      "Die Cloud ist bequem — aber sie hat einen Preis: monatliche Gebühren, Werbung und Daten, die auf Servern fremder Konzerne liegen. Für viele Familien summiert sich das über die Jahre erheblich, ohne dass man je etwas „besitzt“.",
      "Ein eigener, stromsparender Server im Haus dreht das um. Fotos, Backups und Dienste laufen lokal — einmal sauber eingerichtet, dauerhaft Ihres. Keine Abos, keine Tracker, volle Kontrolle.",
      "Das Beste: Die Daten verlassen das Haus nicht. Was bei Ihnen entsteht, bleibt bei Ihnen — technisch erzwungen, nicht nur versprochen.",
    ],
  },
  {
    slug: "energie-sparen-smart-home",
    title: "5 Wege, mit smarter Technik Energie zu sparen",
    excerpt:
      "Intelligente Steuerung von Heizung und Licht senkt den Verbrauch spürbar — ganz ohne Komfortverlust. Unsere fünf wirksamsten Hebel.",
    date: "2026-06-03",
    category: "Energie",
    readingMinutes: 5,
    imageCaption: "Foto: smarte Heizungssteuerung",
    image: "/energie.webp",
    body: [
      "Energie sparen heißt nicht verzichten. Mit der richtigen Steuerung passt sich Ihr Zuhause an Ihren Alltag an — und verbraucht nur dann, wenn es nötig ist.",
      "Heizung nach Anwesenheit regeln, Licht bedarfsgerecht schalten, Standby-Verbraucher automatisch abschalten: kleine Maßnahmen mit großer Wirkung.",
      "Wie viel bei Ihnen drin ist, sehen Sie unverbindlich in unserem Strom-Spar-Rechner — und gemeinsam vor Ort noch genauer.",
    ],
  },
  {
    slug: "videoueberwachung-ohne-cloud",
    title: "Cloud-freie Videoüberwachung — einfach erklärt",
    excerpt:
      "Sehen, was rund ums Haus passiert, ohne dass Ihre Bilder ins Internet wandern. So funktioniert lokale KI-Erkennung auf dem eigenen Server.",
    date: "2026-05-26",
    category: "Sicherheit",
    readingMinutes: 4,
    imageCaption: "Foto: IP-Kamera am Gebäude",
    image: "/weg-sicherheit.webp",
    body: [
      "Klassische Kamera-Systeme schicken ihre Aufnahmen in die Cloud. Das ist praktisch — aber heikel: Ihre Bilder liegen woanders, und es kostet monatlich.",
      "Wir setzen auf offene Kameras (ONVIF/RTSP) und werten die Streams lokal auf Ihrem Server aus. Die KI erkennt Personen, Tiere und Fahrzeuge — direkt im Haus, ohne Cloud.",
      "Zusätzlich isolieren wir die Kameras in einem eigenen Netzwerk, das vom Internet getrennt ist. So bleiben Aufnahmen privat und vor Zugriffen geschützt.",
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
}
