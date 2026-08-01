import Link from "next/link";
import { brand } from "@/lib/data";
import { readContent } from "@/lib/server/store";
import { services } from "@/lib/services";
import Logo from "@/components/Logo";

// Kontaktdaten & Footer-Notiz kommen aus dem Admin (lib/server/store → legal.json),
// damit sie sitewide an einer Stelle gepflegt werden.
export default function Footer() {
  const c = readContent();
  return (
    <footer className="relative bg-night px-5 py-16 text-canvas">
      <div aria-hidden className="panel-texture-dark pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" aria-label={brand.name} className="inline-block py-2 sm:py-0 cursor-pointer">
              <Logo />
            </Link>
            <p className="mt-3 max-w-xs leading-relaxed text-white/60">
              {c.footerNote}
            </p>
          </div>

          <FooterCol
            title="Navigation"
            links={[
              { label: "Über uns", href: "/ueber-uns" },
              { label: "Häufige Fragen", href: "/faq" },
              { label: "Warum lokal", href: "/#warum" },
              { label: "Bewertungen", href: "/#bewertungen" },
              { label: "Ablauf", href: "/#ablauf" },
              { label: "Blog", href: "/blog" },
              { label: "Support", href: "/support" },
            ]}
          />
          <FooterCol
            title="Dienstleistungen"
            links={[
              ...services.map((s) => ({ label: s.title, href: `/leistungen/${s.slug}` })),
              { label: "Konfigurator", href: "/konfigurator" },
              { label: "Energie-Spar-Rechner", href: "/stromrechner" },
            ]}
          />
          <div>
            <span className="eyebrow text-white/40">Kontakt</span>
            <div className="mt-4 space-y-2 text-white/70">
              <a href={`mailto:${c.email}`} className="block link-underline py-3 sm:py-0 cursor-pointer">{c.email}</a>
              <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="block link-underline py-3 sm:py-0 cursor-pointer">{c.phone}</a>
              <span className="block">{c.region}</span>
              {c.address && <span className="block whitespace-pre-line pt-1 text-sm text-white/50">{c.address}</span>}
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link href="/impressum" className="link-underline py-3 text-white/60 hover:text-white sm:py-0 cursor-pointer">Impressum</Link>
              <Link href="/datenschutz" className="link-underline py-3 text-white/60 hover:text-white sm:py-0 cursor-pointer">Datenschutz</Link>
              {c.agb.trim() && <Link href="/agb" className="link-underline py-3 text-white/60 hover:text-white sm:py-0 cursor-pointer">AGB</Link>}
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">
          <span>© {new Date().getFullYear()} {c.companyName || brand.name}. Alle Rechte vorbehalten.</span>
          <span>100 % Cloud-frei · 100 % Abofrei · Daten bleiben im Haus</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <span className="eyebrow text-white/40">{title}</span>
      <ul className="mt-4 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            {/* py-2 auf Mobil: ~44px Trefferfläche (Apple/Google-Richtwert), ab sm wieder kompakt */}
            <Link href={l.href} className="link-underline -my-1 inline-block py-2 text-white/70 transition-colors hover:text-white sm:my-0 sm:py-0.5 cursor-pointer">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
