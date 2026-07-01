import fs from "fs";
import path from "path";

// JSON-Datei-Store (wie novum). Liegt in DATA_DIR (Docker-Volume) oder ./data.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readJson<T>(file: string, fallback: T): T {
  try {
    ensureDir();
    const p = path.join(DATA_DIR, file);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(file: string, data: unknown): void {
  ensureDir();
  const p = path.join(DATA_DIR, file);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}

export type Role = "admin" | "editor";

export type Permission = "inquiries" | "users" | "settings" | "blog" | "backup" | "cookies";
export const ALL_PERMISSIONS: Permission[] = ["inquiries", "users", "settings", "blog", "backup", "cookies"];
export const PERMISSION_LABELS: Record<Permission, string> = {
  inquiries: "Anfragen",
  users: "Benutzer",
  settings: "KI & Einstellungen",
  blog: "Blog",
  backup: "Backup",
  cookies: "Cookies",
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
  createdAt: string;
  updatedAt: string;
}

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
export const readPosts = () => readJson<BlogPost[]>("blog.json", []);
export const writePosts = (p: BlogPost[]) => writeJson("blog.json", p);

// ── Einstellungen (inkl. KI-Konfiguration) ──
export interface AISettings {
  enabled: boolean;
  endpoint: string; // OpenAI-kompatibler Chat-Endpunkt (…/v1/chat/completions)
  apiKey: string; // nur serverseitig, nie an den Client
  model: string;
  systemPrompt: string; // Core-Prompt / Persönlichkeit
  temperature: number;
  maxTokens: number;
  greeting: string; // erste Bot-Nachricht im Chat
  fallback: string; // Antwort, wenn KI aus/nicht erreichbar
}

export interface Settings {
  siteName: string;
  ai: AISettings;
}

export const DEFAULT_SETTINGS: Settings = {
  siteName: "STUDIO//LOKAL",
  ai: {
    enabled: false,
    endpoint: "https://api.openai.com/v1/chat/completions",
    apiKey: "",
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
  return { ...DEFAULT_SETTINGS, ...s, ai: { ...DEFAULT_SETTINGS.ai, ...(s.ai || {}) } };
}
export const writeSettings = (s: Settings) => writeJson("settings.json", s);
