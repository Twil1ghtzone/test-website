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

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  active: boolean;
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

export const readUsers = () => readJson<User[]>("users.json", []);
export const writeUsers = (u: User[]) => writeJson("users.json", u);
export const readInquiries = () => readJson<Inquiry[]>("inquiries.json", []);
export const writeInquiries = (i: Inquiry[]) => writeJson("inquiries.json", i);
