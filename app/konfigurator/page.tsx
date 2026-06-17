"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Check, Plus, Minus } from "lucide-react";
import { services, getService, servicesByCategory } from "@/lib/services";
import { CameraIcon, ServerIcon, CubeIcon, BoltIcon, ShieldIcon, ArrowIcon } from "@/components/icons";
import ServiceDetail from "@/components/ServiceDetail";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";

const iconMap = { camera: CameraIcon, server: ServerIcon, cube: CubeIcon, bolt: BoltIcon, shield: ShieldIcon };
const serviceGroups = servicesByCategory();

export default function KonfiguratorPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  const previewService = previewSlug ? getService(previewSlug) : undefined;
  const selectedServices = useMemo(
    () => services.filter((s) => selected.has(s.slug)),
    [selected]
  );

  function toggle(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  }
  const add = (slug: string) => setSelected((p) => new Set(p).add(slug));
  const remove = (slug: string) =>
    setSelected((p) => {
      const n = new Set(p);
      n.delete(slug);
      return n;
    });

  return (
    <main className="px-5 pt-28 pb-20 sm:pt-40 sm:pb-24">
      <div className="mx-auto max-w-6xl">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted">
          <Link href="/" className="transition-colors hover:text-ink cursor-pointer">Start</Link>
          <span>/</span>
          <span className="text-ink-soft">Konfigurator</span>
        </nav>

        {/* Kopf */}
        <div className="mt-8 max-w-2xl">
          <span className="eyebrow text-accent">Konfigurator</span>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            Stellen Sie Ihr <span className="emph">Paket</span> zusammen.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-soft">
            Wählen Sie die Leistungen, die zu Ihrem Zuhause passen. Mit „Vorschau“ sehen Sie jede
            Leistung im Detail und fügen sie direkt hinzu — der Preis folgt individuell auf Anfrage.
          </p>
        </div>

        {/* Schritte */}
        <ol className="mt-8 flex flex-wrap gap-x-8 gap-y-2 border-y border-line py-4">
          {[
            "Leistungen auswählen",
            "Per Vorschau prüfen",
            "Auswahl anfragen",
          ].map((step, i) => (
            <li key={step} className="flex items-center gap-2 text-sm">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent-ink">
                {i + 1}
              </span>
              <span className="text-ink-soft">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1.4fr_0.6fr]">
          {/* Kategorien — nebeneinander & untereinander, kompakte Kärtchen */}
          <div className="grid gap-5 sm:grid-cols-2">
            {serviceGroups.map((group) => (
              <div key={group.category.key} className="rounded-3xl border border-line bg-surface/50 p-5">
                <span className="eyebrow text-accent">{group.category.label}</span>
                <p className="mt-1 text-xs leading-snug text-muted">{group.category.description}</p>

                <div className="mt-4 space-y-3">
                  {group.items.map((s) => {
                    const Icon = iconMap[s.icon];
                    const isSel = selected.has(s.slug);
                    return (
                      <div
                        key={s.slug}
                        className={`rounded-2xl border bg-surface p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-18px_rgba(33,28,23,0.22)] ${isSel ? "border-accent" : "border-line hover:border-accent/40"}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent text-white">
                            <Icon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-display text-base font-semibold leading-tight tracking-tight">{s.title}</h3>
                              {isSel && <Check className="h-4 w-4 shrink-0 text-accent" />}
                            </div>
                            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-ink-soft">{s.tagline}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewSlug(s.slug)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-ink cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" /> Vorschau
                          </button>
                          <button
                            type="button"
                            onClick={() => toggle(s.slug)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                              isSel ? "bg-surface-2 text-ink hover:bg-line" : "bg-accent text-white hover:bg-accent-ink"
                            }`}
                          >
                            {isSel ? <><Minus className="h-3.5 w-3.5" /> Entfernen</> : <><Plus className="h-3.5 w-3.5" /> Hinzufügen</>}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Zusammenfassung */}
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-3xl border border-line bg-surface p-6">
              <span className="eyebrow text-accent">Ihre Auswahl</span>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                {selectedServices.length} {selectedServices.length === 1 ? "Leistung" : "Leistungen"}
              </h2>

              {selectedServices.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  Noch nichts ausgewählt. Fügen Sie links Leistungen hinzu.
                </p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {selectedServices.map((s) => (
                    <li key={s.slug} className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-3 py-2.5">
                      <span className="text-sm font-medium text-ink">{s.title}</span>
                      <button
                        type="button"
                        onClick={() => remove(s.slug)}
                        aria-label={`${s.title} entfernen`}
                        className="text-muted transition-colors hover:text-accent-ink cursor-pointer"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <Link
                href="/kontakt"
                aria-disabled={selectedServices.length === 0}
                className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 font-medium transition-colors ${
                  selectedServices.length === 0
                    ? "pointer-events-none bg-surface-2 text-muted"
                    : "bg-accent text-white hover:bg-accent-ink cursor-pointer"
                }`}
              >
                Auswahl anfragen
                <ArrowIcon className="h-5 w-5" />
              </Link>
              <p className="mt-3 text-center text-xs text-muted">Preis individuell auf Anfrage.</p>
            </div>
          </aside>
        </div>
      </div>

      {/* Vorschau-Pop-up */}
      <Dialog open={!!previewSlug} onOpenChange={(o) => !o && setPreviewSlug(null)}>
        <DialogContent className="gap-0 p-0 sm:max-w-2xl">
          {previewService && (
            <>
              <DialogTitle className="sr-only">{previewService.pageTitle}</DialogTitle>
              <DialogDescription className="sr-only">{previewService.tagline}</DialogDescription>
              <div className="max-h-[min(70vh,640px)] overflow-y-auto p-6 sm:p-8">
                <ServiceDetail service={previewService} compact />
              </div>
              <DialogFooter className="border-t border-line p-4 sm:px-8 sm:py-4">
                <Button
                  variant="outline"
                  disabled={!selected.has(previewService.slug)}
                  onClick={() => remove(previewService.slug)}
                >
                  <Minus className="h-4 w-4" /> Entfernen
                </Button>
                <Button
                  disabled={selected.has(previewService.slug)}
                  onClick={() => add(previewService.slug)}
                >
                  <Plus className="h-4 w-4" /> Hinzufügen
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
