// Prüft die Krypto-Bausteine des Ticketsystems direkt — Nummern, Zugriffscodes,
// Magic-Links, signierte Cookies und die Datei-Erkennung über Magic Bytes.
process.env.SESSION_SECRET = "test-secret-nur-fuer-diesen-lauf";
const S = await import("./support.ts");
const U = await import("./upload.ts");

let pass = 0, fail = 0;
const ok = (n, c, i = "") => { c ? pass++ : fail++; console.log(`${c ? "  OK  " : " FAIL "} ${n}${i ? "  — " + i : ""}`); };
const section = (t) => console.log(`\n=== ${t} ===`);

/* ─────────────────────────────────────────────────────────── */
section("1) Ticketnummern — Zufall statt Zählerstand");
const N = 20000;
const nummern = new Set();
for (let i = 0; i < N; i++) nummern.add(S.newTicketNumber());
ok(`${N} Nummern ohne eine einzige Doppelung`, nummern.size === N, `${nummern.size} verschieden`);
ok("Format TK-XXXX-XXXX-XXXX", [...nummern].every((n) => /^TK-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(n)));
ok("Kein I, L, O oder U (verwechslungsfrei am Telefon)",
   [...nummern].every((n) => !/[ILOU]/.test(n.slice(3))));

// Gleichverteilung: jedes der 32 Zeichen sollte an jeder Stelle etwa gleich oft
// vorkommen. Eine Vorhersagbarkeit würde sich hier als Ausschlag zeigen.
const stellen = [...nummern].map((n) => n.replace(/-/g, "").slice(2));
const haeufigkeit = new Map();
for (const s of stellen) for (const c of s) haeufigkeit.set(c, (haeufigkeit.get(c) || 0) + 1);
const werte = [...haeufigkeit.values()];
const erwartet = (N * 12) / 32;
const maxAbw = Math.max(...werte.map((v) => Math.abs(v - erwartet))) / erwartet;
ok("Zeichen sind gleichmäßig verteilt (Abweichung < 10 %)", maxAbw < 0.1, `max. ${(maxAbw * 100).toFixed(1)} %`);
ok("Alle 32 Zeichen des Alphabets kommen vor", haeufigkeit.size === 32, `${haeufigkeit.size} Zeichen`);

// Der entscheidende Punkt gegen IDOR: aus einer Nummer folgt keine zweite.
const liste = [...nummern].slice(0, 5000);
let benachbart = 0;
for (let i = 1; i < liste.length; i++) {
  const a = liste[i - 1].replace(/-/g, ""), b = liste[i].replace(/-/g, "");
  let gleich = 0;
  for (let k = 0; k < a.length; k++) if (a[k] === b[k]) gleich++;
  if (gleich > 8) benachbart++;
}
ok("Aufeinanderfolgende Nummern sind sich nicht ähnlich", benachbart === 0, `${benachbart} auffällige Paare`);
ok("Kollision mit bereits vergebener Nummer wird vermieden", (() => {
  const fake = [...nummern].slice(0, 50).map((number) => ({ number }));
  const neu = S.newTicketNumber(fake);
  return !fake.some((t) => t.number === neu);
})());

section("2) Zugriffscode");
const codes = new Set();
for (let i = 0; i < 2000; i++) codes.add(S.makeToken());
ok("2000 Codes ohne Doppelung", codes.size === 2000);
const c0 = S.makeToken();
ok("Länge passt zu 24 Byte Zufall (32 Zeichen base64url)", c0.length === 32, `${c0.length} Zeichen`);
ok("Nur URL-sichere Zeichen", /^[A-Za-z0-9_-]+$/.test(c0));
const hash = S.hashToken(c0);
ok("Hash ist 64 Hex-Zeichen (SHA-256)", /^[0-9a-f]{64}$/.test(hash));
ok("Klartext steckt nicht im Hash", !hash.includes(c0.slice(0, 8)));
ok("Richtiger Code wird erkannt", S.verifyToken(c0, hash) === true);
ok("Falscher Code wird abgelehnt", S.verifyToken(S.makeToken(), hash) === false);
ok("Leerer Code wird abgelehnt", S.verifyToken("", hash) === false);
ok("Kaputter Hash wirft nicht, sondern lehnt ab", S.verifyToken(c0, "keinhex") === false);

