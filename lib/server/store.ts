import fs from "fs";
import path from "path";

// JSON-Datei-Store (wie novum). Liegt in DATA_DIR (Docker-Volume) oder ./data.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Schnelle DB-Schicht ──
// In-Memory-Cache (Lesezugriffe ohne Disk-I/O) + atomare Schreibvorgänge
// (temp-Datei + rename → nie halbe Dateien, auch bei parallelen Requests).
// Cache-Eintrag merkt sich die Datei-Änderungszeit: ändert ein ANDERER
// Node-Prozess (z. B. zweiter Worker) die Datei, wird sie neu gelesen —
// behebt u. a. "gelöschter Blog-Beitrag wird noch angezeigt".
const cache = new Map<string, { mtimeMs: number; data: unknown }>();

export function readJson<T>(file: string, fallback: T): T {
  try {
    ensureDir();
    const p = path.join(DATA_DIR, file);
    if (!fs.existsSync(p)) {
      cache.delete(file);
      return fallback;
    }
    const mtimeMs = fs.statSync(p).mtimeMs;
    const hit = cache.get(file);
    if (hit && hit.mtimeMs === mtimeMs) return hit.data as T;
    const val = JSON.parse(fs.readFileSync(p, "utf-8")) as T;
    cache.set(file, { mtimeMs, data: val });
    return val;
  } catch {
    return fallback;
  }
}

