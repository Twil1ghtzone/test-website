// Prüft die KI-Schicht gegen nachgebaute lokale Server — insbesondere den Fall
// aus dem LM-Studio-Log: Reasoning-Modell, content leer, alles im reasoning_content.
import { createServer } from "http";
import { callAI } from "./ai.ts";

let pass = 0, fail = 0;
const ok = (name, cond, info = "") => { cond ? pass++ : fail++; console.log(`${cond ? "  OK  " : " FAIL "} ${name}${info ? "  — " + info : ""}`); };
const section = (t) => console.log(`\n=== ${t} ===`);

// Startet einen OpenAI-kompatiblen Mock. handler(body, anfragenZaehler) -> {status, json, delayMs}
function mock(handler) {
  const anfragen = [];
  const srv = createServer((req, res) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", async () => {
      const body = JSON.parse(b || "{}");
      anfragen.push(body);
      const r = handler(body, anfragen.length);
      if (r.delayMs) {
        // Abbruch durch den Client sauber registrieren (wie LM Studio es loggt).
        const abgebrochen = await new Promise((resolve) => {
          const t = setTimeout(() => resolve(false), r.delayMs);
          req.on("aborted", () => { clearTimeout(t); resolve(true); });
          res.on("close", () => { if (!res.writableFinished) { clearTimeout(t); resolve(true); } });
        });
        if (abgebrochen) return;
      }
      res.writeHead(r.status ?? 200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(r.json));
    });
  });
  return { srv, anfragen, listen: (port) => new Promise((r) => srv.listen(port, r)), close: () => new Promise((r) => srv.close(r)) };
}

const denkAntwort = (text, finish = "length") => ({
  status: 200,
  json: { choices: [{ index: 0, message: { role: "assistant", content: "", reasoning_content: text, tool_calls: [] }, finish_reason: finish }] },
});
const echteAntwort = (text) => ({
  status: 200,
  json: { choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }] },
});

let port = 3900;
const ai = (over = {}) => ({
  endpoint: `http://localhost:${port}`, apiKey: "", model: "nvidia/nemotron-3-nano-4b",
  temperature: 0, maxTokens: 800, ...over,
});
const frage = [{ role: "system", content: "Du bist der Assistent." }, { role: "user", content: "Sag bitte in einem kurzen Satz Hallo." }];

/* ─────────────────────────────────────────────────────────────────────── */
section("1) Der Fall aus dem Log: alles im reasoning_content, content leer");
// Kleines Budget → nur Denkschritte. Grösseres Budget → echte Antwort.
let m = mock((body) =>
  body.max_tokens > 800
    ? echteAntwort("Hallo! Schön, dass Sie da sind.")
    : denkAntwort("Okay, the user wants me to respond. Let me check the instructions again. They said I am the support assistant"));
await m.listen(++port);

let r = await callAI(ai(), frage, 30000);
ok("Ergebnis ist am Ende eine echte Antwort", r.ok === true, r.ok ? `„${r.reply}“` : r.detail);
ok("Es wurden ZWEI Anfragen gesendet (automatischer zweiter Versuch)", m.anfragen.length === 2, `${m.anfragen.length} Anfragen`);
ok("Erster Versuch mit dem eingestellten Budget", m.anfragen[0]?.max_tokens === 800, `${m.anfragen[0]?.max_tokens}`);
ok("Zweiter Versuch mit vervierfachtem Budget", m.anfragen[1]?.max_tokens === 3200, `${m.anfragen[1]?.max_tokens}`);
ok("Gemeldet wird das tatsächlich genutzte Budget", r.usedMaxTokens === 3200, `${r.usedMaxTokens}`);
ok("Interne Denkschritte tauchen nie in der Antwort auf", r.ok && !/user wants me|Let me check/i.test(r.reply));
await m.close();

section("2) Auch mit mehr Budget nur Denkschritte → klare Meldung, kein Kunden-Müll");
m = mock(() => denkAntwort("Okay, let me think about this very thoroughly and at great length"));
await m.listen(++port);
r = await callAI(ai(), frage, 30000);
ok("Wird als Fehler gemeldet, nicht als Antwort", r.ok === false);
ok("Als „nur nachgedacht“ gekennzeichnet", r.ok === false && r.reasoningOnly === true);
ok("Denkschritte werden NICHT ausgeliefert", !JSON.stringify(r).includes("let me think about this"));
ok("Meldung nennt das Token-Limit", r.ok === false && /Token-Limit/.test(r.detail), r.ok === false ? r.detail.slice(0, 60) : "");
ok("Zweiter Versuch wurde unternommen", m.anfragen.length === 2, `${m.anfragen.length} Anfragen`);
await m.close();

