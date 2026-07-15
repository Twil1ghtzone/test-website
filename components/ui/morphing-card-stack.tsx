"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { Grid3X3, Layers, LayoutList, Star, X } from "lucide-react";

export type LayoutMode = "stack" | "grid" | "list";

export interface CardData {
  id: string;
  author: string;
  rating: number; // 1..5
  text: string;
  meta?: string;
}

export interface MorphingCardStackProps {
  cards?: CardData[];
  className?: string;
  defaultLayout?: LayoutMode;
}

const layoutIcons = { stack: Layers, grid: Grid3X3, list: LayoutList };
const layoutLabels = { stack: "Stapel", grid: "Raster", list: "Liste" };

const SWIPE_THRESHOLD = 50;

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} von 5 Sternen`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(size, n <= value ? "fill-accent text-accent" : "fill-transparent text-line-strong")}
        />
      ))}
    </div>
  );
}

/* ── Lese-Modal: zeigt die VOLLE Bewertung (Karten sind auf wenige Zeilen gekürzt) ── */
function ReviewModal({ card, onClose }: { card: CardData | null; onClose: () => void }) {
  // Hintergrund-Scroll sperren, solange das Modal offen ist.
  useEffect(() => {
    if (!card) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [card, onClose]);

  return (
    <AnimatePresence>
      {card && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[120] grid place-items-center bg-black/40 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={`Bewertung von ${card.author}`}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-3xl border border-line bg-surface p-7 shadow-2xl shadow-black/10 sm:p-8"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Bewertung schließen"
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-canvas hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <Stars value={card.rating} size="h-5 w-5" />
            {/* Voller Text — komfortabel lesbar, scrollt bei sehr langen Bewertungen */}
            <p className="mt-4 max-h-[55vh] overflow-y-auto whitespace-pre-wrap text-lg leading-relaxed text-ink-soft">
              „{card.text}“
            </p>
            <div className="mt-6 border-t border-line pt-4">
              <span className="block font-display text-lg font-semibold text-ink">{card.author}</span>
              {card.meta && <span className="mt-0.5 block text-sm text-muted">{card.meta}</span>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Component({ cards = [], className, defaultLayout = "stack" }: MorphingCardStackProps) {
  const [layout, setLayout] = useState<LayoutMode>(defaultLayout);
  const [openCard, setOpenCard] = useState<CardData | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  // Drag-vs-Click: onClick feuert NACH onDragEnd — deshalb per Ref merken,
  // ob gerade gewischt wurde, und den Klick dann verwerfen (Wischen bleibt Wischen).
  const wasDragged = useRef(false);

  if (!cards || cards.length === 0) return null;

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const swipe = Math.abs(offset.x) * velocity.x;
    if (offset.x < -SWIPE_THRESHOLD || swipe < -1000) {
      setActiveIndex((prev) => (prev + 1) % cards.length);
    } else if (offset.x > SWIPE_THRESHOLD || swipe > 1000) {
      setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }
  };

  const getStackOrder = () => {
    const reordered = [];
    for (let i = 0; i < cards.length; i++) {
      const index = (activeIndex + i) % cards.length;
      reordered.push({ ...cards[index], stackPosition: i });
    }
    return reordered.reverse();
  };

  const getLayoutStyles = (stackPosition: number) => {
    switch (layout) {
      case "stack":
        return { top: stackPosition * 8, left: stackPosition * 8, zIndex: cards.length - stackPosition, rotate: (stackPosition - 1) * 2 };
      default:
        return { top: 0, left: 0, zIndex: 1, rotate: 0 };
    }
  };

  const containerStyles = {
    stack: "relative h-56 w-[17rem] sm:w-72",
    grid: "grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl",
    list: "flex flex-col gap-3 w-full max-w-2xl",
  };

  const displayCards =
    layout === "stack" ? getStackOrder() : cards.map((c, i) => ({ ...c, stackPosition: i }));

  return (
    <div className={cn("space-y-5", className)}>
      {/* Layout-Umschalter */}
      <div className="mx-auto flex w-fit items-center justify-center gap-1 rounded-xl border border-line bg-surface-2 p-1">
        {(Object.keys(layoutIcons) as LayoutMode[]).map((mode) => {
          const Icon = layoutIcons[mode];
          return (
            <button
              key={mode}
              onClick={() => setLayout(mode)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer",
                layout === mode ? "bg-accent text-white" : "text-muted hover:text-ink"
              )}
              aria-label={`Ansicht: ${layoutLabels[mode]}`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{layoutLabels[mode]}</span>
            </button>
          );
        })}
      </div>

      {/* Karten */}
      <LayoutGroup>
        <motion.div layout className={cn(containerStyles[layout], "mx-auto")}>
          <AnimatePresence mode="popLayout">
            {displayCards.map((card) => {
              const styles = getLayoutStyles(card.stackPosition);
              const isTopCard = layout === "stack" && card.stackPosition === 0;

              return (
                <motion.div
                  key={card.id}
                  layoutId={card.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1, x: 0, ...styles }}
                  exit={{ opacity: 0, scale: 0.8, x: -200 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  drag={isTopCard ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragStart={() => { wasDragged.current = true; }}
                  onDragEnd={handleDragEnd}
                  whileDrag={{ scale: 1.02, cursor: "grabbing" }}
                  whileHover={layout !== "stack" ? { y: -3, scale: 1.01 } : undefined}
                  onClick={() => {
                    // Nach einem Wisch KEIN Popup — nur echte Klicks öffnen die Vollansicht.
                    if (wasDragged.current) { wasDragged.current = false; return; }
                    setOpenCard(card);
                  }}
                  className={cn(
                    "cursor-pointer rounded-2xl border border-line bg-surface p-5 transition-colors",
                    "hover:border-accent/50 shadow-[0_10px_30px_-12px_rgba(33,28,23,0.12)]",
                    layout === "stack" && "absolute w-[17rem] h-56 sm:w-72",
                    layout === "stack" && isTopCard && "cursor-grab active:cursor-grabbing",
                    layout === "grid" && "w-full",
                    layout === "list" && "w-full"
                  )}
                >
                  <div className="flex h-full flex-col">
                    <Stars value={card.rating} />
                    <p
                      className={cn(
                        "mt-3 leading-relaxed text-ink-soft",
                        layout === "stack" && "text-sm line-clamp-4",
                        layout === "grid" && "text-sm line-clamp-5",
                        layout === "list" && "line-clamp-2"
                      )}
                    >
                      „{card.text}“
                    </p>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                      <div className="min-w-0">
                        <span className="block truncate font-display text-base font-semibold text-ink">{card.author}</span>
                        {card.meta && <span className="block truncate text-xs text-muted">{card.meta}</span>}
                      </div>
                      <span className="shrink-0 text-xs font-medium text-accent">Lesen</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {/* Punkte-Navigation + Hinweis (nur Stapel) */}
      {layout === "stack" && cards.length > 1 && (
        <div className="flex flex-col items-center gap-3 pt-6">
          <div className="flex justify-center gap-1.5">
            {cards.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  "h-1.5 rounded-full transition-all cursor-pointer",
                  index === activeIndex ? "w-5 bg-accent" : "w-1.5 bg-line-strong hover:bg-muted"
                )}
                aria-label={`Bewertung ${index + 1}`}
              />
            ))}
          </div>
          <span className="eyebrow text-muted/60">Wischen zum Blättern · Antippen zum Lesen</span>
        </div>
      )}

      {/* Vollansicht der angeklickten Bewertung */}
      <ReviewModal card={openCard} onClose={() => setOpenCard(null)} />
    </div>
  );
}