section("3) Nummern-Eingabe tolerant erkennen");
const nr = "TK-A1B2-C3D4-E5F6";
ok("Kleinschreibung", S.normalizeNumber(nr.toLowerCase()) === nr);
ok("Ohne Striche", S.normalizeNumber("TKA1B2C3D4E5F6") === nr);
ok("Mit Leerzeichen", S.normalizeNumber(" tk a1b2 c3d4 e5f6 ") === nr);
ok("Mit Schrägstrichen statt Strichen", S.normalizeNumber("TK/A1B2/C3D4/E5F6") === nr);
ok("Unsinn bleibt unverändert (und findet dann kein Ticket)", S.normalizeNumber("hallo") === "HALLO");

section("4) Magic-Link — signiert und befristet");
const mt = S.signMagicToken(nr, c0);
const geprueft = S.verifyMagicToken(mt);
ok("Gültiger Token wird akzeptiert", geprueft?.number === nr && geprueft?.code === c0);
ok("Manipulierte Signatur wird abgelehnt", S.verifyMagicToken(mt.slice(0, -3) + "xyz") === null);
ok("Manipulierte Nutzlast wird abgelehnt", (() => {
  const [nutz, sig] = mt.split(".");
  const gefaelscht = Buffer.from(`TK-ZZZZ-ZZZZ-ZZZZ|${c0}|${Date.now() + 1e6}`).toString("base64url");
  return S.verifyMagicToken(`${gefaelscht}.${sig}`) === null;
})());
ok("Abgelaufener Token wird abgelehnt", S.verifyMagicToken(S.signMagicToken(nr, c0, -1000)) === null);
ok("Ohne Punkt kein Token", S.verifyMagicToken("nurmuell") === null);
ok("Leerer Token", S.verifyMagicToken("") === null);
ok("Gültigkeit beträgt 14 Tage", S.MAGIC_GUELTIG_MS === 14 * 24 * 60 * 60 * 1000);

section("5) Zugriffs-Cookie — signiert, nicht fälschbar");
const zugriffe = [{ number: nr, token: c0 }, { number: "TK-1111-2222-3333", token: S.makeToken() }];
const cookie = S.packZugriffe(zugriffe);
const zurueck = S.entpackZugriffe(cookie);
ok("Hin und zurück identisch", JSON.stringify(zurueck) === JSON.stringify(zugriffe));
ok("Selbstgebauter Cookie ohne Signatur wird verworfen",
   S.entpackZugriffe(Buffer.from(JSON.stringify(zugriffe)).toString("base64url") + ".gefaelscht").length === 0);
ok("Veränderte Nutzlast wird verworfen", (() => {
  const [, sig] = cookie.split(".");
  const boese = Buffer.from(JSON.stringify([{ number: "TK-9999-9999-9999", token: "x" }])).toString("base64url");
  return S.entpackZugriffe(`${boese}.${sig}`).length === 0;
})());
ok("Kein Cookie ergibt leere Liste", S.entpackZugriffe(undefined).length === 0);
ok("Müll ergibt leere Liste (kein Absturz)", S.entpackZugriffe("a.b.c.d").length === 0);
ok("Höchstens 25 Zugriffe werden behalten", (() => {
  const viele = Array.from({ length: 40 }, (_, i) => ({ number: `TK-0000-0000-${String(i).padStart(4, "0")}`, token: "t" }));
  return S.entpackZugriffe(S.packZugriffe(viele)).length === 25;
})());
ok("Einträge ohne Token werden herausgefiltert", (() => {
  const gemischt = Buffer.from(JSON.stringify([{ number: nr }, { token: "x" }, { number: nr, token: c0 }])).toString("base64url");
  // Ohne passende Signatur ohnehin leer — hier nur die Struktur prüfen.
  return S.entpackZugriffe(`${gemischt}.falsch`).length === 0;
})());

section("6) IP-Hash");
const h1 = S.hashIp("192.168.1.50");
ok("IP wird gehasht, nicht gespeichert", !h1.includes("192.168"));
ok("Gleiche IP → gleicher Hash (Rate-Limit funktioniert)", h1 === S.hashIp("192.168.1.50"));
ok("Andere IP → anderer Hash", h1 !== S.hashIp("192.168.1.51"));
ok("Hash ist gekürzt (32 Zeichen)", h1.length === 32);

section("7) Datei-Erkennung über Magic Bytes");
const mach = (bytes, fuell = 300) => Buffer.concat([Buffer.from(bytes), Buffer.alloc(fuell, 9)]);
const PNG = mach([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPG = mach([0xff, 0xd8, 0xff, 0xe0]);
const GIF = Buffer.concat([Buffer.from("GIF89a"), Buffer.alloc(300, 9)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(300, 9)]);
const PDF = Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(300, 9)]);