section("3) Zeitlimit — die eigentliche Ursache im Log");
// Server antwortet erst nach 8 s.
m = mock(() => ({ ...echteAntwort("Hallo!"), delayMs: 8000 }));
await m.listen(++port);

r = await callAI(ai(), frage, 3000);
ok("Zu kurzes Limit bricht ab (wie im Log: Client disconnected)", r.ok === false);
ok("Meldung erklärt die Zeitüberschreitung verständlich",
   r.ok === false && /Zeitüberschreitung/.test(r.detail), r.ok === false ? r.detail.slice(0, 70) : "");
ok("Abbruch geschieht nahe am Limit, nicht später", r.ms < 4500, `${r.ms} ms`);

r = await callAI(ai(), frage, 20000);
ok("Ausreichendes Limit liefert die Antwort", r.ok === true, r.ok ? `„${r.reply}“ nach ${r.ms} ms` : r.detail);
await m.close();

section("4) Kein zweiter Versuch, wenn die Zeit dafür nicht reicht");
// Erster Durchgang dauert 6 s und liefert nur Denkschritte; Limit 10 s →
// die Restzeit (< 15 s) reicht nicht mehr für einen zweiten Anlauf.
m = mock(() => ({ ...denkAntwort("thinking thinking thinking"), delayMs: 6000 }));
await m.listen(++port);
r = await callAI(ai(), frage, 10000);
ok("Nur EIN Versuch bei knapper Restzeit", m.anfragen.length === 1, `${m.anfragen.length} Anfrage(n)`);
ok("Kein Abbruch, sondern saubere Meldung", r.ok === false && r.reasoningOnly === true);
await m.close();

section("5) Normales Modell bleibt unberührt");
m = mock(() => echteAntwort("Guten Tag! Wie kann ich helfen?"));
await m.listen(++port);
r = await callAI(ai({ model: "gpt-4o-mini" }), frage, 30000);
ok("Antwort kommt beim ersten Versuch", r.ok === true && m.anfragen.length === 1, `${m.anfragen.length} Anfrage`);
ok("Kein Reasoning-Vermerk", r.ok === true && r.reasoningOnly === undefined);
ok("System-Prompt wird mitgesendet", JSON.stringify(m.anfragen[0]).includes("Du bist der Assistent"));
ok("Lokaler Server bekommt die Reasoning-Abschalter mitgeschickt",
   m.anfragen[0]?.chat_template_kwargs?.enable_thinking === false && m.anfragen[0]?.think === false);
await m.close();

section("6) Server lehnt die Zusatzfelder ab (HTTP 400) → Wiederholung ohne sie");
m = mock((body) =>
  body.chat_template_kwargs
    ? { status: 400, json: { error: "unknown field chat_template_kwargs" } }
    : echteAntwort("Hallo ohne Extras."));
await m.listen(++port);
r = await callAI(ai(), frage, 30000);
ok("Antwort trotz 400 beim ersten Anlauf", r.ok === true, r.ok ? `„${r.reply}“` : r.detail);
ok("Der zweite Anlauf ging ohne Zusatzfelder raus", m.anfragen[1] && !m.anfragen[1].chat_template_kwargs);
await m.close();

section("7) Echte Serverfehler bleiben echte Fehler");
m = mock(() => ({ status: 404, json: { error: "model not found" } }));
await m.listen(++port);
r = await callAI(ai({ model: "gibts-nicht" }), frage, 10000);
ok("HTTP 404 wird als Fehler gemeldet", r.ok === false && r.status === 404);
ok("Serverantwort steht in der Meldung", r.ok === false && /model not found/.test(r.detail));
ok("Kein sinnloser zweiter Versuch bei HTTP-Fehler", m.anfragen.length === 1, `${m.anfragen.length} Anfrage`);
await m.close();

section("8) Server gar nicht erreichbar");
r = await callAI(ai({ endpoint: "http://localhost:3999" }), frage, 5000);
ok("Wird als Verbindungsfehler gemeldet", r.ok === false);
ok("Meldung nennt den konkreten Grund und den Docker-Hinweis",
   r.ok === false && /abgelehnt|ECONNREFUSED/.test(r.detail), r.ok === false ? r.detail.slice(0, 80) : "");

console.log(`\n──────────────────────────────\nErgebnis: ${pass} bestanden, ${fail} fehlgeschlagen\n`);
process.exit(fail ? 1 : 0);
