# STUDIO//LOKAL — Website

Next.js 16 (App Router) · React 19 · Tailwind v4 · TypeScript.
Marketing-Website für ein IT-/Smart-Home-Duo: cloud-frei, abofrei, lokal.

> Markenname an **einer** Stelle änderbar: `brand.name` in [`lib/data.ts`](lib/data.ts).
> Alle Inhalte liegen in `lib/data.ts` und `lib/services.ts`.

## Lokale Entwicklung

```bash
npm install
npm run dev          # http://localhost:3000
```

Production-Build prüfen:

```bash
npm run build && npm run start
```

## Mit Docker starten (Node.js)

Voraussetzung: Docker Desktop läuft.

```bash
# Bauen & starten
docker compose up -d --build

# Logs ansehen
docker compose logs -f

# Stoppen
docker compose down
```

Danach erreichbar unter **http://localhost:3000**.

Ohne Compose (nur Docker):

```bash
docker build -t studio-lokal .
docker run -p 3000:3000 studio-lokal
```

Das Image nutzt den schlanken **standalone**-Output von Next.js (Multi-Stage-Build,
läuft als nicht-root-User).

## Öffentlich testen (Deployment)

**Variante A — Vercel (am einfachsten, kein Docker nötig):**
1. Repo zu GitHub pushen (siehe unten).
2. Auf [vercel.com](https://vercel.com) mit GitHub anmelden → „New Project" → Repo wählen → Deploy.
   Next.js wird automatisch erkannt; nichts zu konfigurieren.

**Variante B — Server / VPS mit Docker:**
1. Repo auf den Server klonen.
2. `docker compose up -d --build`.
3. Optional einen Reverse-Proxy (Caddy/Nginx) für Domain + HTTPS davor setzen.

**Variante C — schneller öffentlicher Test vom eigenen Rechner:**
```bash
docker compose up -d --build
npx localtunnel --port 3000     # oder: cloudflared tunnel --url http://localhost:3000
```
Gibt eine öffentliche URL aus (nur für kurze Tests).

## Git / GitHub

```bash
# (einmalig) Repo ist bereits initialisiert und committet.
git remote add origin https://github.com/<DEIN-USER>/<REPO>.git
git branch -M main
git push -u origin main
```
Erst auf github.com ein leeres Repository anlegen, dann obige URL einsetzen.
