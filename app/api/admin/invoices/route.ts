import { NextRequest, NextResponse } from "next/server";
import { readInvoices, writeInvoices, readReviews, INVOICE_STATUS_LABELS, type Invoice, type InvoiceStatus } from "@/lib/server/store";
import { requirePermission } from "@/lib/server/auth";
import { logAudit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: InvoiceStatus[] = ["geplant", "in_arbeit", "abgeschlossen"];

// Nächste freie Nummer im Format RG-JJJJ-NNN.
function nextNumber(invoices: Invoice[]): string {
  const year = new Date().getFullYear();
  const prefix = `RG-${year}-`;
  const max = invoices
    .filter((i) => i.number.startsWith(prefix))
    .reduce((m, i) => Math.max(m, parseInt(i.number.slice(prefix.length), 10) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

function normalizeNumber(n: string): string {
  return n.trim().toUpperCase().replace(/\s+/g, "");
}

export async function GET() {
  if (!(await requirePermission("invoices"))) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const reviews = readReviews();
  const invoices = readInvoices().map((i) => ({
    ...i,
    statusLabel: INVOICE_STATUS_LABELS[i.status],
    reviewCount: reviews.filter((r) => r.invoiceNumber === i.number).length,
  }));
  return NextResponse.json({ invoices });
}

export async function POST(req: NextRequest) {
  const me = await requirePermission("invoices");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const customer = String(body?.customer || "").trim().slice(0, 120);
  const title = String(body?.title || "").trim().slice(0, 160);
  if (!customer || !title) return NextResponse.json({ error: "Kunde und Leistung erforderlich." }, { status: 400 });

  const invoices = readInvoices();
  // Eigene Nummer erlaubt, sonst automatisch — muss eindeutig sein.
  let number = body.number ? normalizeNumber(String(body.number)).slice(0, 30) : nextNumber(invoices);
  if (!number) number = nextNumber(invoices);
  if (invoices.some((i) => i.number === number)) {
    return NextResponse.json({ error: `Rechnungsnummer ${number} existiert bereits.` }, { status: 409 });
  }

  const now = new Date().toISOString();
  const inv: Invoice = {
    id: `inv-${Date.now()}`,
    number,
    customer,
    title,
    amount: Math.max(0, Number(body.amount) || 0),
    status: STATUSES.includes(body.status) ? body.status : "geplant",
    createdAt: now,
    updatedAt: now,
  };
  invoices.unshift(inv);
  writeInvoices(invoices);
  logAudit(me.name, "Rechnung erstellt", `${number} — ${customer}`);
  return NextResponse.json({ invoice: inv }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const me = await requirePermission("invoices");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const invoices = readInvoices();
  const inv = invoices.find((i) => i.id === body.id);
  if (!inv) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

  if (typeof body.customer === "string" && body.customer.trim()) inv.customer = body.customer.trim().slice(0, 120);
  if (typeof body.title === "string" && body.title.trim()) inv.title = body.title.trim().slice(0, 160);
  if (body.amount !== undefined) inv.amount = Math.max(0, Number(body.amount) || 0);
  if (STATUSES.includes(body.status)) inv.status = body.status;
  inv.updatedAt = new Date().toISOString();
  writeInvoices(invoices);
  logAudit(me.name, "Rechnung aktualisiert", `${inv.number} → ${INVOICE_STATUS_LABELS[inv.status]}`);
  return NextResponse.json({ invoice: inv });
}

export async function DELETE(req: NextRequest) {
  const me = await requirePermission("invoices");
  if (!me) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id fehlt" }, { status: 400 });
  const invoices = readInvoices();
  const target = invoices.find((i) => i.id === id);
  writeInvoices(invoices.filter((i) => i.id !== id));
  if (target) logAudit(me.name, "Rechnung gelöscht", target.number);
  return NextResponse.json({ ok: true });
}
