import Placeholder from "./Placeholder";
import { CameraIcon, ServerIcon, CubeIcon, BoltIcon, ShieldIcon, CheckIcon } from "./icons";
import type { Service } from "@/lib/services";

const iconMap = { camera: CameraIcon, server: ServerIcon, cube: CubeIcon, bolt: BoltIcon, shield: ShieldIcon };

/**
 * Präsentations-Komponente für eine Dienstleistung.
 * Wird sowohl auf der Einzelseite (/leistungen/[slug]) als auch in der
 * Konfigurator-Vorschau (Dialog) verwendet — daher ohne Nav/CTA, rein inhaltlich.
 */
export default function ServiceDetail({ service, compact = false }: { service: Service; compact?: boolean }) {
  const Icon = iconMap[service.icon];

  return (
    <div>
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent text-white">
          <Icon className="h-6 w-6" />
        </span>
        <span className="eyebrow text-muted">Leistung {service.no}</span>
      </div>

      <h2
        className={`mt-5 font-display font-semibold leading-[1.1] tracking-tight ${
          compact ? "text-2xl" : "text-3xl sm:text-4xl"
        }`}
      >
        {service.pageTitle}
      </h2>
      <p className="mt-3 text-lg text-ink-soft">{service.tagline}</p>

      <div className="mt-7">
        <Placeholder caption={service.imageCaption} ratio={compact ? "aspect-[16/9]" : "aspect-[16/9]"} className="w-full" />
      </div>

      <p className="mt-7 leading-relaxed text-ink-soft">{service.intro}</p>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <span className="eyebrow text-accent">Das ist dabei</span>
          <ul className="mt-4 space-y-3">
            {service.points.map((p) => (
              <li key={p} className="flex gap-3 text-[0.95rem] leading-relaxed text-ink-soft">
                <span className="mt-0.5 shrink-0 text-accent"><CheckIcon className="h-5 w-5" /></span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <span className="eyebrow text-accent">Ihr Vorteil</span>
          <ul className="mt-4 space-y-3">
            {service.outcomes.map((o) => (
              <li key={o} className="flex gap-3 text-[0.95rem] leading-relaxed text-ink-soft">
                <span className="mt-0.5 shrink-0 text-accent"><CheckIcon className="h-5 w-5" /></span>
                {o}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
