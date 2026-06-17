"use client";

import { useState } from "react";
import { motion, AnimatePresence, LayoutGroup, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { Grid3X3, Layers, LayoutList, Star } from "lucide-react";

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

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${value} von 5 Sternen`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn("h-4 w-4", n <= value ? "fill-accent text-accent" : "fill-transparent text-line-strong")}
        />
      ))}
    </div>
  );
}

export function Component({ cards = [], className, defaultLayout = "stack" }: MorphingCardStackProps) {
  const [layout, setLayout] = useState<LayoutMode>(defaultLayout);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  if (!cards || cards.length === 0) return null;

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    const swipe = Math.abs(offset.x) * velocity.x;
    if (offset.x < -SWIPE_THRESHOLD || swipe < -1000) {
      setActiveIndex((prev) => (prev + 1) % cards.length);
    } else if (offset.x > SWIPE_THRESHOLD || swipe > 1000) {
      setActiveIndex((prev) => (prev - 1 + cards.length) % cards.length);
    }
    setIsDragging(false);
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
              const isExpanded = expandedCard === card.id;
              const isTopCard = layout === "stack" && card.stackPosition === 0;

              return (
                <motion.div
                  key={card.id}
                  layoutId={card.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: isExpanded ? 1.04 : 1, x: 0, ...styles }}
                  exit={{ opacity: 0, scale: 0.8, x: -200 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  drag={isTopCard ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.7}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={handleDragEnd}
                  whileDrag={{ scale: 1.02, cursor: "grabbing" }}
                  onClick={() => {
                    if (isDragging) return;
                    setExpandedCard(isExpanded ? null : card.id);
                  }}
                  className={cn(
                    "cursor-pointer rounded-2xl border border-line bg-surface p-5 transition-colors",
                    "hover:border-accent/50 shadow-[0_10px_30px_-12px_rgba(33,28,23,0.12)]",
                    layout === "stack" && "absolute w-[17rem] h-56 sm:w-72",
                    layout === "stack" && isTopCard && "cursor-grab active:cursor-grabbing",
                    layout === "grid" && "w-full",
                    layout === "list" && "w-full",
                    isExpanded && "ring-2 ring-accent"
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
                    <div className="mt-auto pt-4">
                      <span className="block font-display text-base font-semibold text-ink">{card.author}</span>
                      {card.meta && <span className="block text-xs text-muted">{card.meta}</span>}
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
          <span className="eyebrow text-muted/60">Wischen oder Punkte zum Blättern</span>
        </div>
      )}
    </div>
  );
}
