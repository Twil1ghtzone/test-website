import nodemailer from "nodemailer";
import { readSettings } from "./store";

// SMTP wie novum: optional — ohne Konfiguration wird nichts gesendet
// (Abos funktionieren dann ohne E-Mail-Bestätigung).
export function smtpConfigured(): boolean {
  const { smtp } = readSettings();
  return !!(smtp.host && smtp.user && smtp.pass);
}

export async function sendMail(to: string, subject: string, html: string): Promise<{ ok: boolean; detail?: string }> {
  const { smtp, siteName } = readSettings();
  if (!smtp.host || !smtp.user || !smtp.pass) return { ok: false, detail: "SMTP nicht konfiguriert." };
  try {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporter.sendMail({
      from: smtp.from || `${siteName} <${smtp.user}>`,
      to,
      subject,
      html,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Versand fehlgeschlagen" };
  }
}

// Einheitliches, schlichtes Mail-Layout im Website-Stil.
export function mailLayout(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f6f2ea;font-family:Georgia,serif;color:#211c17;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <p style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b0543a;margin:0 0 8px;">STUDIO//LOKAL</p>
    <div style="background:#fffdf9;border:1px solid #e7ddcc;border-radius:16px;padding:28px;">
      <h1 style="font-size:22px;margin:0 0 12px;">${title}</h1>
      ${bodyHtml}
    </div>
    <p style="font-size:12px;color:#8a7f70;margin-top:16px;">Diese E-Mail wurde von unserem lokalen System versendet — cloud-frei, ohne Tracking.</p>
  </div>
</body></html>`;
}
