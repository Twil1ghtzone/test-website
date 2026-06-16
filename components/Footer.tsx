import Link from "next/link";
import { brand } from "@/lib/data";
import { services } from "@/lib/services";
import Logo from "@/components/Logo";

export default function Footer() {
  return (
    <footer className="bg-night px-5 py-16 text-canvas">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" aria-label={brand.name} className="cursor-pointer">
              <Logo />
            </Link>
            <p className="mt-3 max-w-xs leading-relaxed text-white/60">
              Elektrohandwerk und moderne IT aus einer Hand. Cloud-frei, abofrei, privat.
            </p>
          </div>

          <FooterCol
            title="Navigation"
            links={[
              { label: "Über uns", href: "/#ueber-uns" },
              { label: "Warum lokal", href: "/#warum" },
              { label: "Bewertungen", href: "/#bewertungen" },
              { label: "Ablauf", href: "/#ablauf" },
            ]}
          />
          <FooterCol
            title="Dienstleistungen"
            links={[
              ...services.map((s) => ({ label: s.title, href: `/leistungen/${s.slug}` })),
              { label: "Konfigurator", href: "/konfigurator" },
            ]}
          />
          <div>
            <span className="eyebrow text-white/40">Kontakt</span>
            <div className="mt-4 space-y-2 text-white/70">
              <a href={`mailto:${brand.email}`} className="block link-underline cursor-pointer">{brand.email}</a>
              <a href={`tel:${brand.phone.replace(/\s/g, "")}`} className="block link-underline cursor-pointer">{brand.phone}</a>
              <span className="block">{brand.region}</span>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm text-white/50 sm:flex-row">
          <span>© {new Date().getFullYear()} {brand.name}. Alle Rechte vorbehalten.</span>
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
            <Link href={l.href} className="link-underline text-white/70 transition-colors hover:text-white cursor-pointer">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
