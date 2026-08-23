---
name: shannon-security
description: Interner Security-Reviewer gegen OWASP Top 10. Nutzen bei jeder neuen/geänderten API-Route (app/api/**/route.ts), Auth-Logik oder Formular-Eingabe — vor dem Abschluss der Aufgabe.
---

# Shannon Security Review

Dies ist eine **Review-Checkliste**, kein autonomer Pentest-Agent und keine ausführende
Komponente. Sie prüft Code, der in dieser Session geschrieben/geändert wurde — sie sucht
nicht eigenständig nach Zielen, sendet keine Requests gegen fremde Systeme und installiert
nichts nach.

## Pflicht-Check vor Abschluss jeder neuen/geänderten API-Route
Gegen `app/api/**/route.ts` prüfen:

1. **Auth/Broken Access Control** — nutzt die Route `requirePermission()`/`requireAdmin()`
   aus `lib/server/auth.ts`, wo Daten nutzerspezifisch oder admin-only sind? Öffentliche
   Routen (`/api/chat`, `/api/reviews`, `/api/inquiries`, `/api/blog/subscribe`) müssen das
   bewusst NICHT tun — das ist kein Fund, sondern Design.
2. **Injection** — Eingaben werden nie roh in `eval`, `child_process`, Dateipfade oder
   HTML eingesetzt. Dieses Projekt hat keine SQL-DB (JSON-Store), daher kein klassisches
   SQLi-Risiko — stattdessen prüfen: Pfad-Traversal bei Datei-Reads (siehe
   `app/api/uploads/[name]/route.ts` — Regex-Filter auf den Dateinamen ist Pflicht).
3. **XSS** — jeder Ort, an dem Nutzereingaben als HTML gerendert werden
   (`dangerouslySetInnerHTML`, `lib/markdown.ts`) muss escapen/sanitisieren. Neue
   `<img>`/`<a>`-Ziele aus Markdown nur über `safeUrl()`-artige Whitelists (http/https/
   mailto/tel/relative), nie `javascript:`/`data:` durchlassen.
4. **CSRF** — state-changing Routen (`POST`/`PATCH`/`DELETE`) müssen auf das
   `sl_session`-Cookie (`SameSite=Lax`, `HttpOnly`) angewiesen sein, nicht auf reine
   Referer-Prüfung. Keine Cross-Origin-Formulare zu diesen Endpunkten zulassen.
5. **Rate Limiting / Missbrauch** — jede neue öffentliche `POST`-Route braucht
   `rateLimit()` aus `lib/server/ratelimit.ts` (Vorbild: `/api/chat`, `/api/blog/subscribe`,
   `/api/inquiries`).
6. **Secrets** — kein Secret/API-Key im Client-Bundle oder in Logs. `SESSION_SECRET`-
   Fallback-Verhalten aus `lib/server/auth.ts` nicht schwächen.
7. **Fehlerausgabe** — Fehlermeldungen an den Client dürfen keine Stacktraces oder
   interne Pfade enthalten.

## Auth-Bibliothek — Zukunftspfad
Aktuell: eigene bcrypt-Hashes (Cost 12) + HMAC-signierte httpOnly-Session-Cookies
(`lib/server/auth.ts`) — kein Auth.js/Lucia/Clerk. Das ist kein Fund, solange die Punkte
oben (Cookie-Flags, Rate-Limit auf Login, serverseitige Autorisierung) eingehalten werden.
Falls das Projekt je auf eine Standard-Lösung wechselt: **Auth.js (NextAuth)** oder
**Lucia** sind die naheliegenden Kandidaten (Session-Modell ähnlich genug zum jetzigen
Cookie-Ansatz für eine schrittweise Migration); nicht eigenmächtig einführen, das ist eine
explizite Architekturentscheidung des Nutzers.

## Wenn eine Anforderung nicht erfüllt ist
Nicht stillschweigend weiterbauen — die Lücke benennen (Datei + Zeile + Angriffsszenario)
und entweder sofort fixen oder den Nutzer explizit fragen, bevor die Aufgabe als
abgeschlossen gilt.

## Ausdrücklich außerhalb dieses Skills
Kein Ausführen von Exploit-Code, kein Scannen fremder/Produktions-Ziele, kein
automatisches Nachinstallieren von Drittanbieter-„Pentester"-Agents — das bleibt eine
explizite Nutzerentscheidung außerhalb dieses Skills.