export function writeJson(file: string, data: unknown): void {
  ensureDir();
  const p = path.join(DATA_DIR, file);
  const tmp = `${p}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf-8");
  fs.renameSync(tmp, p); // atomarer Tausch
  cache.set(file, { mtimeMs: fs.statSync(p).mtimeMs, data });
}

// Alle bekannten Sammlungen — Grundlage für Statistik & Reset im Admin.
export const COLLECTIONS = {
  "users.json": "Benutzer",
  "inquiries.json": "Anfragen",
  "blog.json": "Blog-Beiträge",
  "reviews.json": "Bewertungen",
  "tickets.json": "Tickets",
  "chat.json": "Team-Chat",
  "orders.json": "Aufträge",
  "finance.json": "Finanzen",
  "audit.json": "Aktivitätslog",
  "invoices.json": "Rechnungen",
  "subscribers.json": "Blog-Abonnenten",
  "support.json": "Support-Tickets",
  "legal.json": "Rechtstexte & Kontakt",
  "settings.json": "Einstellungen",
} as const;
export type CollectionFile = keyof typeof COLLECTIONS;

export function collectionStats(): { file: CollectionFile; label: string; count: number; bytes: number }[] {
  ensureDir();
  return (Object.keys(COLLECTIONS) as CollectionFile[]).map((file) => {
    const p = path.join(DATA_DIR, file);
    const exists = fs.existsSync(p);
    const raw = readJson<unknown>(file, null);
    const count = Array.isArray(raw) ? raw.length : raw && typeof raw === "object" ? 1 : 0;
    return { file, label: COLLECTIONS[file], count, bytes: exists ? fs.statSync(p).size : 0 };
  });
}

// Sammlung zurücksetzen: Datei löschen + Cache leeren (Seed/Defaults greifen wieder).
export function resetCollection(file: CollectionFile): void {
  const p = path.join(DATA_DIR, file);
  if (fs.existsSync(p)) fs.unlinkSync(p);
  cache.delete(file);
}

export type Role = "admin" | "editor";

export type Permission =
  | "inquiries" | "users" | "settings" | "blog" | "backup" | "cookies"
  | "reviews" | "tickets" | "chat" | "orders" | "finance" | "activity" | "database" | "invoices"
  | "support" | "legal";
export const ALL_PERMISSIONS: Permission[] = [
  "inquiries", "users", "settings", "blog", "backup", "cookies",
  "reviews", "tickets", "chat", "orders", "finance", "activity", "database", "invoices",
  "support", "legal",
];
export const PERMISSION_LABELS: Record<Permission, string> = {
  inquiries: "Anfragen",
  users: "Benutzer",
  settings: "KI & Einstellungen",
  blog: "Blog",
  backup: "Backup",
  cookies: "Cookies",
  reviews: "Bewertungen",
  tickets: "Tickets",
  chat: "Team-Chat",
  orders: "Aufträge",
  finance: "Finanzen",
  activity: "Aktivität",
  database: "Datenbank",
  invoices: "Rechnungen",
  support: "Support-Tickets",
  legal: "Rechtstexte & Kontakt",
};
export type Permissions = Record<Permission, boolean>;
export const emptyPermissions = (): Permissions =>
  ALL_PERMISSIONS.reduce((a, p) => ({ ...a, [p]: false }), {} as Permissions);
export const fullPermissions = (): Permissions =>
  ALL_PERMISSIONS.reduce((a, p) => ({ ...a, [p]: true }), {} as Permissions);

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  permissions: Permissions;
  passwordHash: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  // ── 2FA (TOTP) ──
  // totpSecret existiert erst nach dem Einrichten; totpEnabled erst nach
  // erfolgreicher Bestätigung mit einem echten Code (verhindert Aussperren).
  totpSecret?: string;
  totpEnabled?: boolean;
  totpRecovery?: string[]; // SHA-256-Hashes der Wiederherstellungs-Codes
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string; // Markdown
  coverImage?: string;
  status: "draft" | "published";
  author: string;
  tags?: string[];
  seoDescription?: string;
  notifiedAt?: string; // wann Abonnenten benachrichtigt wurden
  createdAt: string;
  updatedAt: string;
}

// ── Blog-Abonnenten (kostenloses Abo mit Bestätigung) ──
export interface Subscriber {
  id: string;
  email: string;
  verified: boolean;
  token: string; // für Bestätigung & Abmeldung
  createdAt: string;
}
export const readSubscribers = () => readJson<Subscriber[]>("subscribers.json", []);
export const writeSubscribers = (s: Subscriber[]) => writeJson("subscribers.json", s);

export interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone?: string;
  topic?: string;
  building?: string;
  message: string;
  packages?: string[];
  status: "neu" | "gelesen" | "erledigt";
  createdAt: string;
}

// Alt-Datensätze ohne `permissions` nachrüsten (Admins bekommen alle Rechte).
export const readUsers = (): User[] =>
  readJson<User[]>("users.json", []).map((u) => ({
    ...u,
    permissions: u.permissions ? { ...emptyPermissions(), ...u.permissions } : (u.role === "admin" ? fullPermissions() : emptyPermissions()),
  }));
export const writeUsers = (u: User[]) => writeJson("users.json", u);
export const readInquiries = () => readJson<Inquiry[]>("inquiries.json", []);
export const writeInquiries = (i: Inquiry[]) => writeJson("inquiries.json", i);
// ── Blog ──
// Beiträge kommen ausschließlich aus dem Admin (keine vorgefertigten Seeds).
export const readPosts = () => readJson<BlogPost[]>("blog.json", []);
export const writePosts = (p: BlogPost[]) => writeJson("blog.json", p);

// ── Bewertungen (öffentlich abgebbar, im Admin moderierbar) ──
export interface Review {
  id: string;
  name: string;
  rating: number; // 1–5
  text: string;
  status: "offen" | "freigegeben" | "abgelehnt";
  createdAt: string;
  seal: string; // HMAC-Siegel — beweist, dass der Eintrag serverseitig & unverändert ist
  ipHash: string; // gehashte IP (Rate-Limit), niemals Klartext
  invoiceNumber: string; // zugehörige, im System registrierte Rechnung
  phase: InvoiceStatus; // Prozess-Status zum Zeitpunkt der Bewertung
  kind: "teil" | "end"; // Teilbewertung (laufend) oder Endbewertung (abgeschlossen)
}

// ── Rechnungen (registrieren gültige Rechnungsnummern fürs Bewertungssystem) ──
export type InvoiceStatus = "geplant" | "in_arbeit" | "abgeschlossen";
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  geplant: "Geplant",
  in_arbeit: "In Arbeit mit der Umsetzung",
  abgeschlossen: "Abgeschlossen",
};
export interface InvoiceItem {
  id: string;
  name: string; // Paket von der Website oder frei ("anders beschlossen")
  price: number; // € — je Position frei einstellbar
  sqm: number; // m² — 0 = ohne Flächenangabe
  custom: boolean; // true = eigenes Paket (nicht von der Website)
}

export interface Invoice {
  id: string;
  number: string; // z. B. RG-2026-001 — eindeutig
  customer: string;
  customerAddress?: string; // für die Druckansicht
  title: string; // Leistung
  items: InvoiceItem[]; // Positionen — amount ist die Summe
  amount: number; // €
  status: InvoiceStatus;
  createdAt: string;
  updatedAt: string;
}
// Alt-Datensätze ohne `items` nachrüsten.
export const readInvoices = (): Invoice[] =>
  readJson<Invoice[]>("invoices.json", []).map((i) => ({ ...i, items: i.items || [] }));
export const writeInvoices = (i: Invoice[]) => writeJson("invoices.json", i);
export const readReviews = () => readJson<Review[]>("reviews.json", []);
export const writeReviews = (r: Review[]) => writeJson("reviews.json", r);

// ── Tickets (interne Aufgaben) ──
export interface TicketComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: "niedrig" | "mittel" | "hoch";
  status: "offen" | "in_arbeit" | "erledigt";
  assignee: string;
  dueDate?: string; // YYYY-MM-DD
  comments: TicketComment[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
// Alt-Datensätze ohne `comments` nachrüsten.
export const readTickets = (): Ticket[] =>
  readJson<Ticket[]>("tickets.json", []).map((t) => ({ ...t, comments: t.comments || [] }));
export const writeTickets = (t: Ticket[]) => writeJson("tickets.json", t);

// ── Kunden-Support-Tickets (öffentlich erstellbar, per Nummer + Cookie einsehbar) ──
export type SupportStatus = "offen" | "in_bearbeitung" | "beantwortet" | "geschlossen";
export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  offen: "Offen",
  in_bearbeitung: "In Bearbeitung",
  beantwortet: "Beantwortet",
  geschlossen: "Geschlossen",
};
export interface SupportMessage {
  id: string;
  from: "kunde" | "team";
  text: string;
  createdAt: string;
}
export interface SupportTicket {
  id: string;
  number: string; // z. B. TS-2026-001 — öffentlich sichtbar
  tokenHash: string; // HMAC des geheimen Zugriffs-Tokens (Klartext nie gespeichert)
  name: string;
  email: string;
  subject: string;
  status: SupportStatus;
  ipHash: string; // gehasht (Rate-Limit/Missbrauch)
  messages: SupportMessage[];
  createdAt: string;
  updatedAt: string;
}
export const readSupport = (): SupportTicket[] =>
  readJson<SupportTicket[]>("support.json", []).map((t) => ({ ...t, messages: t.messages || [] }));
export const writeSupport = (t: SupportTicket[]) => writeJson("support.json", t);

// ── Editierbare Seiteninhalte: Kontaktdaten + Rechtstexte ──
// Kontaktfelder speisen Footer & Kontaktseite; Rechtstexte sind Markdown.
export interface SiteContent {
  companyName: string;
  email: string;
  phone: string;
  region: string;
  address: string; // mehrzeilig erlaubt
  footerNote: string;
  impressum: string; // Markdown
  datenschutz: string; // Markdown
  agb: string; // Markdown (optional)
}
export const DEFAULT_CONTENT: SiteContent = {
  companyName: "STUDIO//LOKAL",
  email: "kontakt@studio-lokal.de",
  phone: "+49 000 000000",
  region: "Ihre Region",
  address: "STUDIO//LOKAL\nMusterstraße 1\n00000 Musterstadt",
  footerNote: "Elektrohandwerk + lokale IT — cloud-frei, abofrei, Daten bleiben im Haus.",
  impressum:
    "## Impressum\n\nAngaben gemäß § 5 TMG\n\n**STUDIO//LOKAL**\nMusterstraße 1\n00000 Musterstadt\n\n**Kontakt:** kontakt@studio-lokal.de\n\n_Bitte im Admin-Bereich mit euren echten Angaben ersetzen._",
  datenschutz:
    "## Datenschutzerklärung\n\nWir verarbeiten personenbezogene Daten sparsam und lokal. Diese Seite setzt nur ein technisch notwendiges Sitzungs-Cookie im Admin-Bereich sowie — falls genutzt — ein Cookie zur Wiedererkennung eigener Support-Tickets.\n\n_Bitte im Admin-Bereich mit eurer echten Datenschutzerklärung ersetzen._",
  agb: "",
};
export function readContent(): SiteContent {
  return { ...DEFAULT_CONTENT, ...readJson<Partial<SiteContent>>("legal.json", {}) };
}
export const writeContent = (c: SiteContent) => writeJson("legal.json", c);

// ── Team-Chat ──
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}
export const readChat = () => readJson<ChatMessage[]>("chat.json", []);
export const writeChat = (m: ChatMessage[]) => writeJson("chat.json", m);

// ── Aufträge (Kundenprojekte) ──
export interface Order {
  id: string;
  customer: string;
  title: string;
  status: "angefragt" | "geplant" | "in_arbeit" | "abgeschlossen";
  value: number; // €
  notes: string;
  createdAt: string;
  updatedAt: string;
}
export const readOrders = () => readJson<Order[]>("orders.json", []);
export const writeOrders = (o: Order[]) => writeJson("orders.json", o);

// ── Finanzen (Einnahmen/Ausgaben) ──
export interface FinanceEntry {
  id: string;
  type: "einnahme" | "ausgabe";
  label: string;
  amount: number; // €
  date: string; // YYYY-MM-DD
  createdAt: string;
}
export const readFinance = () => readJson<FinanceEntry[]>("finance.json", []);
export const writeFinance = (f: FinanceEntry[]) => writeJson("finance.json", f);

// ── Aktivitätslog (Audit) ──
export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  detail: string;
  createdAt: string;
}
export const readAudit = () => readJson<AuditEntry[]>("audit.json", []);
export const writeAudit = (a: AuditEntry[]) => writeJson("audit.json", a);

// ── Einstellungen (inkl. KI-Konfiguration) ──
export interface AISettings {
  enabled: boolean;
  endpoint: string; // OpenAI-kompatibler Chat-Endpunkt (…/v1/chat/completions)
  apiKey: string; // nur serverseitig, nie an den Client
  apiKeyEnabled: boolean; // Key mitsenden ja/nein (deaktivieren ohne ihn zu löschen)
  requireApiKey: boolean; // true = Key ist Pflicht (Cloud-APIs); false = ohne Key (Ollama/LM Studio)
  model: string;
  systemPrompt: string; // Core-Prompt / Persönlichkeit
  temperature: number;
  maxTokens: number;
  greeting: string; // erste Bot-Nachricht im Chat
  fallback: string; // Antwort, wenn KI aus/nicht erreichbar
}

export interface ReviewSettings {
  enabled: boolean; // Bewertungen öffentlich abgebbar & sichtbar
  autoApprove: boolean; // true = sofort sichtbar, false = erst nach Freigabe
  maxPerDay: number; // Rate-Limit pro IP
}

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string; // nur serverseitig
  from: string;
}

export interface Settings {
  siteName: string;
  ai: AISettings;
  reviews: ReviewSettings;
  smtp: SmtpSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  siteName: "STUDIO//LOKAL",
  reviews: { enabled: true, autoApprove: false, maxPerDay: 3 },
  smtp: { host: "", port: 587, user: "", pass: "", from: "" },
  ai: {
    enabled: false,
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKey: "",
    apiKeyEnabled: true,
    requireApiKey: false,
    model: "gpt-4o-mini",
    systemPrompt:
      "Du bist der freundliche Support-Assistent von STUDIO//LOKAL, einem Betrieb für Elektrohandwerk + lokale IT (cloud-frei, abofrei, Daten bleiben im Haus). Antworte kurz, hilfsbereit und auf Deutsch. Verweise bei konkreten Anfragen auf das Kontaktformular. Erfinde keine Preise — Preise gibt es nur auf Anfrage.",
    temperature: 0.6,
    maxTokens: 500,
    greeting: "Hallo! 👋 Wie kann ich dir rund um Smart-Home, Server & Energie sparen helfen?",
    fallback: "Danke für deine Nachricht! Wir melden uns persönlich — am schnellsten über das Kontaktformular, per E-Mail oder telefonisch.",
  },
};

export function readSettings(): Settings {
  const s = readJson<Partial<Settings>>("settings.json", {});
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    ai: { ...DEFAULT_SETTINGS.ai, ...(s.ai || {}) },
    reviews: { ...DEFAULT_SETTINGS.reviews, ...(s.reviews || {}) },
    smtp: { ...DEFAULT_SETTINGS.smtp, ...(s.smtp || {}) },
  };
}
export const writeSettings = (s: Settings) => writeJson("settings.json", s);
