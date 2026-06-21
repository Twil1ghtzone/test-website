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

## Plug-and-play auf einem anderen Server (vorgebautes Image)

Bei jedem Push auf `main` baut GitHub Actions automatisch ein Docker-Image und
legt es in die GitHub Container Registry: `ghcr.io/twil1ghtzone/test-website:latest`
(inkl. aller Bilder/Assets — alles ist im Image enthalten).

**Einmalig:** Paket öffentlich schalten, damit der Server ohne Login ziehen kann:
GitHub → Repo → rechts „Packages" → `test-website` → *Package settings* →
*Change visibility* → **Public**.
(Alternativ am Server: `echo <TOKEN> | docker login ghcr.io -u twil1ghtzone --password-stdin`.)

**Auf dem Server** nur diese eine Datei brauchen — [`docker-compose.prod.yml`](docker-compose.prod.yml):

```bash
# Datei auf den Server kopieren, dann:
docker compose -f docker-compose.prod.yml up -d
```

Erreichbar unter `http://<server-ip>:3000`. Update später einfach mit:

```bash
docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d
```

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

## Admin-Bereich (`/admin`)

Sicheres Admin-Panel mit JSON-Datenbank (Volume `studio-lokal-data`).

- **Erststart-Login:** `admin` / `test1234` (wird beim allerersten Start automatisch angelegt). **Bitte sofort ändern.**
- **Sicherheit:** Passwörter nur als **bcrypt-Hash** (Cost 12), HMAC-signierte httpOnly-Session-Cookies, Login-Rate-Limit, serverseitige Autorisierung aller Admin-APIs.
- **Funktionen:** Benutzer anlegen/bearbeiten/löschen (Rollen admin/editor, aktiv/inaktiv, Passwort ändern) · Anfragen-Posteingang (Kontaktformular landet hier, Status & Löschen).
- **Wichtig in Produktion:** `SESSION_SECRET` setzen (siehe `.env.example` / `docker-compose.yml`).

### KI-Assistent & weitere Admin-Funktionen
- **KI-Support (echt):** Im Admin unter „KI & Einstellungen" einen **OpenAI-kompatiblen Endpunkt**, Modell, **Core-Prompt**, Temperatur, Max-Tokens, Begrüßung & Fallback einstellen. Der API-Key bleibt **serverseitig** (wird nie an den Browser gesendet). Der Support-Chat unten rechts nutzt diese KI live; ist sie aus/leer, kommt der Fallback-Text.
- **Verschlüsseltes Backup:** Tab „Backup" → Passphrase wählen → komplette Daten (Benutzer, Anfragen, Einstellungen) als **AES-256-GCM**-Datei (`.slbak`) herunterladen und jederzeit wieder importieren.
- **Rechte:** „KI & Einstellungen" und „Backup" sind nur für Rolle **admin** sichtbar/erlaubt (serverseitig erzwungen).
- Die öffentliche Navigation/Fußzeile/Support-Bubble erscheinen **nicht** im Admin-Bereich.
