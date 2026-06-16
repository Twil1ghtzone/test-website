"use client";

import { useState } from "react";
import { Plus, Minus, X, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { services, getService } from "@/lib/services";
import { CameraIcon, ServerIcon, CubeIcon, BoltIcon, ShieldIcon } from "@/components/icons";
import ServiceDetail from "@/components/ServiceDetail";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const iconMap = { camera: CameraIcon, server: ServerIcon, cube: CubeIcon, bolt: BoltIcon, shield: ShieldIcon };

// Paket-Auswahl fürs Kontaktformular: „+" → Pop-up mit Vorschau → als Tag übernehmen.
export default function PackagePicker() {
  const [selected, setSelected] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  const previewService = previewSlug ? getService(previewSlug) : undefined;
  const available = services.filter((s) => !selected.includes(s.slug));

  function openPicker() {
    setPreviewSlug(null);
    setOpen(true);
  }
  function add(slug: string) {
    setSelected((p) => [...p, slug]);
    setPreviewSlug(null);
    setOpen(false);
  }
  function remove(slug: string) {
    setSelected((p) => p.filter((s) => s !== slug));
  }

  return (
    <div>
      {/* versteckte Felder für den Formularversand */}
      {selected.map((slug) => (
        <input key={slug} type="hidden" name="paket" value={getService(slug)?.title ?? slug} readOnly />
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <AnimatePresence>
          {selected.map((slug) => {
            const s = getService(slug);
            if (!s) return null;
            const Icon = iconMap[s.icon];
            return (
              <motion.span
                key={slug}
                initial={{ opacity: 0, scale: 0.85, y: -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -6 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft py-1.5 pe-1.5 ps-3 text-sm font-medium text-accent-ink"
              >
                <Icon className="h-4 w-4" />
                {s.title}
                <button
                  type="button"
                  onClick={() => remove(slug)}
                  aria-label={`${s.title} entfernen`}
                  className="grid h-5 w-5 place-items-center rounded-full text-accent-ink/70 transition-colors hover:bg-accent hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.span>
            );
          })}
        </AnimatePresence>

        {available.length > 0 && (
          <button
            type="button"
            onClick={openPicker}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent-ink cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Paket hinzufügen
          </button>
        )}
      </div>

      {/* Pop-up: Liste → Vorschau → Hinzufügen/Abbrechen */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-2xl">
          {!previewService ? (
            <>
              <DialogTitle className="border-b border-line px-6 py-4">Paket auswählen</DialogTitle>
              <DialogDescription className="sr-only">Wählen Sie eine Leistung für Ihre Anfrage.</DialogDescription>
              <div className="max-h-[min(70vh,560px)] overflow-y-auto p-3">
                {available.map((s) => {
                  const Icon = iconMap[s.icon];
                  return (
                    <button
                      key={s.slug}
                      type="button"
                      onClick={() => setPreviewSlug(s.slug)}
                      className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-canvas cursor-pointer"
                    >
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-white">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-base font-semibold leading-tight text-ink">{s.title}</span>
                        <span className="block truncate text-sm text-ink-soft">{s.tagline}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <DialogTitle className="sr-only">{previewService.pageTitle}</DialogTitle>
              <DialogDescription className="sr-only">{previewService.tagline}</DialogDescription>
              <div className="max-h-[min(70vh,560px)] overflow-y-auto p-6 sm:p-8">
                <ServiceDetail service={previewService} compact />
              </div>
              <DialogFooter className="border-t border-line p-4 sm:px-8 sm:py-4">
                <Button variant="outline" onClick={() => setPreviewSlug(null)}>
                  <Minus className="h-4 w-4" /> Abbrechen
                </Button>
                <Button onClick={() => add(previewService.slug)}>
                  <Plus className="h-4 w-4" /> Hinzufügen
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
