"use client";
import * as HoverCardPrimitive from "@radix-ui/react-hover-card";
import React from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

// Angepasste Version: nutzt ein lokales Vorschaubild (imageSrc) statt der
// externen microlink-API — kein Fremd-Request, kein qss-Paket nötig.
type LinkPreviewProps = {
  children: React.ReactNode;
  url: string;
  imageSrc: string;
  className?: string;
  width?: number;
  height?: number;
};

export const LinkPreview = ({
  children,
  url,
  imageSrc,
  className,
  width = 200,
  height = 125,
}: LinkPreviewProps) => {
  const [isOpen, setOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const springConfig = { stiffness: 100, damping: 15 };
  const x = useMotionValue(0);
  const translateX = useSpring(x, springConfig);

  const handleMouseMove = (event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    const targetRect = target.getBoundingClientRect();
    const eventOffsetX = event.clientX - targetRect.left;
    const offsetFromCenter = (eventOffsetX - targetRect.width / 2) / 2;
    x.set(offsetFromCenter);
  };

  return (
    <>
      {isMounted ? (
        <span className="hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageSrc} width={width} height={height} alt="hidden image" />
        </span>
      ) : null}

      <HoverCardPrimitive.Root openDelay={50} closeDelay={100} onOpenChange={setOpen}>
        <HoverCardPrimitive.Trigger
          onMouseMove={handleMouseMove}
          className={cn("text-ink underline decoration-accent/40 decoration-2 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent", className)}
          href={url}
        >
          {children}
        </HoverCardPrimitive.Trigger>

        <HoverCardPrimitive.Portal>
        <HoverCardPrimitive.Content
          className="[transform-origin:var(--radix-hover-card-content-transform-origin)] z-50"
          side="top"
          align="center"
          sideOffset={10}
        >
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.6 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: { type: "spring", stiffness: 260, damping: 20 },
                }}
                exit={{ opacity: 0, y: 20, scale: 0.6 }}
                className="rounded-xl shadow-xl"
                style={{ x: translateX }}
              >
                <a
                  href={url}
                  className="block rounded-xl border-2 border-transparent bg-surface p-1 shadow hover:border-accent/40"
                  style={{ fontSize: 0 }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    width={width}
                    height={height}
                    className="rounded-lg object-cover"
                    style={{ width, height }}
                    alt="Vorschau"
                  />
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </HoverCardPrimitive.Content>
        </HoverCardPrimitive.Portal>
      </HoverCardPrimitive.Root>
    </>
  );
};