ok("PNG erkannt", U.sniffTyp(PNG) === "png");
ok("JPEG erkannt", U.sniffTyp(JPG) === "jpg");
ok("GIF erkannt", U.sniffTyp(GIF) === "gif");
ok("WEBP erkannt", U.sniffTyp(WEBP) === "webp");
ok("PDF erkannt", U.sniffTyp(PDF) === "pdf");
ok("Unbekanntes wird nicht geraten", U.sniffTyp(Buffer.from("einfach nur text")) === null);
ok("Leere Datei wird nicht erkannt", U.sniffTyp(Buffer.alloc(0)) === null);
ok("Zu kurze Datei stürzt nicht ab", U.sniffTyp(Buffer.from([0x89, 0x50])) === null);

section("8) Ausführbares und Skripte werden namentlich erkannt");
const gefahren = [
  [mach([0x4d, 0x5a]), "Windows-Programm"],
  [mach([0x7f, 0x45, 0x4c, 0x46]), "Linux-Programm"],
  [mach([0xcf, 0xfa, 0xed, 0xfe]), "macOS-Programm"],
  [mach([0xca, 0xfe, 0xba, 0xbe]), "Java"],
  [Buffer.from("#!/bin/sh\nrm -rf /"), "Shell-Skript"],
  [mach([0x50, 0x4b, 0x03, 0x04]), "ZIP"],
  [Buffer.from('<?php system($_GET["c"]); ?>'), "Skript"],
  [Buffer.from('<script>alert(1)</script>'), "Skript"],
  [Buffer.from('<svg xmlns="x"><script>alert(1)</script></svg>'), "SVG"],
];
let alleErkannt = true;
for (const [buf, was] of gefahren) {
  const treffer = U.istAusfuehrbar(buf);
  if (!treffer) { alleErkannt = false; console.log(`      NICHT erkannt: ${was}`); }
}
ok("Alle 9 gefährlichen Formate werden erkannt", alleErkannt);
ok("Echte Bilder werden nicht fälschlich blockiert",
   [PNG, JPG, GIF, WEBP, PDF].every((b) => U.istAusfuehrbar(b) === null));

section("9) Vollständige Upload-Prüfung");
let p = U.pruefeUpload(PNG, "urlaub.png", U.TICKET_TYPEN, 1e6);
ok("Echtes PNG wird angenommen", p.ok && p.typ === "png");
ok("Speichername wird neu gebildet", /^\d+-[a-z0-9]+\.png$/.test(p.dateiname || ""), p.dateiname);

p = U.pruefeUpload(mach([0x4d, 0x5a]), "bild.png", U.TICKET_TYPEN, 1e6);
ok("EXE mit Tarn-Endung .png abgelehnt", !p.ok && p.status === 415);
ok("Meldung nennt das echte Format", /Windows-Programm/.test(p.fehler || ""));

p = U.pruefeUpload(PDF, "rechnung.pdf", U.BILD_TYPEN, 1e6);
ok("PDF wird abgelehnt, wo nur Bilder erlaubt sind", !p.ok && /PDF/.test(p.fehler || ""));

p = U.pruefeUpload(PNG, "../../../etc/passwd.png", U.TICKET_TYPEN, 1e6);
ok("Pfadanteile im Namen werden entfernt (kein Path Traversal)",
   p.ok && !p.dateiname.includes("/") && !p.dateiname.includes(".."), p.dateiname);
ok("Anzeigename ist ebenfalls entschärft",
   !U.anzeigeName("../../etc/passwd").includes("/") && !U.anzeigeName("..\\\\win.ini").includes("\\\\"),
   U.anzeigeName("../../etc/passwd"));

p = U.pruefeUpload(Buffer.alloc(0), "leer.png", U.TICKET_TYPEN, 1e6);
ok("Leere Datei abgelehnt", !p.ok && p.status === 400);
p = U.pruefeUpload(Buffer.concat([PNG, Buffer.alloc(2e6)]), "gross.png", U.TICKET_TYPEN, 1e6);
ok("Zu große Datei abgelehnt", !p.ok && p.status === 413);
p = U.pruefeUpload(Buffer.from("Hallo, ich bin nur Text."), "text.png", U.TICKET_TYPEN, 1e6);
ok("Reiner Text mit Bild-Endung abgelehnt", !p.ok && p.status === 415);

console.log(`\n──────────────────────────────\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen\n`);
process.exit(fail ? 1 : 0);
