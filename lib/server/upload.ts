/* ════════════════════════════════════════════════════════════════════════
   DATEI-PRÜFUNG

   Der vom Browser mitgeschickte MIME-Typ (`file.type`) ist eine BEHAUPTUNG
   des Clients und lässt sich frei fälschen. Genauso die Dateiendung. Wer
   eine ausführbare Datei hochladen will, nennt sie einfach `bild.png` und
   setzt den Header auf `image/png`.

   Deshalb entscheidet hier ausschließlich der tatsächliche Inhalt: die
   ersten Bytes einer Datei ("Magic Bytes") verraten das echte Format. Die
   Endung auf der Platte wird aus dem ERKANNTEN Typ gebildet, nie aus dem
   Namen, den der Nutzer geschickt hat.

   SVG ist bewusst nicht erlaubt: es ist XML, darf <script> enthalten und
   würde beim Ausliefern zu Stored XSS führen.
   ════════════════════════════════════════════════════════════════════════ */

export type ErkannterTyp = "png" | "jpg" | "gif" | "webp" | "pdf";

export const TYP_MIME: Record<ErkannterTyp, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
};

const BILDER: ErkannterTyp[] = ["png", "jpg", "gif", "webp"];
/** Kunden dürfen zusätzlich PDFs anhängen (Rechnungen, Fotos vom Zählerstand). */
export const TICKET_TYPEN: ErkannterTyp[] = [...BILDER, "pdf"];
export const BILD_TYPEN: ErkannterTyp[] = BILDER;

function beginntMit(buf: Buffer, bytes: number[], offset = 0): boolean {
  if (buf.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buf[offset + i] === b);
}

/**
 * Erkennt das Format anhand der Signatur am Dateianfang.
 * Gibt `null` zurück, wenn nichts Bekanntes erkannt wird — dann wird abgelehnt.
 */
export function sniffTyp(buf: Buffer): ErkannterTyp | null {
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (beginntMit(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  // JPEG: FF D8 FF
  if (beginntMit(buf, [0xff, 0xd8, 0xff])) return "jpg";
  // GIF: "GIF87a" oder "GIF89a"
  if (beginntMit(buf, [0x47, 0x49, 0x46, 0x38]) && (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61) return "gif";
  // WEBP: "RIFF" .... "WEBP"
  if (beginntMit(buf, [0x52, 0x49, 0x46, 0x46]) && beginntMit(buf, [0x57, 0x45, 0x42, 0x50], 8)) return "webp";
  // PDF: "%PDF-"
  if (beginntMit(buf, [0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf";
  return null;
}

/**
 * Zusätzliche Sperre: Signaturen ausführbarer Formate werden namentlich
 * abgelehnt, damit die Fehlermeldung eindeutig ist und im Log auffällt.
 */
const AUSFUEHRBAR: { name: string; bytes: number[]; offset?: number }[] = [
  { name: "Windows-Programm (EXE/DLL)", bytes: [0x4d, 0x5a] },              // MZ
  { name: "Linux-Programm (ELF)", bytes: [0x7f, 0x45, 0x4c, 0x46] },        // .ELF
  { name: "macOS-Programm (Mach-O)", bytes: [0xcf, 0xfa, 0xed, 0xfe] },
  { name: "Java-Archiv/Class", bytes: [0xca, 0xfe, 0xba, 0xbe] },
  { name: "Shell-Skript", bytes: [0x23, 0x21] },                            // #!
  { name: "ZIP/Office-Archiv", bytes: [0x50, 0x4b, 0x03, 0x04] },           // PK — kann Makros enthalten
];

export function istAusfuehrbar(buf: Buffer): string | null {
  for (const s of AUSFUEHRBAR) if (beginntMit(buf, s.bytes, s.offset ?? 0)) return s.name;
  // Reiner Text, der mit <?php oder <script beginnt (auch nach BOM/Whitespace).
  const kopf = buf.subarray(0, 256).toString("latin1").trimStart().toLowerCase();
  if (kopf.startsWith("<?php") || kopf.startsWith("<script") || kopf.startsWith("<svg")) {
    return "Skript- oder SVG-Inhalt";
  }
  return null;
}

export interface PruefErgebnis {
  ok: boolean;
  typ?: ErkannterTyp;
  /** Dateiname, unter dem gespeichert werden darf — vollständig neu gebildet. */
  dateiname?: string;
  fehler?: string;
  status?: number;
}

/**
 * Vollständige Prüfung einer hochgeladenen Datei.
 * `erlaubt` legt fest, welche erkannten Typen durchgelassen werden.
 */
export function pruefeUpload(
  buf: Buffer,
  angegebenerName: string,
  erlaubt: ErkannterTyp[],
  maxBytes: number
): PruefErgebnis {
  if (buf.length === 0) return { ok: false, fehler: "Die Datei ist leer.", status: 400 };
  if (buf.length > maxBytes) {
    return { ok: false, fehler: `Datei zu groß (maximal ${Math.round(maxBytes / 1024 / 1024)} MB).`, status: 413 };
  }

  const gefaehrlich = istAusfuehrbar(buf);
  if (gefaehrlich) {
    return { ok: false, fehler: `Abgelehnt: erkannt als ${gefaehrlich}. Nur Bilder und PDFs sind erlaubt.`, status: 415 };
  }

  const typ = sniffTyp(buf);
  if (!typ) {
    return {
      ok: false,
      fehler: "Der Inhalt der Datei passt zu keinem erlaubten Format. Erlaubt sind PNG, JPG, GIF, WEBP und PDF.",
      status: 415,
    };
  }
  if (!erlaubt.includes(typ)) {
    return { ok: false, fehler: `${typ.toUpperCase()} ist hier nicht erlaubt.`, status: 415 };
  }

  // Der vom Nutzer geschickte Name wird hier bewusst GAR NICHT verwendet —
  // auch nicht gesäubert. Der Speichername entsteht vollständig neu, damit
  // Pfadanteile wie "../../etc/passwd" nie ins Dateisystem gelangen können.
  // Für die Anzeige gibt es separat anzeigeName(), das die Aufrufer nutzen.
  const zufall = Math.random().toString(36).slice(2, 10);
  return {
    ok: true,
    typ,
    // Endung kommt aus dem ERKANNTEN Typ, nicht aus dem Namen des Nutzers.
    dateiname: `${Date.now()}-${zufall}.${typ}`,
    fehler: undefined,
  };
}

/** Anzeigename fürs Frontend — gesäubert, ohne Pfad, gekürzt. */
export function anzeigeName(angegebenerName: string): string {
  return (
    angegebenerName.replace(/\\/g, "/").split("/").pop()!.replace(/[^\w.\- ]+/g, "_").slice(0, 60) || "Datei"
  );
}
